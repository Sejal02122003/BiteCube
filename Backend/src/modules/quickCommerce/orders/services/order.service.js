import crypto from 'crypto';
import mongoose from 'mongoose';
import { QuickCommerceOrder } from '../models/order.model.js';
import { QuickCommerceProduct } from '../../admin/models/product.model.js';
import { QuickCommerceSeller } from '../../seller/models/seller.model.js';
import { QuickCommercePaymentTransaction } from '../models/quickCommercePaymentTransaction.model.js';
import { recordTransaction } from '../../../../core/payments/transaction.service.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../../core/auth/errors.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { sendNotificationToOwner } from '../../../../core/notifications/firebase.service.js';
import { getDrivingDistances } from '../../../../services/googleMaps.service.js';
import { haversineKm } from '../../../food/orders/services/order.helpers.js';
import { calculateRiderEarning } from '../../../food/delivery/services/riderEarning.service.js';
import {
    createRazorpayOrder,
    getRazorpayKeyId,
    initiateRazorpayRefund,
    isRazorpayConfigured,
    verifyPaymentSignature
} from '../../../food/orders/helpers/razorpay.helper.js';

const CANCELLED = ['cancelled_by_user', 'cancelled_by_seller', 'cancelled_by_admin', 'dead'];
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const makeOtp = () => String(crypto.randomInt(1000, 10000));
const makeOrderId = () => `QC${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
const toPaise = (value) => Math.round(Number(value || 0) * 100);
const attachQuickPayment = async (order) => {
    const tx = await QuickCommercePaymentTransaction.findOne({ orderId: order?._id }).lean();
    if (tx?.payment) Object.defineProperty(order, 'payment', { value: tx.payment, writable: true, enumerable: false });
    return tx;
};

export async function calculateQuickDeliveryEarning(seller, deliveryAddress = {}) {
    const [sellerLng, sellerLat] = seller?.location?.coordinates || [];
    const [deliveryLng, deliveryLat] = deliveryAddress?.location?.coordinates || [];
    const hasCoordinates = [sellerLng, sellerLat, deliveryLng, deliveryLat]
        .every((value) => Number.isFinite(Number(value)));

    let distanceKm = null;
    if (hasCoordinates) {
        try {
            const distances = await getDrivingDistances(
                { lat: Number(sellerLat), lng: Number(sellerLng) },
                [{ id: 'delivery', lat: Number(deliveryLat), lng: Number(deliveryLng) }]
            );
            const distanceValue = Number(distances.get('delivery')?.distanceValue);
            if (Number.isFinite(distanceValue) && distanceValue > 0) {
                distanceKm = distanceValue / 1000;
            }
        } catch {
            // Fall back to straight-line distance when the maps service is unavailable.
        }

        if (!(Number(distanceKm) > 0)) {
            const fallbackDistance = haversineKm(
                Number(sellerLat),
                Number(sellerLng),
                Number(deliveryLat),
                Number(deliveryLng)
            );
            distanceKm = Number.isFinite(fallbackDistance) && fallbackDistance > 0
                ? fallbackDistance
                : null;
        }
    }

    return calculateRiderEarning(distanceKm);
}

const normalizeItems = (items) => {
    if (!Array.isArray(items) || !items.length) throw new ValidationError('Cart is empty');
    return items.map((item, index) => {
        const productId = String(item?.productId || item?.itemId || '').trim();
        const variantId = String(item?.variantId || '').trim();
        const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 0));
        if (!mongoose.Types.ObjectId.isValid(productId)) throw new ValidationError(`Invalid product at item ${index + 1}`);
        if (!mongoose.Types.ObjectId.isValid(variantId)) throw new ValidationError(`Select a valid variant for item ${index + 1}`);
        return { productId, variantId, quantity };
    });
};

const resolveCart = async (rawItems) => {
    const requested = normalizeItems(rawItems);
    const productIds = [...new Set(requested.map((item) => item.productId))];
    const products = await QuickCommerceProduct.find({
        _id: { $in: productIds },
        isActive: true,
        isAvailable: true,
        approvalStatus: 'approved'
    }).lean();
    const byId = new Map(products.map((product) => [String(product._id), product]));
    let sellerId = '';
    let subtotal = 0;
    const items = requested.map((requestedItem) => {
        const product = byId.get(requestedItem.productId);
        if (!product) throw new ValidationError('A product in your cart is no longer available');
        const productSellerId = String(product.sellerId || '');
        if (!productSellerId) throw new ValidationError(`${product.name} is not assigned to a seller`);
        if (sellerId && sellerId !== productSellerId) throw new ValidationError('Quick cart can contain products from only one seller');
        sellerId = productSellerId;
        const variant = (product.variants || []).find((entry) => String(entry._id) === requestedItem.variantId);
        if (!variant || variant.isAvailable === false) throw new ValidationError(`${product.name} variant is unavailable`);
        if (Number(variant.stock || 0) < requestedItem.quantity) throw new ValidationError(`Only ${variant.stock || 0} ${product.name} available`);
        const mrp = Number(variant.price || 0);
        const discounted = Number(variant.discountPrice);
        const unitPrice = Number.isFinite(discounted) && discounted >= 0 && discounted < mrp ? discounted : mrp;
        subtotal += unitPrice * requestedItem.quantity;
        return {
            itemId: String(product._id),
            name: product.name,
            variantId: String(variant._id),
            variantName: variant.name,
            variantPrice: unitPrice,
            price: unitPrice,
            quantity: requestedItem.quantity,
            image: variant.image || product.mainImage || product.images?.[0] || ''
        };
    });
    const seller = await QuickCommerceSeller.findOne({
        _id: sellerId,
        status: 'approved',
        isActive: true,
        isAcceptingOrders: true
    }).lean();
    if (!seller) throw new ValidationError('Selected seller is not accepting orders');
    const pricing = {
        subtotal: money(subtotal),
        tax: 0,
        packagingFee: 0,
        deliveryFee: subtotal >= 499 ? 0 : 30,
        platformFee: 5,
        discount: 0
    };
    pricing.total = money(pricing.subtotal + pricing.deliveryFee + pricing.platformFee);
    return { items, seller, pricing, requested };
};

const serialize = (order) => ({
    ...(order?.toObject?.() || order),
    orderType: 'quick'
});

const notifySellerNewOrder = async (orderLike) => {
    const order = orderLike?.sellerId?.storeName
        ? orderLike
        : await QuickCommerceOrder.findById(orderLike?._id || orderLike)
            .populate('sellerId', 'storeName ownerPhone location profileImage addressLine1 area city state')
            .lean();
    if (!order) return;
    const payload = serialize(order);
    payload.orderMongoId = String(order._id);
    const sellerId = order.sellerId?._id || order.sellerId;
    const io = getIO();
    io.to(rooms.quickSeller(sellerId)).emit('new_quick_order', payload);
    io.to(rooms.quickSeller(sellerId)).emit('new_order', payload);
    void sendNotificationToOwner({
        ownerType: 'QUICK_COMMERCE_SELLER',
        ownerId: sellerId,
        payload: {
            title: 'New Quick order',
            body: `${order.items?.length || 0} item${order.items?.length === 1 ? '' : 's'} • Rs ${order.pricing?.total || 0}`,
            sound: 'default',
            dataOnly: true,
            data: {
                type: 'new_quick_order',
                orderType: 'quick',
                orderId: String(order._id),
                orderMongoId: String(order._id),
                displayOrderId: order.order_id,
                targetUrl: '/quick/seller/orders',
                link: '/quick/seller/orders'
            }
        }
    });
};

const releaseStaleOnlineReservations = async () => {
    const staleTransactions = await QuickCommercePaymentTransaction.find({
        paymentMethod: 'razorpay', status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) }
    }).limit(50);
    const staleOrders = await QuickCommerceOrder.find({ _id: { $in: staleTransactions.map((tx) => tx.orderId) }, orderStatus: 'created' });
    for (const order of staleOrders) {
        const claimed = await QuickCommerceOrder.findOneAndUpdate(
            { _id: order._id, orderStatus: 'created' },
            {
                $set: { orderStatus: 'cancelled_by_user', 'dispatch.status': 'cancelled' },
                $push: { statusHistory: { byRole: 'SYSTEM', from: 'created', to: 'cancelled_by_user', note: 'Online payment timed out', at: new Date() } }
            },
            { new: true }
        );
        if (!claimed) continue;
        await Promise.all(claimed.items.map((item) => QuickCommerceProduct.updateOne(
            { _id: item.itemId, 'variants._id': item.variantId },
            { $inc: { 'variants.$.stock': Number(item.quantity || 0) } }
        )));
    }
};

export async function calculateQuickOrder(userId, body = {}) {
    if (!userId) throw new ForbiddenError('Login required');
    const resolved = await resolveCart(body.items);
    return { pricing: resolved.pricing, seller: {
        _id: resolved.seller._id,
        storeName: resolved.seller.storeName,
        location: resolved.seller.location
    }, items: resolved.items };
}

export async function createQuickOrder(userId, body = {}, idempotencyHeader = '') {
    if (!userId) throw new ForbiddenError('Login required');
    await releaseStaleOnlineReservations();
    const idempotencyKey = String(idempotencyHeader || body.idempotencyKey || '').trim();
    if (idempotencyKey) {
        const existing = await QuickCommerceOrder.findOne({ userId, idempotencyKey })
            .populate('sellerId', 'storeName ownerPhone location profileImage').lean();
        if (existing) return { order: serialize(existing), reused: true };
    }
    const address = body.deliveryAddress || {};
    if (!String(address.street || '').trim() || !String(address.city || '').trim() || !String(address.state || '').trim()) {
        throw new ValidationError('Complete delivery address is required');
    }
    const { items, seller, pricing, requested } = await resolveCart(body.items);
    const deducted = [];
    let createdOrderId = null;
    let createdPaymentTransactionId = null;
    try {
        for (const item of requested) {
            const result = await QuickCommerceProduct.updateOne(
                { _id: item.productId, variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity }, isAvailable: { $ne: false } } } },
                { $inc: { 'variants.$.stock': -item.quantity } }
            );
            if (!result.modifiedCount) throw new ValidationError('Stock changed while placing your order. Please review the cart.');
            deducted.push(item);
        }
        const paymentMethod = String(body.paymentMethod || 'cash').toLowerCase() === 'card'
            ? 'razorpay'
            : String(body.paymentMethod || 'cash').toLowerCase();
        if (!['cash', 'razorpay', 'wallet'].includes(paymentMethod)) {
            throw new ValidationError('Select Cash on Delivery, Wallet, or Online Payment');
        }
        const orderId = makeOrderId();
        const earningQuote = await calculateQuickDeliveryEarning(seller, address);
        let razorpayPayload = null;
        const payment = {
            method: paymentMethod,
            status: paymentMethod === 'cash' ? 'cod_pending' : 'created',
            amountDue: pricing.total,
            razorpay: {}
        };
        if (paymentMethod === 'razorpay') {
            if (!isRazorpayConfigured()) throw new ValidationError('Online payment is currently unavailable');
            const amountPaise = Math.round(Number(pricing.total || 0) * 100);
            if (amountPaise < 100) throw new ValidationError('Amount too low for online payment');
            const razorpayOrder = await createRazorpayOrder(amountPaise, 'INR', orderId);
            payment.razorpay.orderId = razorpayOrder.id;
            razorpayPayload = {
                key: getRazorpayKeyId(),
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency || 'INR'
            };
        }
        const order = await QuickCommerceOrder.create({
            order_id: orderId,
            orderId,
            orderType: 'quick',
            idempotencyKey: idempotencyKey || undefined,
            userId,
            sellerId: seller._id,
            zoneId: seller.zoneId,
            items,
            deliveryAddress: address,
            customerName: String(body.customerName || address.fullName || address.name || '').trim(),
            customerPhone: String(body.customerPhone || address.phone || '').trim(),
            pricing,
            orderStatus: 'created',
            deliveryDistanceKm: earningQuote.distanceKm,
            riderEarning: earningQuote.totalEarning,
            deliveryBonusAmount: earningQuote.bonusAmount,
            riderEarningCalculatedAt: new Date(),
            pickupOtp: makeOtp(),
            deliveryOtp: makeOtp(),
            statusHistory: [{ byRole: 'USER', byId: userId, from: '', to: 'created', note: 'Quick order placed' }]
        });
        createdOrderId = order._id;
        const transaction = await QuickCommercePaymentTransaction.create({
            orderId: order._id, userId, sellerId: seller._id,
            paymentMethod, status: paymentMethod === 'cash' ? 'pending' : 'pending',
            payment: { method: paymentMethod, status: payment.status, amountDuePaise: toPaise(pricing.total), razorpay: payment.razorpay },
            amounts: { totalCustomerPaidPaise: toPaise(pricing.total), sellerSharePaise: toPaise(pricing.total), riderSharePaise: toPaise(earningQuote.totalEarning), platformNetProfitPaise: toPaise(pricing.platformFee), taxAmountPaise: toPaise(pricing.tax) },
            gateway: { razorpayOrderId: payment.razorpay?.orderId || '' },
            history: [{ kind: 'created', amountPaise: toPaise(pricing.total), note: 'Quick order payment transaction created' }]
        });
        createdPaymentTransactionId = transaction._id;
        if (paymentMethod === 'wallet') {
            transaction.status = 'captured';
            transaction.payment.status = 'paid';
            transaction.payment.amountDuePaise = 0;
            await recordTransaction({
                entityType: 'user', entityId: String(userId), type: 'debit', amount: Number(pricing.total),
                description: `Quick order wallet payment #${order.order_id}`,
                category: 'order_payment', orderId: String(order._id),
                referenceKey: `quick-order-wallet:${order._id}`,
                metadata: { module: 'quickCommerce', source: 'quick_order_wallet' }
            });
            transaction.history.push({ kind: 'captured', amountPaise: transaction.amounts.totalCustomerPaidPaise, note: 'Paid from shared user wallet' });
            await transaction.save();
        }
        await QuickCommerceOrder.updateOne({ _id: order._id }, { $set: { transactionId: transaction._id } });
        const populated = await QuickCommerceOrder.findById(order._id)
            .populate('sellerId', 'storeName ownerPhone location profileImage addressLine1 area city state')
            .lean();
        const payload = serialize(populated);
        payload.payment = payment;
        if (['cash', 'wallet'].includes(paymentMethod)) await notifySellerNewOrder(populated);
        return { order: payload, razorpay: razorpayPayload, reused: false };
    } catch (error) {
        if (createdPaymentTransactionId) await QuickCommercePaymentTransaction.deleteOne({ _id: createdPaymentTransactionId });
        if (createdOrderId) await QuickCommerceOrder.deleteOne({ _id: createdOrderId });
        await Promise.all(deducted.map((item) => QuickCommerceProduct.updateOne(
            { _id: item.productId, 'variants._id': item.variantId },
            { $inc: { 'variants.$.stock': item.quantity } }
        )));
        if (error?.code === 11000 && idempotencyKey) {
            const existing = await QuickCommerceOrder.findOne({ userId, idempotencyKey }).lean();
            if (existing) return { order: serialize(existing), reused: true };
        }
        throw error;
    }
}

export async function verifyQuickPayment(userId, body = {}) {
    const orderId = String(body.orderId || '').trim();
    if (!orderId) throw new ValidationError('Order id is required');
    const order = await QuickCommerceOrder.findOne({
        userId,
        ...(mongoose.Types.ObjectId.isValid(orderId)
            ? { $or: [{ _id: orderId }, { order_id: orderId }, { orderId }] }
            : { $or: [{ order_id: orderId }, { orderId }] })
    });
    if (!order) throw new NotFoundError('Quick order not found');
    const transaction = await attachQuickPayment(order);
    const payment = transaction?.payment;
    if (payment?.method !== 'razorpay') throw new ValidationError('This is not an online-payment order');
    if (payment.status === 'paid') return { order: serialize(order), payment };
    if (String(payment.razorpay?.orderId || '') !== String(body.razorpayOrderId || '')) {
        throw new ValidationError('Payment order does not match');
    }
    if (!verifyPaymentSignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature)) {
        throw new ValidationError('Payment verification failed');
    }

    transaction.status = 'captured';
    transaction.payment.status = 'paid';
    transaction.payment.razorpay.paymentId = String(body.razorpayPaymentId || '');
    transaction.payment.razorpay.signature = String(body.razorpaySignature || '');
    transaction.gateway.razorpayPaymentId = transaction.payment.razorpay.paymentId;
    transaction.gateway.razorpaySignature = transaction.payment.razorpay.signature;
    transaction.history.push({ kind: 'captured', amountPaise: transaction.amounts.totalCustomerPaidPaise, note: 'Quick payment verified' });
    await transaction.save();
    order.statusHistory.push({ byRole: 'USER', byId: userId, from: order.orderStatus, to: order.orderStatus, note: 'Online payment verified' });
    await order.save();

    const populated = await QuickCommerceOrder.findById(order._id)
        .populate('sellerId', 'storeName ownerPhone location profileImage addressLine1 area city state')
        .lean();
    await notifySellerNewOrder(populated);
    const payload = serialize(populated);
    payload.payment = transaction.payment;
    getIO().to(rooms.user(userId)).emit('order_status_update', payload);
    void sendNotificationToOwner({
        ownerType: 'USER',
        ownerId: userId,
        payload: {
            title: 'Payment successful',
            body: `Your Quick order #${order.order_id} is confirmed`,
            data: { type: 'payment_success', orderType: 'quick', orderId: String(order._id) }
        }
    });
    return { order: payload, payment: transaction.payment };
}

export async function listQuickOrders(userId, query = {}) {
    await releaseStaleOnlineReservations();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const filter = { userId };
    const [orders, total] = await Promise.all([
        QuickCommerceOrder.find(filter).populate('sellerId', 'storeName location profileImage').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        QuickCommerceOrder.countDocuments(filter)
    ]);
    const transactions = await QuickCommercePaymentTransaction.find({ orderId: { $in: orders.map((order) => order._id) } }).lean();
    const payments = new Map(transactions.map((tx) => [String(tx.orderId), tx.payment]));
    return { orders: orders.map((order) => ({ ...serialize(order), payment: payments.get(String(order._id)) || undefined })), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function getQuickOrder(userId, orderId) {
    const identity = mongoose.Types.ObjectId.isValid(orderId)
        ? { $or: [{ _id: orderId }, { order_id: orderId }, { orderId }] }
        : { $or: [{ order_id: orderId }, { orderId }] };
    const order = await QuickCommerceOrder.findOne({ userId, ...identity }).select('+deliveryOtp')
        .populate('sellerId', 'storeName ownerPhone location profileImage addressLine1 area city state')
        .populate('dispatch.deliveryPartnerId', 'name phone profilePhoto currentLocation').lean();
    if (!order) throw new NotFoundError('Quick order not found');
    const transaction = await attachQuickPayment(order);
    const result = serialize(order);
    result.payment = (await QuickCommercePaymentTransaction.findOne({ orderId: order._id }).lean())?.payment;
    if (['reached_drop'].includes(result.orderStatus) && result.deliveryOtp) result.handoverOtp = result.deliveryOtp;
    delete result.deliveryOtp;
    delete result.pickupOtp;
    return result;
}

export async function cancelQuickOrder(userId, orderId, reason = '') {
    const order = await QuickCommerceOrder.findOne({
        userId,
        $or: mongoose.Types.ObjectId.isValid(orderId) ? [{ _id: orderId }, { order_id: orderId }, { orderId }] : [{ order_id: orderId }, { orderId }]
    });
    if (!order) throw new NotFoundError('Quick order not found');
    if (!['created', 'confirmed', 'packing'].includes(order.orderStatus)) throw new ValidationError('This Quick order can no longer be cancelled');
    for (const item of order.items) {
        await QuickCommerceProduct.updateOne(
            { _id: item.itemId, 'variants._id': item.variantId },
            { $inc: { 'variants.$.stock': item.quantity } }
        );
    }
    const previous = order.orderStatus;
    order.orderStatus = 'cancelled_by_user';
    order.dispatch.status = 'cancelled';
    if (transaction?.payment?.method === 'razorpay' && transaction?.payment?.status === 'paid' && transaction?.payment?.razorpay?.paymentId) {
        transaction.payment.refund = { status: 'pending', destination: 'source', amountPaise: toPaise(order.pricing?.total) };
        const refund = await initiateRazorpayRefund(transaction.payment.razorpay.paymentId, order.pricing?.total || 0);
        transaction.payment.refund.status = refund.success ? 'processed' : 'failed';
        transaction.payment.refund.refundId = refund.refundId || '';
        if (refund.success) {
            transaction.status = 'refunded';
            transaction.payment.status = 'refunded';
            transaction.payment.refund.processedAt = new Date();
        }
        await transaction.save();
    } else if (transaction?.payment?.method === 'razorpay' && transaction?.payment?.status === 'created') {
        transaction.status = 'failed';
        transaction.payment.status = 'failed';
        await transaction.save();
    }
    order.statusHistory.push({ byRole: 'USER', byId: userId, from: previous, to: order.orderStatus, note: String(reason || '') });
    await order.save();
    const payload = serialize(order);
    const io = getIO();
    io.to(rooms.quickSeller(order.sellerId)).emit('order_status_update', payload);
    if (order.dispatch?.deliveryPartnerId) io.to(rooms.delivery(order.dispatch.deliveryPartnerId)).emit('order_cancelled', payload);
    io.to(rooms.user(userId)).emit('order_status_update', payload);
    return payload;
}
