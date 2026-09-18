import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, MapPin, Phone, 
  ChevronRight, Lock, CheckCircle2,
  ShoppingBag, Utensils, X, Check, Loader2, Bell, BellOff, ShieldCheck,
  Clock, Navigation, ExternalLink, ChefHat, FileText, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { deliveryAPI } from '@food/api';
import { ActionSlider } from '@/modules/DeliveryV2/components/ui/ActionSlider';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { useDeliveryNotificationContext } from '@food/context/DeliveryNotificationContext';
import { getHaversineDistance } from '@/modules/DeliveryV2/utils/geo';
import { getOrderMongoId, getOrderDisplayId, getOrderAcceptId } from '@food/utils/orderDispatchId';

const resolveOrderMetrics = (order, riderLocation) => {
  if (!order) return { pickup: { distanceKm: '??', etaMins: '??' }, drop: { distanceKm: '??', etaMins: '??' }, total: { distanceKm: '??', etaMins: '??' } };

  const resolveRestaurantCoords = () => {
    const rest = order.restaurantLocation || order.sellerId?.location || order.restaurantId?.location || {};
    let lat = parseFloat(order.restaurant_lat || order.restaurantLat || rest.latitude || rest.lat);
    let lng = parseFloat(order.restaurant_lng || order.restaurantLng || rest.longitude || rest.lng);
    if ((Number.isNaN(lat) || Number.isNaN(lng)) && Array.isArray(rest.coordinates) && rest.coordinates.length >= 2) {
      lng = parseFloat(rest.coordinates[0]);
      lat = parseFloat(rest.coordinates[1]);
    }
    return { lat, lng };
  };

  const resolveCustomerCoords = () => {
    const deliveryAddress = order?.deliveryAddress || {};
    const geoCoords =
      Array.isArray(deliveryAddress?.location?.coordinates) &&
      deliveryAddress.location.coordinates.length >= 2
        ? {
            lng: parseFloat(deliveryAddress.location.coordinates[0]),
            lat: parseFloat(deliveryAddress.location.coordinates[1]),
          }
        : null;
    const loc = order.customerLocation || order.deliveryLocation || geoCoords;
    if (!loc) return { lat: NaN, lng: NaN };
    return { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
  };

  const etaFromMeters = (meters, extraMins = 0) =>
    Math.max(1, Math.ceil(meters / 416) + extraMins);

  const fmtKm = (km) => (km != null && Number.isFinite(km) ? km.toFixed(1) : '??');
  const fmtMins = (mins) => (mins != null && Number.isFinite(mins) ? mins : '??');

  const { lat: resLat, lng: resLng } = resolveRestaurantCoords();
  const { lat: custLat, lng: custLng } = resolveCustomerCoords();

  let pickupDistKm = null;
  let pickupEta = null;
  const rawPickup = order.pickupDistanceKm ?? order.distanceKm;
  if (rawPickup != null) {
    pickupDistKm = Number(rawPickup);
    const rawEta = order.estimatedTime || order.duration || order.eta;
    pickupEta = rawEta && rawEta > 0 ? Math.ceil(rawEta) : etaFromMeters(pickupDistKm * 1000, 5);
  } else if (riderLocation && !Number.isNaN(resLat) && !Number.isNaN(resLng)) {
    const distM = getHaversineDistance(riderLocation.lat, riderLocation.lng, resLat, resLng);
    pickupDistKm = distM / 1000;
    pickupEta = etaFromMeters(distM, order.prepTime || 5);
  }

  let dropDistKm = null;
  let dropEta = null;
  const rawDrop = order.dropDistanceKm ?? order.deliveryDistanceKm;
  if (rawDrop != null) {
    dropDistKm = Number(rawDrop);
    dropEta = order.dropEta ? Math.ceil(order.dropEta) : etaFromMeters(dropDistKm * 1000, 0);
  } else if (!Number.isNaN(resLat) && !Number.isNaN(resLng) && !Number.isNaN(custLat) && !Number.isNaN(custLng)) {
    const distM = getHaversineDistance(resLat, resLng, custLat, custLng);
    dropDistKm = distM / 1000;
    dropEta = etaFromMeters(distM, 0);
  }

  const totalKm = pickupDistKm != null && dropDistKm != null ? pickupDistKm + dropDistKm : null;
  const totalEta = pickupEta != null && dropEta != null ? pickupEta + dropEta : null;

  const pickupMapsLink = !Number.isNaN(resLat) && !Number.isNaN(resLng)
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${resLat},${resLng}`)}`
    : null;

  const dropMapsLink = !Number.isNaN(custLat) && !Number.isNaN(custLng)
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${custLat},${custLng}`)}`
    : null;

  return {
    pickup: { distanceKm: fmtKm(pickupDistKm), etaMins: fmtMins(pickupEta) },
    drop: { distanceKm: fmtKm(dropDistKm), etaMins: fmtMins(dropEta) },
    total: { distanceKm: fmtKm(totalKm), etaMins: fmtMins(totalEta) },
    pickupMapsLink,
    dropMapsLink,
  };
};

export default function OrdersViewV2({
  incomingOrders = [],
  onAcceptOrder,
  onRejectOrder,
  onOpenOrderMap,
  onRefresh,
  onPickUpOrder,
  onReachPickup,
  onReachDrop,
  onCompleteDelivery,
}) {
  const navigate = useNavigate();
  const { 
    activeOrders = [], 
    activeOrder, 
    selectActiveOrder, 
    maxSlots = 3,
    isAlarmEnabled = true,
    toggleAlarm,
    riderLocation
  } = useDeliveryStore();
  const notificationCtx = useDeliveryNotificationContext();
  const stopAlertLoop = notificationCtx?.stopAlertLoop;
  const [activeSubTab, setActiveSubTab] = useState('new'); // 'new' | 'accepted'
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);
  const [passingOrderId, setPassingOrderId] = useState(null);
  const [requestingOtpId, setRequestingOtpId] = useState(null);
  const [requestedOtpIds, setRequestedOtpIds] = useState({});
  const [pickupOtpMap, setPickupOtpMap] = useState({});
  const [pickingUpOrderKey, setPickingUpOrderKey] = useState(null);
  const [dropOtpMap, setDropOtpMap] = useState({});
  const [completingOrderKey, setCompletingOrderKey] = useState(null);

  const handleOpenInAppMap = (order) => {
    const targetId = getOrderMongoId(order) || getOrderAcceptId(order) || order?.order_id || order?.orderId || order?._id;
    if (targetId) {
      selectActiveOrder(targetId);
    }
    if (onOpenOrderMap) {
      onOpenOrderMap(order);
    } else {
      navigate('/food/delivery/feed');
    }
  };

  const handleToggleAlarm = () => {
    const nextState = !isAlarmEnabled;
    toggleAlarm();
    if (!nextState) {
      stopAlertLoop?.();
      toast.info('Order alarm silenced');
    } else {
      toast.success('Order alarm enabled');
    }
  };

  const handleReachPickup = async (order) => {
    try {
      if (onReachPickup) {
        await onReachPickup(order);
      } else {
        const orderId = order.order_id || order.orderId || order._id || order.orderMongoId;
        await deliveryAPI.confirmReachedPickup(orderId, order?.orderType);
        useDeliveryStore.getState().setActiveOrder({
          ...order,
          deliveryStatus: 'REACHED_PICKUP',
          status: 'reached_pickup',
        });
      }
      toast.success('Arrived at store! You can now request & enter Pickup OTP.');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update arrival');
    }
  };

  const handleReachDrop = async (order) => {
    try {
      if (onReachDrop) {
        await onReachDrop(order);
      } else {
        const orderId = order.order_id || order.orderId || order._id || order.orderMongoId;
        await deliveryAPI.confirmReachedDrop(orderId, order?.orderType);
        useDeliveryStore.getState().setActiveOrder({
          ...order,
          deliveryStatus: 'REACHED_DROP',
          status: 'reached_drop',
        });
      }
      toast.success('Arrived at customer location!');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update arrival');
    }
  };

  const ongoingActiveOrders = (activeOrders || []).filter((o) => {
    const s = String(
      o.deliveryStatus ||
      o.orderState?.status ||
      o.orderStatus ||
      o.status ||
      ''
    ).toLowerCase();
    return !['delivered', 'completed', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin', 'dead'].includes(s);
  });
  const isSlotsFull = ongoingActiveOrders.length >= maxSlots;

  const handleRequestOtp = async (order) => {
    const orderId = order.order_id || order.orderId || order._id || order.orderMongoId;
    const key = getOrderMongoId(order) || getOrderAcceptId(order) || orderId;
    if (!orderId) {
      toast.error('Order ID missing');
      return;
    }
    const isQuick = order.orderType === 'quick';
    const storeLabel = isQuick ? 'seller' : 'restaurant';
    setRequestingOtpId(key);
    try {
      await deliveryAPI.requestPickupOtp(orderId, order.orderType);
      setRequestedOtpIds((prev) => ({ ...prev, [key]: true }));
      toast.success(`OTP requested from ${storeLabel}! Ask them for the 4-digit code.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || `Failed to request OTP from ${storeLabel}`);
    } finally {
      setRequestingOtpId(null);
    }
  };

  const handleConfirmPickup = async (order, otp) => {
    if (!otp || String(otp).trim().length !== 4) {
      toast.error('Please enter the 4-digit pickup OTP');
      return;
    }
    const key = getOrderMongoId(order) || getOrderAcceptId(order);
    setPickingUpOrderKey(key);
    try {
      if (onPickUpOrder) {
        await onPickUpOrder(null, otp, order);
      } else {
        const orderId = order.order_id || order.orderId || order._id || order.orderMongoId;
        await deliveryAPI.confirmOrderId(
          orderId,
          order.displayOrderId || orderId,
          {},
          { otp },
          order?.orderType
        );
        useDeliveryStore.getState().setActiveOrder({
          ...order,
          deliveryStatus: 'PICKED_UP',
          status: 'picked_up'
        });
      }
      toast.success('Order picked up! Proceed to customer drop.');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Invalid Pickup OTP');
    } finally {
      setPickingUpOrderKey(null);
    }
  };

  const handleConfirmDelivery = async (order, otp) => {
    if (!otp || String(otp).trim().length !== 4) {
      toast.error('Please enter the 4-digit customer delivery OTP');
      return;
    }
    const key = getOrderMongoId(order) || getOrderAcceptId(order);
    setCompletingOrderKey(key);
    try {
      if (onCompleteDelivery) {
        await onCompleteDelivery(otp, null, order);
      } else {
        const orderId = order.order_id || order.orderId || order._id || order.orderMongoId;
        await deliveryAPI.verifyDropOtp(orderId, otp, order?.orderType);
        await deliveryAPI.completeDelivery(orderId, { otp, rating: 5 }, order?.orderType);
        useDeliveryStore.getState().updateTripStatus('COMPLETED');
      }
      const orderKey = getOrderMongoId(order) || getOrderAcceptId(order) || order._id || order.orderId;
      if (orderKey) {
        useDeliveryStore.getState().removeActiveOrder(orderKey);
      }
      toast.success('Delivery verified & completed! Great job.');

      const remainingActive = useDeliveryStore.getState().activeOrders;
      if (remainingActive.length > 0) {
        const nextOrder = remainingActive[0];
        const nextKey = getOrderMongoId(nextOrder) || getOrderAcceptId(nextOrder) || nextOrder._id || nextOrder.orderId;
        useDeliveryStore.getState().selectActiveOrder(nextKey);
        toast.info(`Next order location loaded on map: #${nextOrder.order_id || nextOrder.orderId || ''}`);
        navigate('/food/delivery/feed');
      }

      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Invalid delivery OTP entered');
    } finally {
      setCompletingOrderKey(null);
    }
  };

  // Auto switch to 'accepted' only when no new orders remain but active orders exist; or switch to 'new' when first receiving new orders with 0 active orders
  React.useEffect(() => {
    if (incomingOrders.length > 0 && ongoingActiveOrders.length === 0) {
      setActiveSubTab('new');
    } else if (incomingOrders.length === 0 && ongoingActiveOrders.length > 0) {
      setActiveSubTab('accepted');
    }
  }, [incomingOrders.length, ongoingActiveOrders.length]);

  React.useEffect(() => {
    onRefresh?.();
  }, []); // Run on mount once to avoid infinite refresh loops

  return (
    <div className="min-h-full flex flex-col bg-gray-50 pb-28">
      {/* ─── 1. TOP ORANGE HEADER (Matches #e7770d 1:1 Target Design) ─── */}
      <div 
        className="pt-6 safe-top pb-6 px-6 shadow-md rounded-b-[2.5rem]"
        style={{ backgroundColor: '#e7770d' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">Orders</h1>
            <p className="text-white/90 text-xs font-semibold mt-0.5 tracking-wide">
              {ongoingActiveOrders.length}/{maxSlots} active slots used
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleAlarm}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-bold text-xs transition-all backdrop-blur-md border shadow-sm select-none active:scale-95 cursor-pointer ${
              isAlarmEnabled
                ? 'bg-white text-[#e7770d] border-white shadow-md'
                : 'bg-black/25 text-white/80 border-white/20 hover:bg-black/35 hover:text-white'
            }`}
            title={isAlarmEnabled ? 'Order Alarm Enabled (tap to mute)' : 'Order Alarm Muted (tap to enable)'}
          >
            {isAlarmEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 fill-[#e7770d] text-[#e7770d]" />
                <span className="tracking-wide uppercase text-[11px] font-extrabold">Alarm ON</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5 text-white/70" />
                <span className="tracking-wide uppercase text-[11px] font-extrabold">Alarm OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Segmented Control Pill Switcher */}
        <div className="bg-black/15 p-1 rounded-full flex gap-1 backdrop-blur-md border border-white/20">
          <button
            onClick={() => {
              setActiveSubTab('new');
              onRefresh?.();
            }}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeSubTab === 'new'
                ? 'bg-white text-[#e7770d] shadow-md scale-[1.01]'
                : 'text-white/90 hover:text-white'
            }`}
          >
            <span>New Orders</span>
            {incomingOrders.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'new' ? 'bg-[#e7770d] text-white' : 'bg-white/30 text-white'
              }`}>
                {incomingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('accepted')}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeSubTab === 'accepted'
                ? 'bg-white text-[#e7770d] shadow-md scale-[1.01]'
                : 'text-white/90 hover:text-white'
            }`}
          >
            <span>Accepted</span>
            {ongoingActiveOrders.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'accepted' ? 'bg-[#e7770d] text-white' : 'bg-white/30 text-white'
              }`}>
                {ongoingActiveOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── 2. TAB CONTENT BODY ─── */}
      <div className="flex-1 px-4 pt-5 space-y-4">
        {activeSubTab === 'new' ? (
          /* ──── NEW ORDERS LIST ──── */
          incomingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4 shadow-inner">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">No New Orders</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-xs leading-relaxed">
                Stay online to receive instant food and quick commerce delivery requests in your area.
              </p>
              {onRefresh && (
                <button
                  onClick={() => onRefresh()}
                  className="mt-4 px-4 py-2 bg-[#e7770d] hover:bg-[#d66c08] active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow transition-all"
                >
                  Check for Orders
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {incomingOrders.map((order, idx) => {
                const orderKey = getOrderMongoId(order) || getOrderAcceptId(order) || `incoming-${idx}`;
                const isQuick = order.orderType === 'quick';
                const storeName = isQuick 
                  ? (order.sellerId?.storeName || order.sellerName || 'Quick Commerce Store')
                  : (order.restaurantName || order.restaurant_name || order.restaurantId?.restaurantName || order.restaurantId?.name || 'Restaurant');
                const storeAddress = isQuick
                  ? ([order.sellerId?.addressLine1, order.sellerId?.area, order.sellerId?.city].filter(Boolean).join(', ') || 'Store address')
                  : (order.restaurantAddress || order.restaurant_address || order.restaurantId?.location?.address || 'Restaurant address');
                
                const customerAddress = order.customerAddress || order.customer_address || order.deliveryAddress?.address || order.deliveryAddress?.street || 'Customer address';
                const customerName = order.userName || order.customerName || order.user?.name || order.deliveryAddress?.name || 'Customer';
                const customerPhone = order.userPhone || order.customerPhone || order.deliveryAddress?.phone || order.user?.phone || '';
                const storePhone = isQuick ? (order.sellerId?.ownerPhone || '') : (order.restaurantPhone || order.restaurantId?.phone || '');

                const rawEarnings = order.earnings || order.riderEarning || (order.pricing?.deliveryFee) || 40;
                const earnings = Number(rawEarnings).toFixed(2);
                const bonus = Number(order.deliveryBonusAmount || 0);
                const baseEarnings = Math.max(0, rawEarnings - bonus);
                const displayId = getOrderDisplayId(order) || `#${order.order_id || order.orderId || order._id?.slice?.(-6)}`;
                const metrics = resolveOrderMetrics(order, riderLocation);
                const isCod = !['paid', 'captured', 'authorized'].includes(String(order.payment?.status || order.paymentStatus || "").toLowerCase());
                const amountToCollect = Number(order.pricing?.total || order.amountToCollect || order.total || order.orderAmount || 0);
                const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : (Array.isArray(order.products) ? order.products : []);

                return (
                  <motion.div
                    key={orderKey}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100/80 space-y-4 relative overflow-hidden"
                  >
                    {/* Header: Type, ID & Earnings */}
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isQuick ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-[#e7770d] text-white shadow-md shadow-[#e7770d]/20'
                        }`}>
                          {isQuick ? <ShoppingBag className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                              NEW ORDER {displayId}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isQuick ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}>
                              {isQuick ? 'Quick Commerce' : 'Food'}
                            </span>
                          </div>
                          <h3 className="text-gray-900 font-extrabold text-base line-clamp-1 mt-0.5">
                            {storeName}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xl font-black text-gray-900">₹{earnings}</span>
                        {bonus > 0 ? (
                          <span className="block text-[10px] font-bold text-emerald-600">
                            ₹{Number(baseEarnings).toFixed(0)} + ₹{Number(bonus).toFixed(0)} Bonus
                          </span>
                        ) : (
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earning</span>
                        )}
                      </div>
                    </div>

                    {/* Route Metrics 4-Card Grid (Exact match to target design) */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100/80 flex items-center gap-2.5 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-emerald-700/90 font-black uppercase tracking-wider truncate">
                              To {isQuick ? 'Seller' : 'Restaurant'}
                            </span>
                            <span className="text-xs font-black text-gray-900">{metrics.pickup.distanceKm} KM</span>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100/80 flex items-center gap-2.5 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-emerald-700/90 font-black uppercase tracking-wider truncate">
                              Pickup Time
                            </span>
                            <span className="text-xs font-black text-gray-900">{metrics.pickup.etaMins} MINS</span>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100/80 flex items-center gap-2.5 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-blue-700/90 font-black uppercase tracking-wider truncate">
                              To Customer
                            </span>
                            <span className="text-xs font-black text-gray-900">{metrics.drop.distanceKm} KM</span>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100/80 flex items-center gap-2.5 shadow-xs">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-blue-700/90 font-black uppercase tracking-wider truncate">
                              Drop Time
                            </span>
                            <span className="text-xs font-black text-gray-900">{metrics.drop.etaMins} MINS</span>
                          </div>
                        </div>
                      </div>

                      {metrics.total.distanceKm !== '??' && (
                        <p className="text-center text-[11px] font-bold text-gray-400 pt-0.5">
                          Total trip ~ {metrics.total.distanceKm} KM · ~ {metrics.total.etaMins} MINS
                        </p>
                      )}
                    </div>

                    {/* Step 1: Pickup & Step 2: Drop with Google Maps and Call Actions */}
                    <div className="flex items-start gap-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white font-black">P</div>
                        <div className="w-0.5 h-14 bg-dashed border-l border-gray-300 my-0.5" />
                        <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center text-[9px] text-white font-black">D</div>
                      </div>

                      <div className="flex-1 space-y-3.5">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                              <ChefHat className="w-3.5 h-3.5" />
                              <span>{isQuick ? 'Seller Pickup' : 'Restaurant Pickup'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {storePhone && (
                                <a href={`tel:${storePhone}`} className="text-gray-500 hover:text-emerald-600 p-1 bg-white rounded-lg border border-gray-200/60 shadow-xs" title="Call Store">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {metrics.pickupMapsLink && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInAppMap(order);
                                  }}
                                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-emerald-200/60 shadow-xs cursor-pointer active:scale-95"
                                  title="Open Store on In-App Map"
                                >
                                  <Navigation className="w-3 h-3" />
                                  <span>In-App Map</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-900 text-xs font-black line-clamp-1 mt-0.5">{storeName}</p>
                          <p className="text-gray-500 text-[11px] line-clamp-2 font-medium leading-relaxed">{storeAddress}</p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Customer Drop</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {customerPhone && (
                                <a href={`tel:${customerPhone}`} className="text-gray-500 hover:text-blue-600 p-1 bg-white rounded-lg border border-gray-200/60 shadow-xs" title="Call Customer">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {metrics.dropMapsLink && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInAppMap(order);
                                  }}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-blue-200/60 shadow-xs cursor-pointer active:scale-95"
                                  title="Open Customer Drop on In-App Map"
                                >
                                  <Navigation className="w-3 h-3" />
                                  <span>In-App Map</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-900 text-xs font-black line-clamp-1 mt-0.5">{customerName}</p>
                          <p className="text-gray-500 text-[11px] line-clamp-2 font-medium leading-relaxed">{customerAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gray-50 border border-gray-200/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Payment:</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                          isCod ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-green-100 text-green-900 border border-green-200'
                        }`}>
                          {isCod ? 'Cash on Delivery (COD)' : 'Prepaid (Paid Online)'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 font-bold mr-1.5">{isCod ? 'Collect Cash:' : 'Bill Value:'}</span>
                        <span className="font-black text-gray-900">₹{amountToCollect > 0 ? amountToCollect.toFixed(0) : '0'}</span>
                      </div>
                    </div>

                    {/* Order Items Breakdown */}
                    {items.length > 0 && (
                      <div className="rounded-2xl border border-gray-200/70 bg-gray-50/70 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200/60 pb-1.5">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span>Order Items ({items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)} units)</span>
                          </span>
                          <span className="text-[9px] font-bold text-gray-400">{items.length} unique</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-start justify-between text-xs py-0.5">
                              <div className="flex-1 pr-2">
                                <span className="font-bold text-gray-800">{item.quantity || 1} × {item.name || item.title || 'Item'}</span>
                                {item.variantName && (
                                  <span className="block text-[10px] text-gray-500 font-medium">{item.variantName}</span>
                                )}
                              </div>
                              <span className="font-bold text-gray-900 shrink-0">
                                ₹{Number((item.price || item.variantPrice || 0) * (item.quantity || 1)).toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customer Delivery Note */}
                    {order.note && (
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex gap-2.5 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Customer Delivery Instructions</p>
                          <p className="text-xs font-semibold text-amber-950 mt-0.5 leading-relaxed">"{order.note}"</p>
                        </div>
                      </div>
                    )}

                    {/* Action Area: Accept & Pass Buttons or Slot Lock */}
                    <div className="pt-2">
                      {isSlotsFull ? (
                        <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 flex items-center gap-3">
                          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                          <span className="text-xs font-semibold">
                            All {maxSlots} slots in use — complete an active order to accept more
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={acceptingOrderId === orderKey || passingOrderId === orderKey}
                            onClick={async () => {
                              try {
                                setPassingOrderId(orderKey);
                                await onRejectOrder?.(order);
                              } finally {
                                setPassingOrderId(null);
                              }
                            }}
                            className="flex-1 py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-[0.98] text-gray-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-gray-200/80 cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {passingOrderId === orderKey ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                <span>Passing...</span>
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                <span>Pass</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={acceptingOrderId === orderKey || passingOrderId === orderKey}
                            onClick={async () => {
                              try {
                                setAcceptingOrderId(orderKey);
                                await onAcceptOrder?.(order);
                              } finally {
                                setAcceptingOrderId(null);
                              }
                            }}
                            className="flex-[2] py-3.5 px-5 rounded-2xl bg-[#e7770d] hover:bg-[#d66c08] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e7770d]/25 border border-[#e7770d] cursor-pointer disabled:opacity-75"
                          >
                            {acceptingOrderId === orderKey ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Accepting...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Accept Order</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* ──── ACCEPTED ORDERS LIST ──── */
          ongoingActiveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">No Active Deliveries</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-xs leading-relaxed">
                Accept new orders from the "New Orders" tab to start deliveries.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ongoingActiveOrders.map((order, idx) => {
                const orderKey = getOrderMongoId(order) || getOrderAcceptId(order) || `active-${idx}`;
                const isQuick = order.orderType === 'quick';
                const storeName = isQuick 
                  ? (order.sellerId?.storeName || order.sellerName || 'Quick Commerce Store')
                  : (order.restaurantName || order.restaurant_name || order.restaurantId?.restaurantName || order.restaurantId?.name || 'Restaurant');
                const storeAddress = isQuick
                  ? ([order.sellerId?.addressLine1, order.sellerId?.area, order.sellerId?.city].filter(Boolean).join(', ') || 'Store address')
                  : (order.restaurantAddress || order.restaurant_address || order.restaurantId?.location?.address || 'Restaurant address');
                
                const customerAddress = order.customerAddress || order.customer_address || order.deliveryAddress?.address || order.deliveryAddress?.street || 'Customer address';
                const customerName = order.userName || order.customerName || order.user?.name || order.deliveryAddress?.name || 'Customer';
                const customerPhone = order.userPhone || order.customerPhone || order.deliveryAddress?.phone || order.user?.phone || '';
                const storePhone = isQuick ? (order.sellerId?.ownerPhone || '') : (order.restaurantPhone || order.restaurantId?.phone || '');
                const displayId = getOrderDisplayId(order) || `#${order.order_id || order.orderId || order._id?.slice?.(-6)}`;
                const earnings = Number(order.earnings || order.riderEarning || order.pricing?.deliveryFee || 40).toFixed(2);
                const amountToCollect = Number(order.pricing?.total || order.amountToCollect || order.total || 0);
                const isCod = !['paid', 'captured', 'authorized'].includes(String(order.payment?.status || order.paymentStatus || "").toLowerCase());
                
                const rawStatus = String(
                  order.deliveryStatus || 
                  order.orderState?.status || 
                  order.orderStatus || 
                  order.status || 
                  'PICKING_UP'
                ).toUpperCase();

                const currentPhase = order.deliveryState?.currentPhase;
                const isAtStore = rawStatus === 'REACHED_PICKUP' || currentPhase === 'at_pickup';
                const isHeadingToStore = !isAtStore && ['PICKING_UP', 'CONFIRMED', 'PREPARING', 'PACKING', 'READY_FOR_PICKUP', 'ACCEPTED', 'CREATED'].includes(rawStatus);
                const isAtDrop = rawStatus === 'REACHED_DROP' || currentPhase === 'at_drop';
                const isHeadingToDrop = !isAtDrop && ['PICKED_UP', 'DELIVERING'].includes(rawStatus);

                const statusLabel = 
                  isAtStore ? 'At Store / Pickup' :
                  isHeadingToStore ? 'Heading to Store' :
                  isHeadingToDrop ? 'Heading to Drop' :
                  isAtDrop ? 'At Customer Location' :
                  rawStatus === 'COMPLETED' || rawStatus === 'DELIVERED' ? 'Delivered' :
                  'Picking Up';

                const isSelected = Boolean(
                  activeOrder &&
                  (getOrderMongoId(activeOrder) || getOrderAcceptId(activeOrder) || activeOrder.order_id || activeOrder.orderId || activeOrder._id) ===
                  (getOrderMongoId(order) || getOrderAcceptId(order) || order.order_id || order.orderId || order._id)
                );

                return (
                  <motion.div
                    key={orderKey}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-3xl p-5 shadow-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-[#e7770d] ring-2 ring-[#e7770d]/30' 
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      selectActiveOrder(getOrderMongoId(order) || getOrderAcceptId(order));
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isQuick ? 'bg-emerald-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md'
                        }`}>
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-gray-400">
                              ORDER {displayId}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isQuick ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {isQuick ? 'Quick' : 'Food'}
                            </span>
                          </div>
                          <h3 className="text-gray-900 font-extrabold text-base line-clamp-1 mt-0.5">
                            {storeName}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">₹{earnings}</span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="font-bold text-gray-800">{statusLabel}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenOrderMap && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenOrderMap(order);
                            }}
                            className="flex items-center gap-1 font-bold text-[11px] px-3 py-2 rounded-xl uppercase tracking-wider bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all border border-blue-200/60 shadow-xs cursor-pointer active:scale-95"
                            title="View Route on In-App Live Map"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>In-App Map</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectActiveOrder(getOrderMongoId(order) || getOrderAcceptId(order));
                          }}
                          className={`font-bold text-[11px] px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95 ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                              : 'bg-[#e7770d] hover:bg-[#d06806] text-white shadow-[#e7770d]/20'
                          }`}
                        >
                          {isSelected ? 'Active Delivery ✓' : 'Select Order'}
                        </button>
                      </div>
                    </div>

                    {/* Route Metrics Grid for Accepted Order */}
                    {(() => {
                      const activeMetrics = resolveOrderMetrics(order, riderLocation);
                      const activeItems = Array.isArray(order.items) && order.items.length > 0 ? order.items : (Array.isArray(order.products) ? order.products : []);
                      return (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-100/80 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] text-emerald-700/90 font-black uppercase tracking-wider truncate">To Store</span>
                                <span className="text-xs font-black text-gray-900">{activeMetrics.pickup.distanceKm} KM ({activeMetrics.pickup.etaMins}m)</span>
                              </div>
                            </div>
                            <div className="p-2.5 bg-blue-50/70 rounded-2xl border border-blue-100/80 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] text-blue-700/90 font-black uppercase tracking-wider truncate">To Customer</span>
                                <span className="text-xs font-black text-gray-900">{activeMetrics.drop.distanceKm} KM ({activeMetrics.drop.etaMins}m)</span>
                              </div>
                            </div>
                          </div>

                          {/* Pickup & Drop Addresses with External Navigation & Call */}
                          <div className="flex items-start gap-3 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                            <div className="flex flex-col items-center mt-1">
                              <div className="w-4 h-4 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[8px] text-white font-black">P</div>
                              <div className="w-0.5 h-10 bg-dashed border-l border-gray-300 my-0.5" />
                              <div className="w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[8px] text-white font-black">D</div>
                            </div>
                            <div className="flex-1 space-y-2 text-xs">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Pickup: {storeName}</span>
                                  <div className="flex items-center gap-1.5">
                                    {storePhone && (
                                      <a href={`tel:${storePhone}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 p-0.5 hover:text-emerald-600" title="Call Store">
                                        <Phone className="w-3 h-3" />
                                      </a>
                                    )}
                                    {activeMetrics.pickupMapsLink && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenInAppMap(order);
                                        }}
                                        className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                                        title="Open Store on In-App Map"
                                      >
                                        <Navigation className="w-2.5 h-2.5" />
                                        <span>In-App Map</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-500 text-[11px] line-clamp-1">{storeAddress}</p>
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-700">Drop: {customerName}</span>
                                  <div className="flex items-center gap-1.5">
                                    {customerPhone && (
                                      <a href={`tel:${customerPhone}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 p-0.5 hover:text-blue-600" title="Call Customer">
                                        <Phone className="w-3 h-3" />
                                      </a>
                                    )}
                                    {activeMetrics.dropMapsLink && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenInAppMap(order);
                                        }}
                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                        title="Open Customer Drop on In-App Map"
                                      >
                                        <Navigation className="w-2.5 h-2.5" />
                                        <span>In-App Map</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-gray-500 text-[11px] line-clamp-1">{customerAddress}</p>
                              </div>
                            </div>
                          </div>

                          {/* Payment collection pill */}
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-200/60 text-xs">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isCod ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'
                            }`}>
                              {isCod ? 'Cash on Delivery (COD)' : 'Prepaid'}
                            </span>
                            <span className="text-[11px] font-bold text-gray-700">
                              {isCod ? `Collect: ₹${amountToCollect.toFixed(0)}` : 'No Cash to Collect'}
                            </span>
                          </div>

                          {/* Items count & list preview */}
                          {activeItems.length > 0 && (
                            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-2.5 text-xs">
                              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                                Items ({activeItems.reduce((s, it) => s + Number(it.quantity || 1), 0)}):
                              </span>
                              <p className="text-gray-800 font-semibold line-clamp-2">
                                {activeItems.map((it) => `${it.quantity || 1} × ${it.name || it.title || 'Item'}`).join(', ')}
                              </p>
                            </div>
                          )}

                          {/* Drop Instructions if available */}
                          {order.note && (
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/60 text-xs flex items-start gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-amber-950 font-medium text-[11px]">Note: "{order.note}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Phase 1: Heading to Store -> Slide to Arrive at Store */}
                    {isHeadingToStore && (
                      <div className="pt-3 mt-1 border-t border-gray-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-1">
                          <span className="text-emerald-700 font-bold">Step 1: Store Arrival</span>
                          <span className="text-gray-400">Slide when you arrive</span>
                        </div>
                        <ActionSlider
                          label="Slide to Arrive at Store"
                          successLabel="Arrived at Store ✓"
                          onConfirm={async () => {
                            await handleReachPickup(order);
                          }}
                          color="bg-green-600"
                        />
                      </div>
                    )}

                    {/* Phase 2: Arrived at Store -> Request OTP & Enter Pickup OTP */}
                    {isAtStore && (
                      <div className="pt-3 mt-1 border-t border-gray-100">
                        {!requestedOtpIds[orderKey] ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold mb-1">
                              <span>Arrived at Store ✓</span>
                              <span className="text-gray-400 font-semibold">Step 2: Pickup OTP</span>
                            </div>
                            <button
                              type="button"
                              disabled={requestingOtpId === orderKey}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestOtp(order);
                              }}
                              className="w-full py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-[#15498b]/20 bg-[#15498b] hover:bg-[#103a70] text-white active:scale-[0.98] cursor-pointer disabled:opacity-60"
                            >
                              {requestingOtpId === orderKey ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Requesting OTP from {isQuick ? 'Seller' : 'Restaurant'}...</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-4 h-4" />
                                  <span>Request OTP from {isQuick ? 'Seller' : 'Restaurant'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Enter 4-Digit Pickup OTP
                              </span>
                              <button
                                type="button"
                                disabled={requestingOtpId === orderKey}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestOtp(order);
                                }}
                                className="text-[10px] font-bold text-orange-700 hover:text-orange-950 underline cursor-pointer disabled:opacity-50"
                              >
                                {requestingOtpId === orderKey ? 'Sending...' : '🔔 Resend OTP'}
                              </button>
                            </div>

                            <input
                              type="number"
                              placeholder="••••"
                              maxLength={4}
                              value={pickupOtpMap[orderKey] || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setPickupOtpMap((prev) => ({ ...prev, [orderKey]: val }));
                              }}
                              className="w-full py-3 px-4 bg-white border border-orange-300 rounded-xl text-center text-2xl font-black tracking-[0.35em] text-gray-900 outline-none focus:ring-2 focus:ring-[#e7770d]/30"
                            />

                            <button
                              type="button"
                              disabled={
                                (pickupOtpMap[orderKey] || '').length !== 4 ||
                                pickingUpOrderKey === orderKey
                              }
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleConfirmPickup(order, pickupOtpMap[orderKey]);
                              }}
                              className="w-full py-3 px-4 rounded-xl bg-[#e7770d] hover:bg-[#d66c08] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                            >
                              {pickingUpOrderKey === orderKey ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Verifying & Picking Up...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Confirm & Pick Up Order</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Phase 3: Heading to Drop -> Slide to Arrive at Customer */}
                    {isHeadingToDrop && (
                      <div className="pt-3 mt-1 border-t border-gray-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-xs text-blue-700 font-bold mb-1">
                          <span>Heading to Customer Drop</span>
                          <span className="text-gray-400 font-semibold">Step 3: Arrive at Drop</span>
                        </div>
                        <ActionSlider
                          label="Slide to Arrive at Customer"
                          successLabel="Arrived at Customer ✓"
                          onConfirm={async () => {
                            await handleReachDrop(order);
                          }}
                          color="bg-blue-600"
                        />
                      </div>
                    )}

                    {/* Phase 4: Arrived at Drop -> Enter Customer Handover / Delivery OTP Inline */}
                    {isAtDrop && (
                      <div className="pt-3 mt-1 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Enter 4-Digit Customer OTP
                            </span>
                            <span className="text-[10px] font-bold text-orange-700">
                              Ask Customer for Code
                            </span>
                          </div>

                          {order.note && (
                            <div className="text-[11px] bg-white/90 p-2.5 rounded-xl border border-orange-200 text-gray-700">
                              <span className="font-bold text-orange-900">Note: </span>
                              <span>"{order.note}"</span>
                            </div>
                          )}

                          {isCod && amountToCollect > 0 && (
                            <div className="bg-amber-100/90 border border-amber-300 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-bold text-amber-900">
                              <span>💵 Cash on Delivery (COD)</span>
                              <span className="font-extrabold text-sm">Collect ₹{amountToCollect}</span>
                            </div>
                          )}

                          <input
                            type="number"
                            placeholder="••••"
                            maxLength={4}
                            value={dropOtpMap[orderKey] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setDropOtpMap((prev) => ({ ...prev, [orderKey]: val }));
                            }}
                            className="w-full py-3 px-4 bg-white border border-orange-300 rounded-xl text-center text-2xl font-black tracking-[0.35em] text-gray-900 outline-none focus:ring-2 focus:ring-[#e7770d]/30"
                          />

                          <button
                            type="button"
                            disabled={
                              (dropOtpMap[orderKey] || '').length !== 4 ||
                              completingOrderKey === orderKey
                            }
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleConfirmDelivery(order, dropOtpMap[orderKey]);
                            }}
                            className="w-full py-3 px-4 rounded-xl bg-[#e7770d] hover:bg-[#d66c08] active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                          >
                            {completingOrderKey === orderKey ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verifying & Completing Delivery...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>{isCod && amountToCollect > 0 ? "Verify OTP & Confirm Cash Received" : "Verify Code & Complete Delivery"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
