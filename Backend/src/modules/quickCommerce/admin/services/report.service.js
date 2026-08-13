import mongoose from 'mongoose';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';
import { QuickCommerceSeller } from '../../seller/models/seller.model.js';
import { QuickCommerceProduct } from '../models/product.model.js';

const formatSearchRegex = (value) =>
    new RegExp(String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

export async function getQuickTransactionReport(query = {}) {
    const { fromDate, toDate, zone, seller, search } = query;
    const match = {};

    if (fromDate && toDate) {
        match.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    if (zone) {
        if (mongoose.Types.ObjectId.isValid(zone)) {
            match.zoneId = new mongoose.Types.ObjectId(zone);
        } else {
            const zoneDoc = await mongoose.model('FoodZone').findOne({
                $or: [{ zoneName: zone }, { name: zone }]
            }).select('_id').lean();
            if (zoneDoc?._id) {
                match.zoneId = zoneDoc._id;
            }
        }
    }

    if (seller && seller !== 'All sellers') {
        const sellerDoc = await QuickCommerceSeller.findOne({
            $or: [{ storeName: seller }, { slug: seller }]
        }).select('_id').lean();
        if (sellerDoc?._id) {
            match.sellerId = sellerDoc._id;
        } else {
            match.sellerId = null;
        }
    }

    if (search) {
        const searchRegex = formatSearchRegex(search);
        match.$or = [
            { order_id: { $regex: searchRegex } },
            { orderId: { $regex: searchRegex } },
            { customerName: { $regex: searchRegex } },
            { customerPhone: { $regex: searchRegex } }
        ];
    }

    const orders = await QuickCommerceOrder.find(match)
        .populate('transactionId')
        .populate('userId', 'name')
        .populate('sellerId', 'storeName')
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean();

    const transactions = orders.map((order) => {
        const tx = order.transactionId || {};
        const pricing = order.pricing || {};
        const subtotal = Number(pricing.subtotal || 0);
        const packagingFee = Number(pricing.packagingFee || 0);
        const deliveryFee = Number(pricing.deliveryFee || 0);
        const tax = Number(pricing.tax || 0);
        const discount = Number(pricing.discount || 0);
        const total = Number(pricing.total || 0);
        const platformFeeDerived = Math.max(0, total - subtotal - packagingFee - deliveryFee - tax + discount);
        const platformFee =
            pricing.platformFee !== undefined && pricing.platformFee !== null
                ? Number(pricing.platformFee || 0)
                : platformFeeDerived;

        const riderShare = Number(tx.amounts?.riderShare || 0);
        const deliveryGstAdmin = riderShare * 0.18;
        const deliveryProfit = Number(pricing.deliveryFee || 0) - riderShare - deliveryGstAdmin;

        return {
            id: tx._id || order._id,
            orderId: order.order_id || order.orderId || 'N/A',
            seller: order.sellerId?.storeName || 'N/A',
            restaurant: order.sellerId?.storeName || 'N/A',
            customerName: order.userId?.name || order.customerName || 'Guest',
            totalItemAmount: subtotal,
            itemDiscount: discount,
            couponDiscount: 0,
            referralDiscount: 0,
            discountedAmount: Math.max(0, subtotal - discount),
            vatTax: Number(tx.amounts?.taxAmount || tax || 0),
            deliveryCharge: deliveryFee,
            platformFee,
            orderAmount: Number(tx.amounts?.totalCustomerPaid || total || 0),
            status: tx.status || order.payment?.status || order.orderStatus || 'N/A',
            adminEarningBreakdown: {
                deliveryProfit,
                platformFee,
                packagingFee,
                sellerCommission: Number(pricing.restaurantCommission || 0),
                gstOnItem: Number(pricing.gstOnItem || 0),
                gstOnCommission: Number(pricing.gstOnCommission || 0),
                paymentGatewayFee: Number(pricing.paymentGatewayFee || 0),
                tcs: Number(pricing.tcs || 0),
                totalAdminReceivable: Number(pricing.totalAdminReceivable || tx.amounts?.platformNetProfit || 0),
                deliveryCostToAdmin: riderShare,
                deliveryGstToAdmin: deliveryGstAdmin,
                gstCollectedFromUser: tax
            }
        };
    });

    let completedTransaction = 0;
    let refundedTransaction = 0;
    let adminEarning = 0;
    let sellerEarning = 0;
    let deliverymanEarning = 0;

    const adminEarningBreakdown = {
        deliveryProfit: 0,
        platformFee: 0,
        packagingFee: 0,
        sellerCommission: 0,
        gstOnCommission: 0,
        paymentGatewayFee: 0,
        tcs: 0
    };

    for (const order of orders) {
        const tx = order.transactionId || {};
        const pricing = order.pricing || {};
        const delivered =
            ['captured', 'settled', 'paid'].includes(String(tx.status || '').toLowerCase()) &&
            String(order.orderStatus || '').toLowerCase() === 'delivered';

        if (delivered) {
            completedTransaction += Number(tx.amounts?.totalCustomerPaid || pricing.total || 0);
            adminEarning += Number(tx.amounts?.platformNetProfit || 0);
            sellerEarning += Number(tx.amounts?.restaurantShare || 0);
            deliverymanEarning += Number(tx.amounts?.riderShare || 0);

            const riderShare = Number(tx.amounts?.riderShare || 0);
            const deliveryGstAdmin = riderShare * 0.18;
            adminEarningBreakdown.deliveryProfit += Number(pricing.deliveryFee || 0) - riderShare - deliveryGstAdmin;
            adminEarningBreakdown.platformFee += Number(pricing.platformFee || 0);
            adminEarningBreakdown.packagingFee += Number(pricing.packagingFee || 0);
            adminEarningBreakdown.sellerCommission += Number(pricing.restaurantCommission || 0);
            adminEarningBreakdown.gstOnCommission += Number(pricing.gstOnCommission || 0);
            adminEarningBreakdown.paymentGatewayFee += Number(pricing.paymentGatewayFee || 0);
            adminEarningBreakdown.tcs += Number(pricing.tcs || 0);
        }

        const refunded =
            String(tx.status || '').toLowerCase() === 'refunded' ||
            String(order.payment?.refund?.status || '').toLowerCase() === 'processed' ||
            ['cancelled_by_admin', 'dead'].includes(String(order.orderStatus || '').toLowerCase());

        if (refunded) {
            refundedTransaction += Number(tx.amounts?.totalCustomerPaid || pricing.total || 0);
        }
    }

    return {
        transactions,
        summary: {
            completedTransaction,
            refundedTransaction,
            adminEarning,
            adminEarningBreakdown,
            sellerEarning,
            deliverymanEarning
        }
    };
}

const parseTimeRange = (timeLabel) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    const value = String(timeLabel || '').trim().toLowerCase();
    if (!value || value === 'all time') return null;

    if (value === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }

    if (value === 'this week') {
        const day = start.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        start.setDate(start.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }

    if (value === 'this month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }

    if (value === 'this year') {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }

    return null;
};

const formatCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

async function resolveZoneId(zoneRaw) {
    if (!zoneRaw) return null;
    if (mongoose.Types.ObjectId.isValid(zoneRaw)) return new mongoose.Types.ObjectId(zoneRaw);
    const matchedZone = await mongoose.model('FoodZone').findOne({
        $or: [{ name: zoneRaw }, { zoneName: zoneRaw }]
    }).select('_id').lean();
    return matchedZone?._id || null;
}

async function resolveSellerId(sellerRaw) {
    if (!sellerRaw || sellerRaw === 'All sellers') return null;
    if (mongoose.Types.ObjectId.isValid(sellerRaw)) return new mongoose.Types.ObjectId(sellerRaw);
    const matchedSeller = await QuickCommerceSeller.findOne({
        $or: [{ storeName: sellerRaw }, { slug: sellerRaw }]
    }).select('_id').lean();
    return matchedSeller?._id || null;
}

export async function getQuickOrderReport(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 5000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const match = {};
    const zoneId = await resolveZoneId(String(query.zone || '').trim());
    if (query.zone && !zoneId) return { orders: [], total: 0, page, limit, summary: {} };
    if (zoneId) match.zoneId = zoneId;

    const sellerId = await resolveSellerId(String(query.seller || '').trim());
    if (query.seller && query.seller !== 'All sellers' && !sellerId) return { orders: [], total: 0, page, limit, summary: {} };
    if (sellerId) match.sellerId = sellerId;

    const createdAtFilter = parseTimeRange(query.time);
    if (createdAtFilter) match.createdAt = createdAtFilter;

    const searchRaw = String(query.search || '').trim();
    if (searchRaw) {
        const searchRegex = formatSearchRegex(searchRaw);
        match.$or = [
            { order_id: { $regex: searchRegex } },
            { orderId: { $regex: searchRegex } },
            { customerName: { $regex: searchRegex } },
            { customerPhone: { $regex: searchRegex } }
        ];
    }

    const [rows, total] = await Promise.all([
        QuickCommerceOrder.find(match)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name')
            .populate('sellerId', 'storeName')
            .lean(),
        QuickCommerceOrder.countDocuments(match)
    ]);

    const statusSummary = {
        Pending: 0,
        Processing: 0,
        Delivered: 0,
        Canceled: 0,
        Refunded: 0
    };

    const orders = rows.map((order, index) => {
        const pricing = order.pricing || {};
        const items = Array.isArray(order.items) ? order.items : [];
        const subtotal = items.reduce((sum, item) => sum + Number(item.price || item.variantPrice || 0) * Number(item.quantity || 1), 0) || Number(pricing.subtotal || 0);
        const deliveryCharge = Number(pricing.deliveryFee || 0);
        const platformFee = Number(pricing.platformFee || 0);
        const vatTax = Number(pricing.tax || 0);
        const couponDiscount = Number(pricing.discount || 0);
        const totalAmount = pricing.total != null ? Number(pricing.total) : subtotal + deliveryCharge + platformFee + vatTax - couponDiscount;

        const backendStatus = String(order.orderStatus || '').toLowerCase();
        let displayStatus = 'Pending';
        if (['preparing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop'].includes(backendStatus)) displayStatus = 'Processing';
        else if (backendStatus === 'delivered') displayStatus = 'Delivered';
        else if (backendStatus.includes('cancelled')) displayStatus = 'Canceled';
        if (String(order.payment?.refund?.status || '').toLowerCase() === 'processed' || String(order.payment?.status || '').toLowerCase() === 'refunded') {
            displayStatus = 'Refunded';
        }
        statusSummary[displayStatus] = (statusSummary[displayStatus] || 0) + 1;

        return {
            sl: skip + index + 1,
            orderId: order.order_id || order.orderId || '',
            sellerId: String(order.sellerId?._id || order.sellerId || ''),
            seller: order.sellerId?.storeName || 'N/A',
            customerName: order.userId?.name || order.customerName || 'N/A',
            totalItemAmount: formatCurrency(subtotal),
            couponDiscount: formatCurrency(couponDiscount),
            vatTax: formatCurrency(vatTax),
            deliveryCharge: formatCurrency(deliveryCharge),
            platformFee: formatCurrency(platformFee),
            totalAmount: formatCurrency(totalAmount),
            orderStatus: displayStatus,
            createdAt: order.createdAt
        };
    });

    return { orders, total, page, limit, summary: statusSummary };
}

export async function getQuickTaxReport(query = {}) {
    const match = { orderStatus: 'delivered' };
    if (query.fromDate && query.toDate) {
        match.createdAt = { $gte: new Date(query.fromDate), $lte: new Date(query.toDate) };
    }

    const taxData = await QuickCommerceOrder.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$sellerId',
                totalIncome: { $sum: { $ifNull: ['$pricing.total', 0] } },
                totalTax: { $sum: { $ifNull: ['$pricing.tax', 0] } },
                orderCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'quick_commerce_sellers',
                localField: '_id',
                foreignField: '_id',
                as: 'seller'
            }
        },
        { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                incomeSource: { $ifNull: ['$seller.storeName', 'Unknown Seller'] },
                totalIncome: 1,
                totalTax: 1,
                orderCount: 1
            }
        },
        { $sort: { totalTax: -1 } }
    ]);

    const stats = { totalIncome: 0, totalTax: 0 };
    const reports = taxData.map((item, index) => {
        stats.totalIncome += Number(item.totalIncome || 0);
        stats.totalTax += Number(item.totalTax || 0);
        return {
            sl: index + 1,
            id: item._id,
            incomeSource: item.incomeSource,
            totalIncome: formatCurrency(item.totalIncome),
            totalTax: formatCurrency(item.totalTax),
            orderCount: item.orderCount
        };
    });

    return {
        reports,
        stats: {
            totalIncome: formatCurrency(stats.totalIncome),
            totalTax: formatCurrency(stats.totalTax)
        }
    };
}

export async function getQuickTaxReportDetail(sellerId, query = {}) {
    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
        throw new Error('Invalid seller ID');
    }

    const match = {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        orderStatus: 'delivered'
    };

    if (query.fromDate && query.toDate) {
        match.createdAt = { $gte: new Date(query.fromDate), $lte: new Date(query.toDate) };
    }

    const orders = await QuickCommerceOrder.find(match)
        .select('order_id orderId pricing createdAt orderStatus')
        .sort({ createdAt: -1 })
        .lean();

    const seller = await QuickCommerceSeller.findById(sellerId).select('storeName').lean();

    return {
        sellerName: seller?.storeName || 'Unknown Seller',
        orders: orders.map((o) => ({
            id: o._id,
            orderId: o.order_id || o.orderId || '',
            totalAmount: formatCurrency(o.pricing?.total || 0),
            taxAmount: formatCurrency(o.pricing?.tax || 0),
            date: o.createdAt
        }))
    };
}

export async function getQuickSellerReport(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 5000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const sellerFilter = {};
    const allFilter = String(query.all || '').trim().toLowerCase();
    if (allFilter === 'active') sellerFilter.isActive = true;
    else if (allFilter === 'inactive') sellerFilter.isActive = false;

    const zoneId = await resolveZoneId(String(query.zone || '').trim());
    if (query.zone && !zoneId) return { sellers: [], total: 0, page, limit };
    if (zoneId) sellerFilter.zoneId = zoneId;

    const typeRaw = String(query.type || '').trim().toLowerCase();
    if (typeRaw === 'commission') {
        sellerFilter.status = 'approved';
    }

    const searchRaw = String(query.search || '').trim();
    if (searchRaw) {
        const escaped = searchRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sellerFilter.$or = [
            { storeName: { $regex: escaped, $options: 'i' } },
            { ownerName: { $regex: escaped, $options: 'i' } },
            { ownerPhone: { $regex: escaped, $options: 'i' } },
            { city: { $regex: escaped, $options: 'i' } },
            { area: { $regex: escaped, $options: 'i' } }
        ];
    }

    const [sellerDocs, total] = await Promise.all([
        QuickCommerceSeller.find(sellerFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('storeName profileImage city area zoneId rating totalRatings status')
            .populate('zoneId', 'name zoneName')
            .lean(),
        QuickCommerceSeller.countDocuments(sellerFilter)
    ]);

    const sellerIds = sellerDocs.map((s) => s._id).filter(Boolean);
    if (!sellerIds.length) return { sellers: [], total, page, limit };

    const orderCreatedAtFilter = parseTimeRange(query.time);
    const orderMatch = { sellerId: { $in: sellerIds }, orderStatus: 'delivered' };
    if (orderCreatedAtFilter) orderMatch.createdAt = orderCreatedAtFilter;

    const [productsAgg, ordersAgg] = await Promise.all([
        QuickCommerceProduct.aggregate([
            { $match: { sellerId: { $in: sellerIds }, approvalStatus: 'approved' } },
            { $group: { _id: '$sellerId', totalProducts: { $sum: 1 } } }
        ]),
        QuickCommerceOrder.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: '$sellerId',
                    totalOrder: { $sum: 1 },
                    totalOrderAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
                    totalDiscountGiven: { $sum: { $ifNull: ['$pricing.discount', 0] } },
                    totalVATTAX: { $sum: { $ifNull: ['$pricing.tax', 0] } },
                    totalAdminCommission: { $sum: { $ifNull: ['$pricing.restaurantCommission', 0] } }
                }
            }
        ])
    ]);

    const productMap = new Map(productsAgg.map((x) => [String(x._id), Number(x.totalProducts || 0)]));
    const orderMap = new Map(ordersAgg.map((x) => [String(x._id), x]));

    const sellers = sellerDocs.map((seller, index) => {
        const key = String(seller._id);
        const counts = orderMap.get(key) || {
            totalOrder: 0,
            totalOrderAmount: 0,
            totalDiscountGiven: 0,
            totalVATTAX: 0,
            totalAdminCommission: 0
        };

        return {
            _id: seller._id,
            sl: skip + index + 1,
            icon: seller.profileImage || '',
            sellerName: seller.storeName || '',
            totalProducts: productMap.get(key) || 0,
            totalOrder: Number(counts.totalOrder || 0),
            totalOrderAmount: formatCurrency(counts.totalOrderAmount),
            totalDiscountGiven: formatCurrency(counts.totalDiscountGiven),
            totalAdminCommission: formatCurrency(counts.totalAdminCommission),
            totalVATTAX: formatCurrency(counts.totalVATTAX),
            averageRatings: Number(seller.rating || 0),
            reviews: Number(seller.totalRatings || 0),
            status: seller.status || 'pending',
            zoneName: seller.zoneId?.name || seller.zoneId?.zoneName || ''
        };
    });

    return { sellers, total, page, limit };
}
