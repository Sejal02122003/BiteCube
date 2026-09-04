import mongoose from 'mongoose';
import { FoodOrder } from '../../modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../../modules/food/orders/models/foodTransaction.model.js';
import { FoodUserWallet } from '../../modules/food/user/models/userWallet.model.js';
import * as foodTransactionService from '../../modules/food/orders/services/foodTransaction.service.js';
import { ProcessedWebhookEvent } from './models/processedWebhookEvent.model.js';
import { recordTransaction } from './transaction.service.js';

const toPaise = (amount) => Math.round((Number(amount) || 0) * 100);

function appendHistory(transaction, kind, note, recordedBy = {}) {
    transaction.history.push({
        kind,
        amount: transaction.amounts.totalCustomerPaid,
        at: new Date(),
        note,
        recordedBy: { role: recordedBy.role || 'SYSTEM', id: recordedBy.id || undefined },
    });
}

async function withMongoTransaction(work) {
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
}

async function findOrderAndTransactionByRazorpayOrderId(razorpayOrderId, session) {
    const transaction = await FoodTransaction.findOne({
        $or: [
            { 'gateway.razorpayOrderId': razorpayOrderId },
            { 'payment.razorpay.orderId': razorpayOrderId },
        ],
    }).session(session);
    if (!transaction) throw new Error(`Food transaction not found for Razorpay order ${razorpayOrderId}`);

    const order = await FoodOrder.findById(transaction.orderId).session(session);
    if (!order) throw new Error(`Food order not found for transaction ${transaction._id}`);
    return { order, transaction };
}

async function captureInSession({ razorpayOrderId, razorpayPaymentId, razorpayAmountPaise, razorpaySignature = '', expectedOrderId, recordedBy, note, session }) {
    if (!razorpayOrderId || !razorpayPaymentId) throw new Error('Razorpay order and payment ids are required');
    const { order, transaction } = await findOrderAndTransactionByRazorpayOrderId(razorpayOrderId, session);
    if (expectedOrderId && String(order._id) !== String(expectedOrderId)) {
        throw new Error('Razorpay order does not belong to the requested food order');
    }
    const expectedAmountPaise = transaction.amounts.totalCustomerPaidPaise || toPaise(transaction.amounts.totalCustomerPaid);
    if (razorpayAmountPaise != null && Number(razorpayAmountPaise) !== expectedAmountPaise) {
        throw new Error(`Payment amount mismatch for order ${order._id}`);
    }
    const existingPaymentId = transaction.gateway?.razorpayPaymentId || transaction.payment?.razorpay?.paymentId;
    if (existingPaymentId && existingPaymentId !== razorpayPaymentId) throw new Error(`Payment conflict for order ${order._id}`);

    const alreadyCaptured = transaction.status === 'captured' && transaction.payment?.status === 'paid';
    transaction.status = 'captured';
    transaction.paymentMethod = 'razorpay';
    transaction.payment.method = 'razorpay';
    transaction.payment.status = 'paid';
    transaction.payment.razorpay.orderId = razorpayOrderId;
    transaction.payment.razorpay.paymentId = razorpayPaymentId;
    if (razorpaySignature) transaction.payment.razorpay.signature = razorpaySignature;
    transaction.gateway.razorpayOrderId = razorpayOrderId;
    transaction.gateway.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) transaction.gateway.razorpaySignature = razorpaySignature;
    if (!alreadyCaptured) appendHistory(transaction, 'captured', note, recordedBy);
    await transaction.save({ session });

    if (recordedBy?.role === 'USER' && !alreadyCaptured) {
        order.statusHistory.push({
            byRole: 'USER',
            byId: recordedBy.id,
            from: order.orderStatus,
            to: 'created',
            note: 'Payment verified',
        });
    }
    return { order: order.toObject(), transaction: transaction.toObject(), alreadyCaptured };
}

async function refundInSession({ razorpayPaymentId, razorpayRefundId, amount, session }) {
    if (!razorpayPaymentId || !razorpayRefundId) throw new Error('Razorpay payment and refund ids are required');
    const transaction = await FoodTransaction.findOne({
        $or: [{ 'gateway.razorpayPaymentId': razorpayPaymentId }, { 'payment.razorpay.paymentId': razorpayPaymentId }],
    }).session(session);
    if (!transaction) throw new Error(`Food transaction not found for Razorpay payment ${razorpayPaymentId}`);
    const order = await FoodOrder.findById(transaction.orderId).session(session);
    if (!order) throw new Error(`Food order not found for transaction ${transaction._id}`);

    const alreadyProcessed = transaction.payment?.refund?.refundId === razorpayRefundId;
    const refund = { status: 'processed', destination: 'source', amount, refundId: razorpayRefundId, processedAt: new Date() };
    transaction.status = 'refunded';
    transaction.payment.status = 'refunded';
    transaction.payment.refund = refund;
    if (!alreadyProcessed) appendHistory(transaction, 'refunded', 'Razorpay refund processed');
    await transaction.save({ session });
    return { order: order.toObject(), transaction: transaction.toObject(), alreadyProcessed };
}

async function findOrderAndTransactionByOrderId(orderId, session) {
    const transaction = await FoodTransaction.findOne({ orderId }).session(session);
    if (!transaction) throw new Error(`Food transaction not found for order ${orderId}`);
    const order = await FoodOrder.findById(transaction.orderId).session(session);
    if (!order) throw new Error(`Food order not found for transaction ${transaction._id}`);
    return { order, transaction };
}

async function walletRefundInSession({ orderId, amount, reason = 'Order refund', session }) {
    const { order, transaction } = await findOrderAndTransactionByOrderId(orderId, session);
    if (transaction.payment?.refund?.status === 'processed') {
        return { order: order.toObject(), transaction: transaction.toObject(), alreadyProcessed: true };
    }
    if (transaction.payment?.status !== 'paid') throw new Error('Only paid food orders can be refunded');

    const refundAmount = Number(amount ?? transaction.amounts.totalCustomerPaid);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) throw new Error('Refund amount must be positive');

    await recordTransaction({
        entityType: 'user', entityId: String(order.userId), type: 'credit', amount: refundAmount,
        description: reason, category: 'order_refund', orderId: String(order._id),
        referenceKey: `food-refund:${order._id}:${toPaise(refundAmount)}`,
        metadata: { source: 'food_finance_refund', orderId: String(order._id) }, session
    });

    const refund = {
        status: 'processed', destination: 'wallet', amount: refundAmount,
        refundId: '', processedAt: new Date(),
    };
    transaction.status = 'refunded';
    transaction.payment.status = 'refunded';
    transaction.payment.refund = refund;
    appendHistory(transaction, 'refunded', 'Refund credited to customer wallet');
    await transaction.save({ session });
    return { order: order.toObject(), transaction: transaction.toObject(), alreadyProcessed: false };
}

/** Capture a food payment and its legacy read snapshot together. */
export async function captureFoodRazorpayPayment(input) {
    return withMongoTransaction((session) => captureInSession({
        ...input,
        session,
        recordedBy: input.recordedBy || { role: 'SYSTEM' },
        note: input.note || 'Razorpay payment captured',
    }));
}

/** Reflect a confirmed gateway refund in both ledger and legacy snapshot. */
export async function markFoodRazorpayRefundProcessed(input) {
    return withMongoTransaction((session) => refundInSession({ ...input, session }));
}

/** Credit a food-order refund to the customer wallet with its ledger update. */
export async function refundFoodPaymentToWallet(input) {
    return withMongoTransaction((session) => walletRefundInSession({ ...input, session }));
}

/** Keep failed gateway refund attempts visible without changing paid funds to refunded. */
export async function markFoodRefundFailed({ orderId, destination = 'source', amount }) {
    return withMongoTransaction(async (session) => {
        const { order, transaction } = await findOrderAndTransactionByOrderId(orderId, session);
        if (transaction.payment?.refund?.status === 'processed') {
            return { order: order.toObject(), transaction: transaction.toObject(), alreadyProcessed: true };
        }
        const refund = { status: 'failed', destination, amount: Number(amount || 0), refundId: '', processedAt: null };
        transaction.payment.refund = refund;
        appendHistory(transaction, 'refund_failed', 'Gateway refund attempt failed');
        await transaction.save({ session });
        return { order: order.toObject(), transaction: transaction.toObject(), alreadyProcessed: false };
    });
}

/**
 * Persist a new food order, its wallet debit (when selected), and its ledger
 * row as one unit. Gateway order creation stays outside this transaction.
 */
export async function createFoodOrderWithFinancialRecord({ order, payment, chargeWallet = false, walletDescription = '' }) {
    return withMongoTransaction(async (session) => {
        await order.save({ session });

        if (chargeWallet) {
            const amount = Number(order.pricing?.total || 0);
            if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid wallet payment amount');

            await recordTransaction({
                entityType: 'user', entityId: String(order.userId), type: 'debit', amount,
                description: walletDescription || `Payment for order #${order.order_id || order._id}`,
                category: 'order_payment', orderId: String(order._id),
                referenceKey: `food-order-wallet:${order._id}`,
                metadata: { source: 'food_finance_payment', orderId: String(order._id) }, session
            });
        }

        const transaction = await foodTransactionService.createInitialTransaction(order, { session, payment });
        return { order: order.toObject(), transaction: transaction.toObject() };
    });
}

/** Process each verified Razorpay delivery at most once. */
export async function processRazorpayWebhook({ eventId, eventType, payloadHash, payload }) {
    const existing = await ProcessedWebhookEvent.findOne({ provider: 'razorpay', eventId }).lean();
    if (existing) return { duplicate: true, handled: true };

    try {
        return await withMongoTransaction(async (session) => {
            await ProcessedWebhookEvent.create([{
                provider: 'razorpay', eventId, eventType, payloadHash,
            }], { session });

            if (eventType === 'payment.captured') {
                const payment = payload?.payment?.entity;
                await captureInSession({
                    razorpayOrderId: payment?.order_id,
                    razorpayPaymentId: payment?.id,
                    razorpayAmountPaise: payment?.amount,
                    note: 'Payment captured via Razorpay webhook',
                    recordedBy: { role: 'SYSTEM' },
                    session,
                });
            } else if (eventType === 'refund.processed') {
                const refund = payload?.refund?.entity;
                await refundInSession({
                    razorpayPaymentId: refund?.payment_id,
                    razorpayRefundId: refund?.id,
                    amount: Number(refund?.amount || 0) / 100,
                    session,
                });
            }
            return { duplicate: false, handled: ['payment.captured', 'refund.processed'].includes(eventType) };
        });
    } catch (error) {
        if (error?.code === 11000) return { duplicate: true, handled: true };
        throw error;
    }
}
