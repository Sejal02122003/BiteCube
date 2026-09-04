import mongoose from 'mongoose';
import { QuickCommerceOrder } from '../models/order.model.js';
import { QuickCommercePaymentTransaction } from '../models/quickCommercePaymentTransaction.model.js';
import { FoodDeliveryPartner } from '../../../food/delivery/models/deliveryPartner.model.js';
import { FoodOrder } from '../../../food/orders/models/order.model.js';
import { QuickCommerceSeller } from '../../seller/models/seller.model.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../../core/auth/errors.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { sendNotificationToOwner, sendNotificationToOwners } from '../../../../core/notifications/firebase.service.js';
import { logger } from '../../../../utils/logger.js';
import { calculateQuickDeliveryEarning } from './order.service.js';
import { recordTransaction } from '../../../../core/payments/transaction.service.js';

const identity = (value) => mongoose.Types.ObjectId.isValid(value)
    ? { $or: [{ _id: value }, { order_id: value }, { orderId: value }] }
    : { $or: [{ order_id: value }, { orderId: value }] };
const external = (order) => {
    const value = order?.toObject?.() || order;
    return {
        ...value,
        orderType: 'quick',
        earnings: Number(value?.riderEarning || 0)
    };
};
const isOtp = (expected, entered) => String(expected || '').replace(/\D/g, '') === String(entered || '').replace(/\D/g, '');
const distanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (value) => Number(value) * Math.PI / 180;
    const dLat = toRad(lat2 - lat1); const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const populateOrder = (query) => query
    .populate('sellerId', 'storeName ownerPhone location profileImage addressLine1 area city state')
    .populate('userId', 'name phone email');

async function ensureQuickOrderEarning(order, sellerOverride = null) {
    if (!order || order.riderEarningCalculatedAt) return order;

    const seller = sellerOverride || (order.sellerId?.location
        ? order.sellerId
        : await QuickCommerceSeller.findById(order.sellerId).select('location').lean());
    const earningQuote = await calculateQuickDeliveryEarning(seller, order.deliveryAddress);
    const calculatedAt = new Date();

    order.deliveryDistanceKm = earningQuote.distanceKm;
    order.riderEarning = earningQuote.totalEarning;
    order.deliveryBonusAmount = earningQuote.bonusAmount;
    order.riderEarningCalculatedAt = calculatedAt;

    await QuickCommerceOrder.updateOne(
        { _id: order._id, riderEarningCalculatedAt: null },
        {
            $set: {
                deliveryDistanceKm: earningQuote.distanceKm,
                riderEarning: earningQuote.totalEarning,
                deliveryBonusAmount: earningQuote.bonusAmount,
                riderEarningCalculatedAt: calculatedAt
            }
        }
    );
    return order;
}

function emitUpdate(order, event = 'order_status_update') {
    const payload = external(order);
    const io = getIO();
    if (order.dispatch?.deliveryPartnerId) io.to(rooms.delivery(order.dispatch.deliveryPartnerId)).emit(event, payload);
    io.to(rooms.quickSeller(order.sellerId?._id || order.sellerId)).emit(event, payload);
    io.to(rooms.user(order.userId?._id || order.userId)).emit(event, payload);
    io.to(rooms.tracking(order._id)).emit(event, payload);
    return payload;
}

export async function offerQuickOrderToDelivery(orderOrId, options = {}) {
    const order = typeof orderOrId === 'object' && orderOrId?._id && orderOrId?.orderStatus
        ? orderOrId
        : await QuickCommerceOrder.findOne(identity(orderOrId));
    if (!order || !['packing', 'ready_for_pickup'].includes(order.orderStatus)) {
        return { offered: 0, reason: 'order_not_dispatchable' };
    }
    const activeFoodStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop'];
    const activeQuickStatuses = ['packing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop'];
    const [onlinePartners, busyFood, busyQuick] = await Promise.all([
        FoodDeliveryPartner.find({ status: 'approved', availabilityStatus: 'online' })
            .select('_id name lastLat lastLng lastLocation lastLocationAt')
            .lean(),
        FoodOrder.distinct('dispatch.deliveryPartnerId', {
            'dispatch.status': 'accepted',
            'dispatch.deliveryPartnerId': { $ne: null },
            orderStatus: { $in: activeFoodStatuses }
        }),
        QuickCommerceOrder.distinct('dispatch.deliveryPartnerId', {
            'dispatch.status': 'accepted',
            'dispatch.deliveryPartnerId': { $ne: null },
            orderStatus: { $in: activeQuickStatuses }
        })
    ]);
    const busyIds = new Set([...busyFood, ...busyQuick].filter(Boolean).map(String));
    const seller = order.sellerId?.location
        ? order.sellerId
        : await QuickCommerceSeller.findById(order.sellerId).select('location').lean();
    await ensureQuickOrderEarning(order, seller);
    const [sellerLng, sellerLat] = seller?.location?.coordinates || [];
    const sellerHasLocation = Number.isFinite(Number(sellerLat)) && Number.isFinite(Number(sellerLng));
    let outOfRangeCount = 0;
    const partners = onlinePartners.filter((partner) => {
        if (busyIds.has(String(partner._id))) return false;
        const fallbackCoordinates = partner.lastLocation?.coordinates || [];
        const riderLat = partner.lastLat ?? fallbackCoordinates[1];
        const riderLng = partner.lastLng ?? fallbackCoordinates[0];
        const riderHasLocation = riderLat != null && riderLng != null &&
            Number.isFinite(Number(riderLat)) && Number.isFinite(Number(riderLng));
        if (!sellerHasLocation || !riderHasLocation) return true;
        const isWithinRange = distanceKm(
            Number(sellerLat), Number(sellerLng), Number(riderLat), Number(riderLng)
        ) <= 15;
        if (!isWithinRange) outOfRangeCount += 1;
        return isWithinRange;
    });
    const existing = new Set((order.dispatch?.offeredTo || []).map((entry) => String(entry.partnerId)));
    const fresh = partners.filter((partner) => !existing.has(String(partner._id)));
    const now = new Date();
    if (fresh.length) {
        const updated = await QuickCommerceOrder.updateOne(
            { _id: order._id, 'dispatch.status': { $ne: 'accepted' } },
            {
                $set: { 'dispatch.status': 'unassigned', 'dispatch.dispatchingAt': now },
                $push: {
                    'dispatch.offeredTo': {
                        $each: fresh.map((partner) => ({ partnerId: partner._id, at: now, action: 'offered' }))
                    }
                }
            }
        );
        if (!updated.matchedCount) {
            throw new ValidationError('A delivery partner has already accepted this Quick order');
        }
    } else {
        await QuickCommerceOrder.updateOne(
            { _id: order._id, 'dispatch.status': { $ne: 'accepted' } },
            { $set: { 'dispatch.dispatchingAt': now } }
        );
    }
    const populated = await populateOrder(QuickCommerceOrder.findById(order._id)).lean();
    const payload = {
        ...external(populated),
        channel: 'socket_fallback',
        isResend: Boolean(options.isResend),
        earnings: Number(order.riderEarning || 0)
    };
    const io = getIO();
    for (const partner of fresh) {
        io.to(rooms.delivery(partner._id)).emit('new_order', payload);
        io.to(rooms.delivery(partner._id)).emit('new_order_available', payload);
    }
    if (fresh.length) void sendNotificationToOwners(
        fresh.map((partner) => ({ ownerType: 'DELIVERY_PARTNER', ownerId: partner._id })),
        {
            title: options.isResend ? 'Quick delivery request resent' : 'New Quick delivery',
            body: `Pickup from ${populated?.sellerId?.storeName || 'seller'}`,
            data: {
                type: 'new_order',
                orderType: 'quick',
                orderId: String(order._id),
                isResend: Boolean(options.isResend)
            }
        }
    );
    const diagnostics = {
        onlineCount: onlinePartners.length,
        busyCount: onlinePartners.filter((partner) => busyIds.has(String(partner._id))).length,
        withinRangeCount: partners.length,
        outOfRangeCount,
        alreadyOfferedCount: partners.length - fresh.length,
        sellerLocationAvailable: sellerHasLocation
    };
    logger.info(
        `[QuickDispatch] order=${order.order_id || order._id} offered=${fresh.length} online=${diagnostics.onlineCount} busy=${diagnostics.busyCount} within15km=${diagnostics.withinRangeCount} alreadyOffered=${diagnostics.alreadyOfferedCount}`
    );
    return {
        offered: fresh.length,
        notifiedCount: fresh.length,
        shortlistedCount: partners.length,
        searchRadiusKm: 15,
        diagnostics,
        order: payload
    };
}

export async function resendQuickOrderToDelivery(orderId, sellerId) {
    const order = await QuickCommerceOrder.findOne(identity(orderId));
    if (!order) throw new NotFoundError('Quick order not found');
    if (String(order.sellerId) !== String(sellerId)) {
        throw new ForbiddenError('You can only resend delivery alerts for your own orders');
    }
    if (!['packing', 'ready_for_pickup'].includes(order.orderStatus)) {
        throw new ValidationError(`Cannot resend delivery notification for Quick order in status: ${order.orderStatus}`);
    }
    if (order.dispatch?.status === 'accepted' && order.dispatch?.deliveryPartnerId) {
        throw new ValidationError('A delivery partner has already accepted this Quick order');
    }

    const reset = await QuickCommerceOrder.updateOne(
        {
            _id: order._id,
            'dispatch.status': { $ne: 'accepted' },
            orderStatus: { $in: ['packing', 'ready_for_pickup'] }
        },
        {
            $set: {
                'dispatch.status': 'unassigned',
                'dispatch.deliveryPartnerId': null,
                'dispatch.offeredTo': [],
                'dispatch.dispatchingAt': null
            }
        }
    );
    if (!reset.matchedCount) {
        throw new ValidationError('Delivery assignment changed. Refresh the order before resending');
    }

    const result = await offerQuickOrderToDelivery(order._id, { isResend: true });
    return {
        ...result,
        notifiedCount: Number(result?.notifiedCount ?? result?.offered ?? 0),
        shortlistedCount: Number(result?.shortlistedCount ?? result?.offered ?? 0)
    };
}

export async function getCurrentQuickTrip(deliveryPartnerId) {
    const order = await populateOrder(QuickCommerceOrder.findOne({
        'dispatch.deliveryPartnerId': deliveryPartnerId,
        'dispatch.status': 'accepted',
        orderStatus: { $in: ['packing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop'] }
    }).sort({ updatedAt: -1 })).lean();
    return order ? external(order) : null;
}

export async function listAvailableQuickOrders(deliveryPartnerId) {
    const partnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
    const docs = await populateOrder(QuickCommerceOrder.find({
        $or: [
            { 'dispatch.status': 'unassigned', orderStatus: { $in: ['packing', 'ready_for_pickup'] }, 'dispatch.offeredTo': { $elemMatch: { partnerId, action: 'offered' } } },
            { 'dispatch.deliveryPartnerId': partnerId, 'dispatch.status': 'accepted', orderStatus: { $nin: ['delivered', 'cancelled_by_user', 'cancelled_by_seller', 'cancelled_by_admin', 'dead'] } }
        ]
    }).sort({ createdAt: -1 })).lean();
    return Promise.all(docs.map(async (order) => {
        await ensureQuickOrderEarning(order);
        return external(order);
    }));
}

export async function getQuickDeliveryOrder(orderId, deliveryPartnerId) {
    const order = await populateOrder(QuickCommerceOrder.findOne(identity(orderId))).lean();
    if (!order) throw new NotFoundError('Quick order not found');
    const offered = (order.dispatch?.offeredTo || []).some((entry) => String(entry.partnerId) === String(deliveryPartnerId));
    const assigned = String(order.dispatch?.deliveryPartnerId || '') === String(deliveryPartnerId);
    if (!offered && !assigned) throw new ForbiddenError('Quick order was not offered to you');
    return external(order);
}

export async function acceptQuickDelivery(orderId, deliveryPartnerId) {
    const partnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
    const order = await populateOrder(QuickCommerceOrder.findOneAndUpdate({
        ...identity(orderId),
        orderStatus: { $in: ['packing', 'ready_for_pickup'] },
        'dispatch.status': 'unassigned',
        'dispatch.offeredTo': { $elemMatch: { partnerId, action: 'offered' } }
    }, {
        $set: { 'dispatch.deliveryPartnerId': partnerId, 'dispatch.status': 'accepted', 'dispatch.assignedAt': new Date(), 'dispatch.acceptedAt': new Date() },
        $push: { statusHistory: { byRole: 'DELIVERY_PARTNER', byId: partnerId, from: 'dispatchable', to: 'accepted', note: 'Rider accepted Quick order', at: new Date() } }
    }, { new: true }));
    if (!order) {
        const existing = await QuickCommerceOrder.findOne(identity(orderId)).lean();
        if (!existing) throw new NotFoundError('Quick order not found');
        if (String(existing.dispatch?.deliveryPartnerId || '') !== String(deliveryPartnerId)) throw new ForbiddenError('Quick order already accepted by another rider');
        return external(existing);
    }
    const payload = emitUpdate(order);
    getIO().to('all_delivery').emit('order_claimed', { orderId: String(order._id), orderMongoId: String(order._id), claimedBy: String(deliveryPartnerId), orderType: 'quick' });
    void sendNotificationToOwner({ ownerType: 'USER', ownerId: order.userId?._id || order.userId, payload: { title: 'Delivery partner assigned', body: `A rider accepted your Quick order #${order.order_id}`, data: { type: 'delivery_accepted', orderType: 'quick', orderId: String(order._id) } } });
    void sendNotificationToOwner({ ownerType: 'QUICK_COMMERCE_SELLER', ownerId: order.sellerId?._id || order.sellerId, payload: { title: 'Rider assigned', body: `A rider accepted Quick order #${order.order_id}`, data: { type: 'delivery_accepted', orderType: 'quick', orderId: String(order._id) } } });
    return payload;
}

export async function rejectQuickDelivery(orderId, deliveryPartnerId) {
    const order = await QuickCommerceOrder.findOne(identity(orderId));
    if (!order) throw new NotFoundError('Quick order not found');
    const offer = (order.dispatch.offeredTo || []).find((entry) => String(entry.partnerId) === String(deliveryPartnerId) && entry.action === 'offered');
    if (offer) offer.action = 'rejected';
    if (String(order.dispatch.deliveryPartnerId || '') === String(deliveryPartnerId) && order.dispatch.status !== 'accepted') {
        order.dispatch.deliveryPartnerId = null; order.dispatch.status = 'unassigned';
    }
    await order.save(); return external(order);
}

async function owned(orderId, deliveryPartnerId, secrets = '') {
    const order = await QuickCommerceOrder.findOne(identity(orderId)).select(secrets);
    if (!order) throw new NotFoundError('Quick order not found');
    if (String(order.dispatch?.deliveryPartnerId || '') !== String(deliveryPartnerId) || order.dispatch?.status !== 'accepted') throw new ForbiddenError('Not your Quick order');
    return order;
}

export async function reachQuickPickup(orderId, deliveryPartnerId) {
    const order = await owned(orderId, deliveryPartnerId, '+pickupOtp');
    const from = order.orderStatus;
    order.orderStatus = order.orderStatus === 'packing' ? 'packing' : 'reached_pickup';
    order.deliveryState.currentPhase = 'at_pickup'; order.deliveryState.status = 'reached_pickup'; order.deliveryState.reachedPickupAt ||= new Date();
    order.statusHistory.push({ byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from, to: 'reached_pickup', note: 'Rider reached seller' });
    await order.save(); emitUpdate(order);
    return external(order);
}

export async function requestQuickPickupOtp(orderId, deliveryPartnerId) {
    const order = await owned(orderId, deliveryPartnerId, '+pickupOtp');
    if (!order.pickupOtp) throw new ValidationError('Pickup OTP unavailable');
    const requestedAt = new Date();
    if (!order.deliveryVerification) order.deliveryVerification = {};
    if (!order.deliveryVerification.pickupOtp) order.deliveryVerification.pickupOtp = {};
    order.deliveryVerification.pickupOtp.requestedAt = requestedAt;
    order.markModified('deliveryVerification');
    await order.save();
    const payload = {
        type: 'pickup_otp_reveal',
        orderId: order.order_id,
        orderMongoId: String(order._id),
        otp: String(order.pickupOtp),
        orderType: 'quick',
        requestedAt: requestedAt.toISOString(),
        message: 'Delivery partner is requesting the pickup OTP. Share this code after handing over the products.'
    };
    getIO().to(rooms.quickSeller(order.sellerId)).emit('pickup_otp_reveal', payload);
    void sendNotificationToOwner({
        ownerType: 'QUICK_COMMERCE_SELLER',
        ownerId: order.sellerId,
        payload: {
            title: 'Quick pickup OTP requested',
            body: `Share OTP ${order.pickupOtp} with the rider for order #${order.order_id}`,
            sound: 'default',
            dataOnly: true,
            data: { ...payload, targetUrl: '/quick/seller/orders', link: '/quick/seller/orders' }
        }
    });
    return { requested: true, requestedAt };
}

export async function confirmQuickPickup(orderId, deliveryPartnerId, otp) {
    const order = await owned(orderId, deliveryPartnerId, '+pickupOtp');
    if (!['ready_for_pickup', 'reached_pickup'].includes(order.orderStatus)) throw new ValidationError('Seller has not marked this Quick order ready yet');
    if (!isOtp(order.pickupOtp, otp)) throw new ValidationError('Invalid pickup OTP');
    const from = order.orderStatus; order.orderStatus = 'picked_up';
    order.deliveryVerification.pickupOtp.verified = true; order.deliveryState.currentPhase = 'en_route_to_delivery'; order.deliveryState.status = 'picked_up'; order.deliveryState.pickedUpAt = new Date();
    order.statusHistory.push({ byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from, to: 'picked_up', note: 'Quick order picked up' });
    await order.save(); const result = emitUpdate(order);
    void sendNotificationToOwner({ ownerType: 'USER', ownerId: order.userId, payload: { title: 'Quick order on the way', body: `Your order #${order.order_id} was picked up`, data: { type: 'order_status_update', orderType: 'quick', orderId: String(order._id), orderStatus: 'picked_up' } } });
    return result;
}

export async function reachQuickDrop(orderId, deliveryPartnerId) {
    const order = await owned(orderId, deliveryPartnerId, '+deliveryOtp');
    order.orderStatus = 'reached_drop'; order.deliveryState.currentPhase = 'at_drop'; order.deliveryState.status = 'reached_drop'; order.deliveryState.reachedDropAt = new Date();
    order.statusHistory.push({ byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from: 'picked_up', to: 'reached_drop', note: 'Rider reached customer' });
    await order.save(); emitUpdate(order);
    const otpPayload = { orderId: order.order_id, orderMongoId: String(order._id), otp: String(order.deliveryOtp), orderType: 'quick', message: 'Share this OTP only after receiving all products.' };
    getIO().to(rooms.user(order.userId)).emit('delivery_drop_otp', otpPayload);
    getIO().to(rooms.tracking(order._id)).emit('delivery_drop_otp', otpPayload);
    void sendNotificationToOwner({ ownerType: 'USER', ownerId: order.userId, payload: { title: 'Rider has arrived', body: `Delivery OTP: ${order.deliveryOtp}`, data: { type: 'drop_otp', orderType: 'quick', orderId: String(order._id), otp: String(order.deliveryOtp) } } });
    return external(order);
}

export async function verifyQuickDropOtp(orderId, deliveryPartnerId, otp) {
    const order = await owned(orderId, deliveryPartnerId, '+deliveryOtp');
    if (!isOtp(order.deliveryOtp, otp)) throw new ValidationError('Invalid delivery OTP');
    order.deliveryVerification.dropOtp.required = true; order.deliveryVerification.dropOtp.verified = true; await order.save();
    return { order: external(order) };
}

export async function completeQuickDelivery(orderId, deliveryPartnerId, body = {}) {
    const order = await owned(orderId, deliveryPartnerId, '+deliveryOtp');
    if (!order.deliveryVerification?.dropOtp?.verified) {
        if (!body.otp || !isOtp(order.deliveryOtp, body.otp)) throw new ValidationError('Customer delivery OTP is required');
        order.deliveryVerification.dropOtp.verified = true;
    }
    order.orderStatus = 'delivered'; order.deliveryState.currentPhase = 'delivered'; order.deliveryState.status = 'delivered'; order.deliveryState.deliveredAt = new Date();
    // Persist the same distance-based amount that was advertised in the request.
    await ensureQuickOrderEarning(order);
    const paymentTransaction = await QuickCommercePaymentTransaction.findOne({ orderId: order._id });
    if (paymentTransaction?.paymentMethod === 'cash') {
        paymentTransaction.status = 'captured';
        paymentTransaction.payment.status = 'paid';
        paymentTransaction.payment.amountDuePaise = 0;
        paymentTransaction.history.push({ kind: 'captured', amountPaise: paymentTransaction.amounts.totalCustomerPaidPaise, note: 'Cash collected on delivery' });
        await paymentTransaction.save();
    }
    if (paymentTransaction && ['captured'].includes(paymentTransaction.status)) {
        await recordTransaction({
            entityType: 'seller', entityId: String(order.sellerId), type: 'credit',
            amount: Number(paymentTransaction.amounts.sellerSharePaise || 0) / 100,
            description: `Quick order seller earning #${order.order_id}`,
            category: 'settlement_payout', orderId: String(order._id),
            referenceKey: `quick-seller-credit:${order._id}`,
            metadata: { module: 'quickCommerce', source: 'quick_order_delivery' }
        });
    }
    order.statusHistory.push({ byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from: 'reached_drop', to: 'delivered', note: 'Quick delivery completed' });
    await order.save(); const result = emitUpdate(order);
    void sendNotificationToOwner({ ownerType: 'USER', ownerId: order.userId, payload: { title: 'Quick order delivered', body: `Order #${order.order_id} delivered successfully`, data: { type: 'order_completed', orderType: 'quick', orderId: String(order._id) } } });
    return result;
}
