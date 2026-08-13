import { sendResponse } from '../../../../utils/response.js';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';
import { QuickCommerceProduct } from '../../admin/models/product.model.js';
import { offerQuickOrderToDelivery, resendQuickOrderToDelivery } from '../../orders/services/quickDelivery.service.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { sendNotificationToOwner } from '../../../../core/notifications/firebase.service.js';
import { initiateRazorpayRefund } from '../../../food/orders/helpers/razorpay.helper.js';

const buildSellerOrderQuery = (req) => {
    const { status, search } = req.query || {};
    const sellerId = req.user?.userId;
    const query = {
        sellerId,
        $nor: [{ 'payment.method': 'razorpay', 'payment.status': { $in: ['created', 'failed'] } }]
    };

    const statusMap = {
        new: ['created', 'confirmed'],
        packing: ['packing', 'preparing'],
        ready: ['ready_for_pickup', 'reached_pickup'],
        out_for_delivery: ['picked_up', 'reached_drop'],
        completed: ['delivered'],
        cancelled: ['cancelled_by_user', 'cancelled_by_seller', 'cancelled_by_restaurant', 'cancelled_by_admin'],
        dead: ['dead']
    };

    if (status && status !== 'all') {
        const normalizedStatus = String(status).trim().toLowerCase();
        if (statusMap[normalizedStatus]) {
            query.orderStatus = { $in: statusMap[normalizedStatus] };
        } else {
            query.orderStatus = normalizedStatus;
        }
    }

    if (search) {
        query.$or = [
            { order_id: { $regex: search, $options: 'i' } },
            { orderId: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { customerPhone: { $regex: search, $options: 'i' } },
            { 'deliveryAddress.name': { $regex: search, $options: 'i' } },
            { 'deliveryAddress.fullName': { $regex: search, $options: 'i' } },
            { 'deliveryAddress.phone': { $regex: search, $options: 'i' } }
        ];
    }

    return query;
};

const formatOrderListItem = (order) => {
    const result = {
        ...order,
        status: order.orderStatus,
        total: order.pricing?.total ?? 0,
        paymentMethod: order.payment?.method || null,
        customer: {
            name:
                order.customerName ||
                order.deliveryAddress?.fullName ||
                order.deliveryAddress?.name ||
                order.userId?.name ||
                'Customer',
            phone:
                order.customerPhone ||
                order.deliveryAddress?.phone ||
                order.userId?.phone ||
                ''
        }
    };
    const otpRequested = Boolean(order.deliveryVerification?.pickupOtp?.requestedAt);
    const otpVerified = Boolean(order.deliveryVerification?.pickupOtp?.verified);
    if (!otpRequested || otpVerified) delete result.pickupOtp;
    return result;
};

export async function listSellerOrdersController(req, res, next) {
    try {
        const { page = 1, limit = 30, sort = '-createdAt' } = req.query;
        const query = buildSellerOrderQuery(req);
        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            QuickCommerceOrder.find(query)
                .select('+pickupOtp')
                .populate('userId', 'name phone')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            QuickCommerceOrder.countDocuments(query)
        ]);

        const totalPages = Math.max(1, Math.ceil(total / Number(limit)));

        return sendResponse(res, 200, 'Seller orders fetched', {
            orders: orders.map(formatOrderListItem),
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages
            }
        });
    } catch (err) {
        next(err);
    }
}

export async function getSellerOrderByIdController(req, res, next) {
    try {
        const { orderId } = req.params;
        const sellerId = req.user?.userId;

        const order = await QuickCommerceOrder.findOne({
            sellerId,
            $or: [{ _id: orderId }, { order_id: orderId }, { orderId }]
        })
            .select('+pickupOtp')
            .populate('userId', 'name email phone')
            .lean();

        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        return sendResponse(res, 200, 'Seller order fetched', formatOrderListItem(order));
    } catch (err) {
        next(err);
    }
}

export async function updateSellerOrderStatusController(req, res, next) {
    try {
        const { orderId } = req.params;
        const { orderStatus, note } = req.body || {};
        const nextStatus = String(orderStatus || '').trim().toLowerCase();
        const sellerId = req.user?.userId;

        if (!nextStatus) {
            return sendResponse(res, 400, 'Order status is required');
        }

        const order = await QuickCommerceOrder.findOne({
            sellerId,
            $or: [{ _id: orderId }, { order_id: orderId }, { orderId }]
        });

        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        const allowedTransitions = {
            created: ['packing', 'cancelled_by_seller'],
            confirmed: ['packing', 'cancelled_by_seller'],
            packing: ['ready_for_pickup', 'cancelled_by_seller'],
            // Allow old in-flight Quick orders to finish using the new lifecycle.
            preparing: ['ready_for_pickup', 'cancelled_by_seller']
        };
        const allowedNextStatuses = allowedTransitions[order.orderStatus] || [];
        if (!allowedNextStatuses.includes(nextStatus)) {
            return sendResponse(
                res,
                400,
                `Cannot change Quick order from ${order.orderStatus} to ${nextStatus}`
            );
        }

        order.statusHistory.push({
            at: new Date(),
            byRole: 'SELLER',
            byId: req.user?.userId,
            from: order.orderStatus,
            to: nextStatus,
            note: note || ''
        });

        order.orderStatus = nextStatus;
        if (nextStatus === 'cancelled_by_seller') {
            order.dispatch.status = 'cancelled';
            await Promise.all(order.items.map((item) => QuickCommerceProduct.updateOne(
                { _id: item.itemId, 'variants._id': item.variantId },
                { $inc: { 'variants.$.stock': Number(item.quantity || 0) } }
            )));
            if (order.payment?.method === 'razorpay' && order.payment?.status === 'paid' && order.payment?.razorpay?.paymentId) {
                order.payment.refund = { status: 'pending', destination: 'source', amount: Number(order.pricing?.total || 0) };
                const refund = await initiateRazorpayRefund(order.payment.razorpay.paymentId, order.pricing?.total || 0);
                order.payment.refund.status = refund.success ? 'processed' : 'failed';
                order.payment.refund.refundId = refund.refundId || '';
                if (refund.success) {
                    order.payment.status = 'refunded';
                    order.payment.refund.processedAt = new Date();
                }
            }
        }
        await order.save();

        const payload = formatOrderListItem(order.toObject());
        const io = getIO();
        io.to(rooms.user(order.userId)).emit('order_status_update', { ...payload, orderType: 'quick' });
        io.to(rooms.tracking(order._id)).emit('order_status_update', { ...payload, orderType: 'quick' });
        if (order.dispatch?.deliveryPartnerId) {
            io.to(rooms.delivery(order.dispatch.deliveryPartnerId)).emit(
                nextStatus === 'cancelled_by_seller' ? 'order_cancelled' : 'order_status_update',
                { ...payload, orderType: 'quick' }
            );
        }
        void sendNotificationToOwner({
            ownerType: 'USER', ownerId: order.userId,
            payload: {
                title: nextStatus === 'packing' ? 'Quick order accepted' : nextStatus === 'ready_for_pickup' ? 'Quick order packed' : 'Quick order update',
                body: nextStatus === 'packing' ? 'The seller is packing your products.' : nextStatus === 'ready_for_pickup' ? 'Your products are ready for rider pickup.' : 'The seller cancelled your Quick order.',
                data: { type: 'order_status_update', orderType: 'quick', orderId: String(order._id), orderStatus: nextStatus }
            }
        });
        if (['packing', 'ready_for_pickup'].includes(nextStatus)) {
            void offerQuickOrderToDelivery(order._id);
        }

        return sendResponse(res, 200, 'Seller order status updated', payload);
    } catch (err) {
        next(err);
    }
}

export async function resendDeliveryNotificationSellerController(req, res, next) {
    try {
        const result = await resendQuickOrderToDelivery(req.params.orderId, req.user?.userId);
        return sendResponse(res, 200, 'Quick delivery notification resent', result);
    } catch (err) {
        next(err);
    }
}
