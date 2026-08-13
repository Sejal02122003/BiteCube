import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import io from 'socket.io-client';
import {
  Banknote, ChevronDown, ChevronUp, Clock3, CreditCard, Loader2,
  KeyRound, MapPin, Package, Phone, ShoppingBag, UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import alertSound from '@food/assets/audio/alert.mp3';
import { getCurrentUser, getModuleToken } from '@food/utils/auth';
import { isValidSocketOrigin, resolveSocketOrigin } from '@food/utils/socketOrigin';
import { acceptOrder, fetchOrderById, fetchOrders, rejectOrder } from '../services/orderService';

const getOrderKey = (value = {}) => String(
  value?._id || value?.orderMongoId || value?.order_mongo_id || value?.orderId || value?.order_id || value?.id || '',
).trim();

const isPendingOrder = (value) => ['created', 'confirmed'].includes(String(value?.orderStatus || value?.status || '').toLowerCase());
const unwrapOrder = (response) => response?.data?.order || response?.order || response?.data || null;
const unwrapOrders = (response) => response?.data?.orders || response?.orders || [];
const formatMoney = (value) => `\u20B9${Number(value || 0).toFixed(2)}`;
const addressText = (order) => [
  order?.deliveryAddress?.street,
  order?.deliveryAddress?.additionalDetails,
  order?.deliveryAddress?.city,
  order?.deliveryAddress?.state,
  order?.deliveryAddress?.zipCode,
].filter(Boolean).join(', ');

export default function QuickOrderAlert() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [busyAction, setBusyAction] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pickupOtpReveal, setPickupOtpReveal] = useState(() => {
    try {
      const saved = localStorage.getItem('quick_seller_pickup_otp_reveal');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const soundTimerRef = useRef(null);
  const recentlyHandledRef = useRef(new Map());
  const dismissedOtpKeyRef = useRef(localStorage.getItem('quick_seller_dismissed_pickup_otp') || '');
  const activeOrder = queue[0] || null;

  const showPickupOtp = useCallback((incoming) => {
    if (!incoming?.otp || (incoming?.orderType && incoming.orderType !== 'quick')) return;
    const normalized = { ...incoming, otp: String(incoming.otp), orderType: 'quick' };
    const revealKey = `${normalized.orderMongoId || normalized.orderId}:${normalized.requestedAt || ''}`;
    if (dismissedOtpKeyRef.current === revealKey) return;
    setPickupOtpReveal(normalized);
    try {
      localStorage.setItem('quick_seller_pickup_otp_reveal', JSON.stringify(normalized));
    } catch {}
    if (navigator.vibrate) navigator.vibrate([250, 100, 250]);
  }, []);

  const clearPickupOtp = useCallback(() => {
    setPickupOtpReveal((current) => {
      const revealKey = current
        ? `${current.orderMongoId || current.orderId}:${current.requestedAt || ''}`
        : '';
      dismissedOtpKeyRef.current = revealKey;
      try {
        if (revealKey) localStorage.setItem('quick_seller_dismissed_pickup_otp', revealKey);
      } catch {}
      return null;
    });
    try {
      localStorage.removeItem('quick_seller_pickup_otp_reveal');
    } catch {}
  }, []);

  const seller = useMemo(() => getCurrentUser('restaurant') || {}, []);
  const sellerId = String(seller?._id || seller?.id || seller?.sellerId || '').trim();

  const stopSound = useCallback(() => {
    if (soundTimerRef.current) clearInterval(soundTimerRef.current);
    soundTimerRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const playSound = useCallback(() => {
    const play = () => {
      if (!audioRef.current) audioRef.current = new Audio(alertSound);
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1;
      audioRef.current.play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
    };
    play();
    if (!soundTimerRef.current) soundTimerRef.current = setInterval(play, 4500);
  }, []);

  useEffect(() => {
    if (activeOrder) playSound();
    else stopSound();
    return stopSound;
  }, [activeOrder, playSound, stopSound]);

  const enqueue = useCallback((incoming, source = 'unknown') => {
    if (!incoming || incoming?.orderType === 'food') return;
    const key = getOrderKey(incoming);
    if (!key) return;
    const now = Date.now();
    const lastSeen = recentlyHandledRef.current.get(key) || 0;
    if (now - lastSeen < 8000 && source !== 'socket') return;
    recentlyHandledRef.current.set(key, now);
    setQueue((current) => {
      if (current.some((entry) => getOrderKey(entry) === key)) return current;
      return [...current, { ...incoming, orderType: 'quick', alertSource: source }];
    });
  }, []);

  const removeFromQueue = useCallback((orderOrId) => {
    const key = typeof orderOrId === 'string' ? orderOrId : getOrderKey(orderOrId);
    setQueue((current) => current.filter((entry) => getOrderKey(entry) !== key));
  }, []);

  const loadOrder = useCallback(async (orderId, source) => {
    if (!orderId) return;
    try {
      const response = await fetchOrderById(orderId);
      const order = unwrapOrder(response);
      if (order && isPendingOrder(order)) enqueue({ ...order, orderType: 'quick' }, source);
    } catch (error) {
      if (![400, 404].includes(error?.response?.status)) {
        console.warn('Quick order fallback fetch failed:', error?.message || error);
      }
    }
  }, [enqueue]);

  const recoverPendingOrders = useCallback(async (source = 'poll') => {
    try {
      const response = await fetchOrders({ status: 'all', page: 1, limit: 30 });
      const orders = unwrapOrders(response);
      orders.filter(isPendingOrder).forEach((order) => enqueue({ ...order, orderType: 'quick' }, source));
      const otpOrder = orders.find((order) => {
        const requestedAt = order?.deliveryVerification?.pickupOtp?.requestedAt;
        const verified = order?.deliveryVerification?.pickupOtp?.verified;
        if (!requestedAt || verified || !order?.pickupOtp) return false;
        return Date.now() - new Date(requestedAt).getTime() <= 15 * 60 * 1000;
      });
      if (otpOrder) {
        showPickupOtp({
          type: 'pickup_otp_reveal',
          orderId: otpOrder.order_id || otpOrder.orderId,
          orderMongoId: otpOrder._id,
          otp: otpOrder.pickupOtp,
          orderType: 'quick',
          requestedAt: otpOrder.deliveryVerification.pickupOtp.requestedAt,
        });
      }
    } catch (error) {
      if (error?.response?.status !== 401) console.warn('Quick incoming-order recovery failed:', error?.message || error);
    }
  }, [enqueue, showPickupOtp]);

  useEffect(() => {
    const token = getModuleToken('restaurant');
    const origin = resolveSocketOrigin();
    if (!token || !isValidSocketOrigin(origin)) return undefined;

    const socket = io(origin, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setSocketConnected(true);
      window.quickSellerSocketConnected = true;
      if (sellerId) socket.emit('join-quick-seller', sellerId);
      recoverPendingOrders('socket-reconnect');
    };
    const onDisconnect = () => {
      setSocketConnected(false);
      window.quickSellerSocketConnected = false;
    };
    const onOrder = (payload) => enqueue({ ...payload, orderType: 'quick' }, 'socket');
    const onPickupOtp = (payload) => showPickupOtp(payload);
    const onStatus = (payload) => {
      const status = String(payload?.orderStatus || payload?.status || '').toLowerCase();
      if (!['created', 'confirmed'].includes(status)) removeFromQueue(payload);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on('new_quick_order', onOrder);
    socket.on('new_order', onOrder);
    socket.on('pickup_otp_reveal', onPickupOtp);
    socket.on('order_status_update', onStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      socket.off('new_quick_order', onOrder);
      socket.off('new_order', onOrder);
      socket.off('pickup_otp_reveal', onPickupOtp);
      socket.off('order_status_update', onStatus);
      socket.disconnect();
      socketRef.current = null;
      window.quickSellerSocketConnected = false;
    };
  }, [enqueue, recoverPendingOrders, removeFromQueue, sellerId, showPickupOtp]);

  useEffect(() => {
    const onFcmAlert = (event) => {
      const detail = event?.detail || {};
      const embedded = detail?.payload?.data?.order;
      if (embedded && typeof embedded === 'object') enqueue(embedded, 'fcm');
      const orderId = detail.orderMongoId || detail.orderId || detail?.payload?.data?.orderMongoId || detail?.payload?.data?.orderId;
      loadOrder(orderId, 'fcm');
    };
    window.addEventListener('quick-seller-fcm-order-alert', onFcmAlert);
    return () => window.removeEventListener('quick-seller-fcm-order-alert', onFcmAlert);
  }, [enqueue, loadOrder]);

  useEffect(() => {
    const onPickupOtp = (event) => showPickupOtp(event?.detail || {});
    window.addEventListener('quick-seller-pickup-otp-reveal', onPickupOtp);
    return () => window.removeEventListener('quick-seller-pickup-otp-reveal', onPickupOtp);
  }, [showPickupOtp]);

  useEffect(() => {
    recoverPendingOrders('initial');
    const timer = setInterval(() => {
      if (!socketConnected || document.visibilityState === 'visible') recoverPendingOrders(socketConnected ? 'safety-poll' : 'socket-fallback');
    }, socketConnected ? 30000 : 8000);
    const onVisible = () => { if (document.visibilityState === 'visible') recoverPendingOrders('foreground'); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [recoverPendingOrders, socketConnected]);

  const act = async (action) => {
    if (!activeOrder || busyAction) return;
    const id = getOrderKey(activeOrder);
    try {
      setBusyAction(action);
      stopSound();
      if (action === 'accept') {
        await acceptOrder(id);
        toast.success('Quick order accepted. Start packing the products.');
      } else {
        await rejectOrder(id, 'Rejected by seller');
        toast.success('Quick order rejected');
      }
      removeFromQueue(id);
      window.dispatchEvent(new CustomEvent('quickSellerOrderUpdated', { detail: { orderId: id, action } }));
      navigate('/quick/seller/orders');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update Quick order');
      if ([400, 404, 409].includes(error?.response?.status)) removeFromQueue(id);
    } finally {
      setBusyAction('');
    }
  };

  const paymentMethod = String(activeOrder?.payment?.method || activeOrder?.paymentMethod || 'cash').toLowerCase();
  const customerPhone = activeOrder?.customerPhone || activeOrder?.deliveryAddress?.phone || activeOrder?.userId?.phone || '';

  return (
    <>
    <AnimatePresence>
      {pickupOtpReveal ? (
        <motion.div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl" initial={{ scale: .9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .9, opacity: 0 }}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <KeyRound className="h-8 w-8" />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Delivery partner arrived</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Share Pickup OTP</h2>
            <p className="mt-2 text-sm text-slate-500">Quick order #{pickupOtpReveal.orderId || pickupOtpReveal.orderMongoId}</p>
            <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Pickup verification OTP</p>
              <p className="mt-2 text-4xl font-black tracking-[0.28em] text-emerald-800">{pickupOtpReveal.otp}</p>
            </div>
            <p className="mt-4 text-xs font-medium text-slate-500">Hand over all products first, then tell this code to the delivery partner.</p>
            <button type="button" onClick={clearPickupOtp} className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-bold text-white">Got it</button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    <AnimatePresence>
      {activeOrder ? (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 pb-[90px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="flex max-h-[86vh] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white p-1 shadow-2xl" initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" /><h2 className="truncate text-base font-black">#{activeOrder.order_id || activeOrder.orderId || 'Quick order'}</h2>{queue.length > 1 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">+{queue.length - 1} more</span> : null}</div><p className="mt-0.5 text-xs font-semibold text-emerald-600">NEW QUICK ORDER · {activeOrder.alertSource === 'fcm' ? 'Push fallback' : activeOrder.alertSource === 'socket-fallback' ? 'Connection fallback' : 'Live'}</p></div>
              <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />{socketConnected ? 'SOCKET' : 'FCM/POLL'}</div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white"><ShoppingBag className="h-5 w-5" /></span><div className="flex-1"><p className="font-bold">{activeOrder.items?.[0]?.name || 'New Quick order'}</p><p className="text-xs text-slate-500">{activeOrder.createdAt ? new Date(activeOrder.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p></div><strong className="text-lg">{formatMoney(activeOrder.pricing?.total)}</strong></div>

              <button onClick={() => setDetailsExpanded((value) => !value)} className="flex w-full items-center justify-between border-b py-2 text-left"><span className="flex items-center gap-2 font-bold"><Package className="h-5 w-5 text-emerald-600" />Products <small className="font-medium text-slate-500">{activeOrder.items?.length || 0} items</small></span>{detailsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              <AnimatePresence>{detailsExpanded ? <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="space-y-3 py-3">{activeOrder.items?.map((item, index) => <div key={`${item.itemId || item.name}-${index}`} className="flex items-start gap-3">{item.image ? <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" /> : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}<div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.quantity} × {item.name}</p>{item.variantName ? <p className="text-xs text-slate-500">Variant: {item.variantName}</p> : null}</div><span className="text-sm font-semibold">{formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}</span></div>)}</div></motion.div> : null}</AnimatePresence>

              <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3"><div className="flex gap-3"><UserRound className="mt-0.5 h-4 w-4 text-slate-500" /><div><p className="text-xs font-bold uppercase text-slate-400">Customer</p><p className="text-sm font-semibold">{activeOrder.customerName || activeOrder.deliveryAddress?.fullName || 'Customer'}</p></div></div><div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-slate-500" /><div><p className="text-xs font-bold uppercase text-slate-400">Deliver to</p><p className="text-sm font-medium text-slate-700">{addressText(activeOrder) || 'Address unavailable'}</p></div></div>{customerPhone ? <a href={`tel:${String(customerPhone).replace(/[^\d+]/g, '')}`} className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 text-slate-500" /><span className="text-sm font-semibold text-emerald-700">{customerPhone}</span></a> : null}</div>

              <div className="mt-3 flex items-center justify-between border-y py-2.5"><span className="flex items-center gap-2 text-sm font-semibold">{paymentMethod === 'cash' ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}Payment</span><span className={`text-sm font-bold ${paymentMethod === 'cash' ? 'text-amber-600' : 'text-emerald-600'}`}>{paymentMethod === 'cash' ? 'Cash on Delivery' : 'Paid Online'}</span></div>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" />Accept the order to start packing and notify delivery partners.</p>
            </div>

            <footer className="grid grid-cols-2 gap-3 border-t bg-white p-4"><button disabled={Boolean(busyAction)} onClick={() => act('reject')} className="rounded-xl border border-rose-200 py-3.5 font-bold text-rose-600 disabled:opacity-50">{busyAction === 'reject' ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Reject'}</button><button disabled={Boolean(busyAction)} onClick={() => act('accept')} className="rounded-xl bg-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-900/15 disabled:opacity-50">{busyAction === 'accept' ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Accept & pack'}</button></footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}
