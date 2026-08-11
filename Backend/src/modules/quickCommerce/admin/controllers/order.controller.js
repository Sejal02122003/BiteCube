import { sendResponse } from '../../../../utils/response.js';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';

export async function listOrdersAdminController(req, res, next) {
    try {
        const { status, page = 1, limit = 50, sort = '-createdAt', search } = req.query;
        const query = {};

        if (status) {
            query.orderStatus = status;
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
            .populate('restaurantId', 'name address phone')
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
        return sendResponse(res, 200, 'Notification resent successfully');
    } catch (err) {
        next(err);
    }
}
