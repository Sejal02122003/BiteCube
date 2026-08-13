import { sendResponse } from '../../../../utils/response.js';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';
import { offerQuickOrderToDelivery } from '../../orders/services/quickDelivery.service.js';

export async function listOrdersAdminController(req, res, next) {
    try {
        const { status, page = 1, limit = 50, sort = '-createdAt', search } = req.query;
        const query = {};

        if (status && status !== 'all') {
            const statusMap = {
                pending: ['created', 'confirmed'],
                accepted: ['packing'],
                processing: ['packing', 'ready_for_pickup', 'reached_pickup'],
                'food-on-the-way': ['picked_up', 'reached_drop'],
                delivered: ['delivered'],
                canceled: ['cancelled_by_user', 'cancelled_by_seller', 'cancelled_by_admin', 'dead'],
                'restaurant-cancelled': ['cancelled_by_seller']
            };
            query.orderStatus = statusMap[status] ? { $in: statusMap[status] } : status;
        }

        if (search) {
            query.$or = [
                { order_id: { $regex: search, $options: 'i' } },
                { 'deliveryAddress.name': { $regex: search, $options: 'i' } },
                { 'deliveryAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            QuickCommerceOrder.find(query)
                .populate('sellerId', 'storeName ownerName ownerPhone location')
                .populate('userId', 'name phone email')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            QuickCommerceOrder.countDocuments(query)
        ]);

        return sendResponse(res, 200, 'Orders fetched', { orders, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        next(err);
    }
}

export async function getOrderByIdAdminController(req, res, next) {
    try {
        const { orderId } = req.params;
        const order = await QuickCommerceOrder.findOne({ $or: [{ _id: orderId }, { order_id: orderId }] })
            .populate('userId', 'name email phone')
            .populate('sellerId', 'storeName ownerName ownerPhone location addressLine1 area city state')
            .populate('dispatch.deliveryPartnerId', 'name phone profilePhoto')
            .lean();

        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        return sendResponse(res, 200, 'Order fetched', order);
    } catch (err) {
        next(err);
    }
}

export async function updateOrderStatusAdminController(req, res, next) {
    try {
        const { orderId } = req.params;
        const { orderStatus, note } = req.body;
        
        if (!orderStatus) {
            return sendResponse(res, 400, 'Order status is required');
        }

        const order = await QuickCommerceOrder.findOne({ $or: [{ _id: orderId }, { order_id: orderId }] });
        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        order.statusHistory.push({
            at: new Date(),
            byRole: 'ADMIN',
            byId: req.user?.userId,
            from: order.orderStatus,
            to: orderStatus,
            note: note || ''
        });

        order.orderStatus = orderStatus;
        await order.save();

        return sendResponse(res, 200, 'Order status updated', order);
    } catch (err) {
        next(err);
    }
}

export async function deleteOrderAdminController(req, res, next) {
    try {
        const { orderId } = req.params;
        const order = await QuickCommerceOrder.findOneAndDelete({ $or: [{ _id: orderId }, { order_id: orderId }] });
        
        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        return sendResponse(res, 200, 'Order deleted successfully');
    } catch (err) {
        next(err);
    }
}

export async function assignDeliveryPartnerController(req, res, next) {
    try {
        const { orderId } = req.params;
        const { partnerId } = req.body;
        
        const order = await QuickCommerceOrder.findOne({ $or: [{ _id: orderId }, { order_id: orderId }] });
        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        order.dispatch.deliveryPartnerId = partnerId;
        order.dispatch.status = 'assigned';
        order.dispatch.assignedAt = new Date();
        
        await order.save();
        return sendResponse(res, 200, 'Delivery partner assigned', order);
    } catch (err) {
        next(err);
    }
}

export async function resendDeliveryNotificationAdminController(req, res, next) {
    try {
        const result = await offerQuickOrderToDelivery(req.params.orderId);
        return sendResponse(res, 200, 'Quick delivery notification resent', result);
    } catch (err) {
        next(err);
    }
}
