import mongoose from 'mongoose';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';
import { QuickCommerceSeller } from '../../seller/models/seller.model.js';
import { QuickCommerceProduct } from '../models/product.model.js';

const CANCELLED_ORDER_STATUSES = [
    'cancelled_by_user',
    'cancelled_by_seller',
    'cancelled_by_restaurant',
    'cancelled_by_admin',
    'dead'
];

const PENDING_ORDER_STATUSES = ['created', 'confirmed'];
const PROCESSING_ORDER_STATUSES = [
    'packing',
    'preparing',
    'ready_for_pickup',
    'reached_pickup',
    'picked_up',
    'reached_drop'
];

function getDateRangeByPeriod(period = 'overall') {
    const now = new Date();
    const value = String(period || 'overall').toLowerCase();

    if (value === 'today') {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        };
    }

    if (value === 'week') {
        const start = new Date(now);
        const day = start.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        start.setDate(start.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
    }

    if (value === 'month') {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
            end: now
        };
    }

    if (value === 'year') {
        return {
            start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
            end: now
        };
    }

    return null;
}

export async function getQuickDashboardStatsService(query = {}) {
    const periodRange = getDateRangeByPeriod(query.period);
    const zoneId = query.zoneId && mongoose.Types.ObjectId.isValid(query.zoneId)
        ? new mongoose.Types.ObjectId(query.zoneId)
        : null;

    const orderMatch = {};
    if (periodRange) {
        orderMatch.createdAt = { $gte: periodRange.start, $lte: periodRange.end };
    }
    if (zoneId) {
        orderMatch.zoneId = zoneId;
    }

    const sellerMatch = {};
    if (zoneId) {
        sellerMatch.zoneId = zoneId;
    }

    const [orderTotalsAgg, monthlyAgg, sellersTotal, sellersPending, productsTotal, recentPendingOrders, recentDeliveredOrders, recentSellers] = await Promise.all([
        QuickCommerceOrder.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
                    cancelled: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', CANCELLED_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', PENDING_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    processing: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', PROCESSING_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    revenueTotal: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.total', 0] }, 0]
                        }
                    },
                    commissionTotal: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.restaurantCommission', 0] }, 0]
                        }
                    },
                    platformFeeTotal: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.platformFee', 0] }, 0]
                        }
                    },
                    deliveryFeeTotal: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.deliveryFee', 0] }, 0]
                        }
                    },
                    gstTotal: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.tax', 0] }, 0]
                        }
                    },
                    adminNetProfit: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$platformProfit', 0] }, 0]
                        }
                    }
                }
            }
        ]),
        QuickCommerceOrder.aggregate([
            {
                $match: {
                    ...(zoneId ? { zoneId } : {}),
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
                        $lte: new Date()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.total', 0] }, 0]
                        }
                    },
                    commission: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$platformProfit', 0] }, 0]
                        }
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        QuickCommerceSeller.countDocuments({ ...sellerMatch, status: 'approved' }),
        QuickCommerceSeller.countDocuments({ ...sellerMatch, status: 'pending' }),
        QuickCommerceProduct.countDocuments({ ...(zoneId ? { zoneId } : {}), approvalStatus: 'approved' }),
        QuickCommerceOrder.find({
            ...orderMatch,
            orderStatus: { $in: PENDING_ORDER_STATUSES }
        }).sort({ createdAt: -1 }).limit(5).select('orderId order_id createdAt').lean(),
        QuickCommerceOrder.find({
            ...orderMatch,
            orderStatus: 'delivered'
        }).sort({ updatedAt: -1 }).limit(5).select('orderId order_id updatedAt').lean(),
        QuickCommerceSeller.find({ ...sellerMatch, status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('storeName createdAt')
            .lean()
    ]);

    const totals = orderTotalsAgg?.[0] || {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthlyAgg.map((item) => ({
        month: monthNames[(item?._id?.month || 1) - 1],
        orders: Number(item.orders || 0),
        revenue: Number(item.revenue || 0),
        commission: Number(item.commission || 0)
    }));

    const liveSignals = [
        ...recentPendingOrders.map((order) => ({
            type: 'order',
            status: 'pending',
            title: order.order_id || order.orderId || 'Quick order',
            time: order.createdAt
        })),
        ...recentDeliveredOrders.map((order) => ({
            type: 'order',
            status: 'delivered',
            title: order.order_id || order.orderId || 'Quick order',
            time: order.updatedAt
        })),
        ...recentSellers.map((seller) => ({
            type: 'seller',
            status: 'pending',
            title: seller.storeName || 'Seller request',
            time: seller.createdAt
        }))
    ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);

    return {
        orders: {
            total: Number(totals.totalOrders || 0),
            byStatus: {
                delivered: Number(totals.delivered || 0),
                cancelled: Number(totals.cancelled || 0),
                pending: Number(totals.pending || 0)
            }
        },
        revenue: { total: Number(totals.revenueTotal || 0) },
        commission: { total: Number(totals.commissionTotal || 0) },
        platformFee: { total: Number(totals.platformFeeTotal || 0) },
        deliveryFee: { total: Number(totals.deliveryFeeTotal || 0) },
        gst: { total: Number(totals.gstTotal || 0) },
        totalAdminEarnings: Number(totals.adminNetProfit || 0),
        sellers: {
            total: Number(sellersTotal || 0),
            pendingRequests: Number(sellersPending || 0)
        },
        items: {
            total: Number(productsTotal || 0)
        },
        orderStats: {
            pending: Number(totals.pending || 0),
            processing: Number(totals.processing || 0),
            completed: Number(totals.delivered || 0)
        },
        monthlyData,
        liveSignals
    };
}
