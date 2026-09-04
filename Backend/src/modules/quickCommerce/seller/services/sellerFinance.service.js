import mongoose from 'mongoose';
import { QuickCommerceOrder } from '../../orders/models/order.model.js';
import { QuickCommerceSeller } from '../models/seller.model.js';
import { QuickCommerceSellerWallet } from '../models/sellerWallet.model.js';
import { QuickCommerceSellerWithdrawal } from '../models/sellerWithdrawal.model.js';

function toTwoDigitYearString(dateObj) {
    const y = String(dateObj.getFullYear());
    return y.slice(-2);
}

function monthShort(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex] || 'Jan';
}

function getFixedCurrentCycleWindow(now = new Date()) {
    const startDay = 15;
    let year = now.getFullYear();
    let month = now.getMonth();

    if (now.getDate() < startDay) {
        month -= 1;
        if (month < 0) {
            month = 11;
            year -= 1;
        }
    }

    const start = new Date(year, month, startDay, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return {
        start,
        end,
        startMeta: { day: String(startDay), month: monthShort(month), year: toTwoDigitYearString(new Date(year, month, startDay)) },
        endMeta: { day: String(now.getDate()), month: monthShort(now.getMonth()), year: toTwoDigitYearString(now) }
    };
}

function parseISODateParam(v) {
    if (!v) return null;
    const d = new Date(String(v).trim());
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function parseISODateParamEnd(v) {
    if (!v) return null;
    const d = new Date(String(v).trim());
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
}

function formatSellerId(seller) {
    if (!seller?._id) return 'N/A';
    const slug = String(seller.slug || '').trim();
    if (slug) return slug;
    return `SELL${seller._id.toString().slice(-6).padStart(6, '0')}`;
}

function getSellerPayoutForOrder(order = {}) {
    const pricing = order.pricing || {};
    const subtotal = Number(pricing.subtotal || 0);
    const restaurantCommission = Number(pricing.restaurantCommission || 0);
    const gstOnCommission = Number(pricing.gstOnCommission || 0);
    const paymentGatewayFee = Number(pricing.paymentGatewayFee || 0);
    const tcs = Number(pricing.tcs || 0);

    return Math.max(0, subtotal - restaurantCommission - gstOnCommission - paymentGatewayFee - tcs);
}

async function syncWalletSnapshot(sellerId, snapshot = {}) {
    const payload = {
        balance: Number(snapshot.availableBalance || 0),
        lockedAmount: Number(snapshot.lockedAmount || 0),
        totalEarnings: Number(snapshot.totalEarnings || 0),
        totalSettled: Number(snapshot.totalSettled || 0)
    };

    await QuickCommerceSellerWallet.findOneAndUpdate(
        { sellerId },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

export async function getSellerFinance(sellerId, query = {}) {
    if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) return null;
    const sid = new mongoose.Types.ObjectId(sellerId);

    const seller = await QuickCommerceSeller.findById(sid)
        .select('storeName slug addressLine1 addressLine2 area city state pincode location accountHolderName accountNumber ifscCode upiId')
        .lean();

    const address =
        seller?.location?.formattedAddress ||
        [seller?.addressLine1, seller?.addressLine2, seller?.area, seller?.city, seller?.state, seller?.pincode]
            .filter(Boolean)
            .join(', ');

    const nowWindow = getFixedCurrentCycleWindow(new Date());

    const currentOrders = await QuickCommerceOrder.find({
        sellerId: sid,
        orderStatus: 'delivered',
        createdAt: { $gte: nowWindow.start, $lte: nowWindow.end }
    })
        .sort({ createdAt: -1 })
        .lean();

    const currentCycleOrders = currentOrders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        return {
            orderId: order.order_id || order.orderId || String(order._id),
            createdAt: order.createdAt,
            items,
            foodNames: items.map((item) => item?.name).filter(Boolean).join(', '),
            orderTotal: Number(order?.pricing?.subtotal || 0),
            totalAmount: Number(order?.pricing?.total || 0),
            payout: getSellerPayoutForOrder(order),
            commission: Number(order?.pricing?.restaurantCommission || 0),
            paymentMethod: order?.payment?.method || '',
            orderStatus: order?.orderStatus || '',
            status: order?.payment?.status || ''
        };
    });

    const currentCycleEstimatedPayout = currentCycleOrders.reduce((sum, order) => sum + Number(order.payout || 0), 0);

    const allDeliveredOrders = await QuickCommerceOrder.find({
        sellerId: sid,
        orderStatus: 'delivered'
    })
        .select('pricing createdAt order_id orderId items payment orderStatus')
        .sort({ createdAt: -1 })
        .lean();

    const lifetimeEarnings = allDeliveredOrders.reduce((sum, order) => sum + getSellerPayoutForOrder(order), 0);

    const effectiveWithdrawalsAgg = await QuickCommerceSellerWithdrawal.aggregate([
        {
            $match: {
                sellerId: sid,
                status: { $in: ['pending', 'approved', 'processed'] }
            }
        },
        { $group: { _id: null, total: { $sum: { $divide: ['$amountPaise', 100] } } } }
    ]);

    const settledWithdrawalsAgg = await QuickCommerceSellerWithdrawal.aggregate([
        {
            $match: {
                sellerId: sid,
                status: { $in: ['approved', 'processed'] }
            }
        },
        { $group: { _id: null, total: { $sum: { $divide: ['$amountPaise', 100] } } } }
    ]);

    const totalEffectiveWithdrawals = Number(effectiveWithdrawalsAgg?.[0]?.total || 0);
    const totalSettled = Number(settledWithdrawalsAgg?.[0]?.total || 0);
    const availableBalance = Math.max(0, lifetimeEarnings - totalEffectiveWithdrawals);
    const lockedAmount = Math.max(0, totalEffectiveWithdrawals - totalSettled);

    await syncWalletSnapshot(sid, {
        availableBalance,
        lockedAmount,
        totalEarnings: lifetimeEarnings,
        totalSettled
    });

    const currentCycle = {
        start: { ...nowWindow.startMeta },
        end: { ...nowWindow.endMeta },
        totalEarnings: currentCycleEstimatedPayout,
        totalWithdrawn: totalEffectiveWithdrawals,
        estimatedPayout: availableBalance,
        totalOrders: currentCycleOrders.length,
        payoutDate: null,
        orders: currentCycleOrders
    };

    const invoiceSummary = {
        count: currentCycleOrders.length,
        subtotal: currentCycleOrders.reduce((sum, order) => sum + Number(order.orderTotal || 0), 0),
        taxes: currentCycleOrders.reduce((sum, order) => sum + Math.max(0, Number(order.totalAmount || 0) - Number(order.orderTotal || 0)), 0),
        gross: currentCycleOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)
    };

    const startDate = parseISODateParam(query.startDate);
    const endDate = parseISODateParamEnd(query.endDate);

    let pastCyclesResult = { orders: [], totalOrders: 0 };
    if (startDate && endDate) {
        const pastOrders = await QuickCommerceOrder.find({
            sellerId: sid,
            orderStatus: 'delivered',
            createdAt: { $gte: startDate, $lte: endDate }
        })
            .sort({ createdAt: -1 })
            .lean();

        const pastCycleOrders = pastOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            return {
                orderId: order.order_id || order.orderId || String(order._id),
                createdAt: order.createdAt,
                items,
                foodNames: items.map((item) => item?.name).filter(Boolean).join(', '),
                orderTotal: Number(order?.pricing?.subtotal || 0),
                totalAmount: Number(order?.pricing?.total || 0),
                payout: getSellerPayoutForOrder(order),
                commission: Number(order?.pricing?.restaurantCommission || 0),
                paymentMethod: order?.payment?.method || '',
                orderStatus: order?.orderStatus || '',
                status: order?.payment?.status || ''
            };
        });

        pastCyclesResult = {
            orders: pastCycleOrders,
            totalOrders: pastCycleOrders.length
        };
    }

    return {
        seller: {
            name: seller?.storeName || '',
            sellerId: formatSellerId(seller),
            address,
            accountHolderName: seller?.accountHolderName || '',
            accountNumber: seller?.accountNumber || '',
            ifscCode: seller?.ifscCode || '',
            upiId: seller?.upiId || ''
        },
        wallet: {
            balance: availableBalance,
            lockedAmount,
            totalEarnings: lifetimeEarnings,
            totalSettled
        },
        currentCycle,
        invoiceSummary,
        pastCycles: pastCyclesResult
    };
}
