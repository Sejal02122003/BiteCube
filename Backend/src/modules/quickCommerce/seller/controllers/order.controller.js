import { sendResponse } from '../../../../utils/response.js';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';

const buildSellerOrderQuery = (req) => {
    const { status, search } = req.query || {};
    const sellerId = req.user?.userId;
    const query = {
        sellerId
    };

    const statusMap = {
        new: ['created', 'confirmed'],
        preparing: ['preparing'],
        ready: ['ready_for_pickup', 'reached_pickup'],
        out_for_delivery: ['picked_up', 'reached_drop'],
        completed: ['delivered'],
        cancelled: ['cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'],
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

const formatOrderListItem = (order) => ({
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
});

export async function listSellerOrdersController(req, res, next) {
    try {
        const { page = 1, limit = 30, sort = '-createdAt' } = req.query;
        const query = buildSellerOrderQuery(req);
        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            QuickCommerceOrder.find(query)
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
        const sellerId = req.user?.userId;

        if (!orderStatus) {
            return sendResponse(res, 400, 'Order status is required');
        }

        const order = await QuickCommerceOrder.findOne({
            sellerId,
            $or: [{ _id: orderId }, { order_id: orderId }, { orderId }]
        });

        if (!order) {
            return sendResponse(res, 404, 'Order not found');
        }

        order.statusHistory.push({
            at: new Date(),
            byRole: 'RESTAURANT',
            byId: req.user?.userId,
            from: order.orderStatus,
            to: orderStatus,
            note: note || ''
        });

        order.orderStatus = orderStatus;
        await order.save();

        return sendResponse(res, 200, 'Seller order status updated', formatOrderListItem(order.toObject()));
    } catch (err) {
        next(err);
    }
}
