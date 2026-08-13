import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Banknote, Check, CheckCircle2, ChevronRight, CreditCard,
  Loader2, MapPin, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag,
  Sparkles, Trash2, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getMediaUrl } from '@/shared/utils/media';
import { publicAPI } from '@food/api';
import { useProfile } from '@food/context/ProfileContext';
import { useLocationSelector } from '@food/components/user/UserLayout';
import { getCurrentUser, isModuleAuthenticated } from '@food/utils/auth';
import { readStoredUserLocation } from '@food/utils/locationPersistence';
import { initRazorpayPayment } from '@food/utils/razorpay';
import { useQuickCart } from '../context/QuickCartContext';
import {
  calculateQuickOrder,
  cancelQuickOrder,
  placeQuickOrder,
  verifyQuickOrderPayment,
} from '../services/orderService';

const money = (value) => `\u20B9${Number(value || 0).toFixed(2)}`;
const normalizeAddress = (source = {}, user = {}, location = {}) => ({
  label: source.label === 'Office' ? 'Office' : source.label === 'Other' ? 'Other' : 'Home',
  fullName: source.fullName || source.name || user.name || '',
  phone: source.phone || user.phone || '',
  street: source.street || source.address || source.formattedAddress || location.formattedAddress || location.address || '',
  additionalDetails: source.additionalDetails || source.landmark || '',
  city: source.city || location.city || location.area || '',
  state: source.state || location.state || '',
  zipCode: source.zipCode || source.pincode || location.pincode || location.zipCode || '',
});

const PaymentOption = ({ active, icon: Icon, title, subtitle, onClick }) => (
  <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></span>
    <span className="flex-1"><strong className="block text-sm text-slate-900">{title}</strong><span className="text-xs text-slate-500">{subtitle}</span></span>
    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>{active ? <Check className="h-3 w-3" /> : null}</span>
  </button>
);

export default function QuickCartPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart } = useQuickCart();
  const { getDefaultAddress } = useProfile();
  const { openLocationSelector } = useLocationSelector();
  const user = getCurrentUser('user') || {};
  const storedLocation = readStoredUserLocation() || {};
  const [address, setAddress] = useState(() => normalizeAddress(getDefaultAddress?.(), user, storedLocation));
  const [editingAddress, setEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [showPlacing, setShowPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState('');
  const [serverPricing, setServerPricing] = useState(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [maxCodAmount, setMaxCodAmount] = useState(0);
  const idempotencyRef = useRef('');

  useEffect(() => {
    const latest = normalizeAddress(getDefaultAddress?.(), user, readStoredUserLocation() || {});
    setAddress((previous) => ({ ...previous, ...Object.fromEntries(Object.entries(latest).filter(([, value]) => value)) }));
  }, [getDefaultAddress, user.name, user.phone]);

  useEffect(() => {
    publicAPI.getBusinessSettings().then((response) => {
      const settings = response?.data?.data || {};
      setOnlineOnly(Boolean(settings.onlinePaymentOnly));
      setMaxCodAmount(Number(settings.maxCodAmount || 0));
      if (settings.onlinePaymentOnly) setPaymentMethod('razorpay');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cart.length) return;
    let active = true;
    const timer = setTimeout(() => {
      calculateQuickOrder(cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })))
        .then((response) => { if (active) setServerPricing(response?.data?.pricing || response?.pricing || null); })
        .catch((err) => { if (active) setError(err?.response?.data?.message || 'Some cart items need attention'); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [cart]);

  const localSubtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [cart]);
  const pricing = serverPricing || {
    subtotal: localSubtotal,
    deliveryFee: localSubtotal >= 499 ? 0 : 30,
    platformFee: cart.length ? 5 : 0,
    tax: 0,
    total: localSubtotal + (localSubtotal >= 499 ? 0 : 30) + (cart.length ? 5 : 0),
  };
  const codUnavailable = onlineOnly || (maxCodAmount > 0 && Number(pricing.total || 0) > maxCodAmount);

  useEffect(() => {
    if (codUnavailable && paymentMethod === 'cash') setPaymentMethod('razorpay');
  }, [codUnavailable, paymentMethod]);

  const openAddress = () => {
    try { openLocationSelector(); } catch { setEditingAddress(true); }
  };

  const finalizeSuccess = (order) => {
    setPlacedOrder(order);
    clearCart();
    window.dispatchEvent(new CustomEvent('order-placed', { detail: { ...order, orderType: 'quick' } }));
    setShowSuccess(true);
  };

  const payOnline = async (order, razorpay) => new Promise((resolve, reject) => {
    let settled = false;
    initRazorpayPayment({
      key: razorpay.key,
      amount: razorpay.amount,
      currency: razorpay.currency || 'INR',
      order_id: razorpay.orderId,
      name: 'BiteCube Quick',
      description: `Quick order ${order.order_id || order._id}`,
      prefill: { name: address.fullName, email: user.email || '', contact: address.phone },
      theme: { color: '#059669' },
      handler: async (response) => {
        if (settled) return;
        settled = true;
        try {
          const verified = await verifyQuickOrderPayment({
            orderId: order._id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          resolve(verified?.data?.order || verified?.order || order);
        } catch (verifyError) { reject(verifyError); }
      },
      onError: async (paymentError) => {
        if (settled) return;
        settled = true;
        try { await cancelQuickOrder(order._id, 'Online payment failed'); } catch {}
        reject(new Error(paymentError?.description || 'Online payment failed'));
      },
      onClose: async () => {
        if (settled) return;
        settled = true;
        try { await cancelQuickOrder(order._id, 'Payment window closed by customer'); } catch {}
        reject(new Error('Payment was cancelled'));
      },
    }).catch(async (loadError) => {
      if (!settled) {
        settled = true;
        try { await cancelQuickOrder(order._id, 'Payment gateway could not be opened'); } catch {}
        reject(loadError);
      }
    });
  });

  const placeOrder = async () => {
    if (!isModuleAuthenticated('user')) {
      navigate('/user/auth/login', { state: { from: '/quick/cart' } });
      return;
    }
    if (!address.street.trim() || !address.city.trim() || !address.state.trim() || !address.phone.trim()) {
      setError('Please select or enter a complete delivery address and phone number.');
      setEditingAddress(true);
      return;
    }
    if (codUnavailable && paymentMethod === 'cash') {
      setError('Cash on Delivery is unavailable for this order. Select Online Payment.');
      return;
    }
    try {
      setPlacing(true);
      setShowPlacing(true);
      setError('');
      const latestLocation = readStoredUserLocation() || storedLocation;
      const location = latestLocation.latitude && latestLocation.longitude
        ? { type: 'Point', coordinates: [Number(latestLocation.longitude), Number(latestLocation.latitude)] }
        : undefined;
      if (!idempotencyRef.current) idempotencyRef.current = `quick-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await placeQuickOrder({
        items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
        deliveryAddress: { ...address, location },
        customerName: address.fullName,
        customerPhone: address.phone,
        paymentMethod,
      }, idempotencyRef.current);
      const order = response?.data?.order || response?.order;
      const razorpay = response?.data?.razorpay || response?.razorpay;
      if (!order?._id) throw new Error('Order id was not returned');
      if (paymentMethod === 'razorpay') {
        if (!razorpay?.orderId || !razorpay?.key) throw new Error('Online payment could not be initialized');
        setShowPlacing(false);
        const paidOrder = await payOnline(order, razorpay);
        finalizeSuccess(paidOrder);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 450));
        finalizeSuccess(order);
      }
      idempotencyRef.current = '';
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not place Quick order');
      toast.error(err?.response?.data?.message || err.message || 'Could not place Quick order');
      idempotencyRef.current = '';
    } finally {
      setPlacing(false);
      setShowPlacing(false);
    }
  };

  if (!cart.length && !showSuccess) return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-8 text-slate-900">
      <button onClick={() => navigate(-1)} className="rounded-full bg-white p-3 shadow-sm"><ArrowLeft /></button>
      <div className="mx-auto mt-24 max-w-md text-center"><span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"><ShoppingBag className="h-12 w-12 text-emerald-600" /></span><h1 className="mt-6 text-2xl font-bold">Your Quick cart is empty</h1><p className="mt-2 text-sm text-slate-500">Add daily essentials and they will appear here.</p><button onClick={() => navigate('/')} className="mt-7 rounded-xl bg-emerald-600 px-7 py-3.5 font-bold text-white">Browse Quick products</button></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-32 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4"><button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-slate-100"><ArrowLeft /></button><div className="flex-1"><h1 className="text-xl font-bold">Your cart</h1><p className="text-xs font-semibold text-emerald-600">{cart[0]?.sellerName || 'Quick delivery'} · {cart.length} product{cart.length === 1 ? '' : 's'}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">QUICK</span></div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50"><MapPin className="h-5 w-5 text-emerald-600" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Delivery address</h2><button onClick={openAddress} className="text-xs font-bold text-emerald-600">CHANGE</button></div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{[address.street, address.additionalDetails, address.city, address.state, address.zipCode].filter(Boolean).join(', ') || 'Select a delivery address'}</p><p className="mt-1 text-xs font-semibold text-slate-600">{address.fullName || 'Customer'} · {address.phone || 'Add phone number'}</p></div></div>
            <button onClick={() => setEditingAddress((value) => !value)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-500">Enter address manually <ChevronRight className={`h-3.5 w-3.5 transition ${editingAddress ? 'rotate-90' : ''}`} /></button>
            {editingAddress ? <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">{[
              ['fullName', 'Full name'], ['phone', 'Phone number'], ['street', 'House / street address'], ['additionalDetails', 'Flat, floor, landmark'], ['city', 'City'], ['state', 'State'], ['zipCode', 'PIN code'],
            ].map(([key, label]) => <label key={key} className={key === 'street' || key === 'additionalDetails' ? 'sm:col-span-2' : ''}><span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span><input value={address[key]} onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></label>)}</div> : null}
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3"><h2 className="font-bold">Items from {cart[0]?.sellerName || 'seller'}</h2></div>
            {cart.map((item) => <div key={item.lineItemId} className="flex gap-3 border-b border-slate-100 p-4 last:border-0"><img src={getMediaUrl(item.image)} alt={item.name} className="h-20 w-20 rounded-xl bg-slate-50 object-contain" /><div className="min-w-0 flex-1"><p className="line-clamp-2 font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.variantName || item.packSize}</p><div className="mt-2 flex items-center gap-2"><strong>{money(item.price)}</strong>{Number(item.originalPrice) > Number(item.price) ? <span className="text-xs text-slate-400 line-through">{money(item.originalPrice)}</span> : null}</div></div><div className="flex flex-col items-end justify-between"><button onClick={() => removeFromCart(item.productId, item.variantId)} className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button><div className="flex items-center rounded-lg border border-emerald-500 text-emerald-700"><button onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)} className="p-2"><Minus className="h-3.5 w-3.5" /></button><span className="min-w-7 text-center text-sm font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="p-2"><Plus className="h-3.5 w-3.5" /></button></div></div></div>)}
          </section>

          <section className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 p-4 text-white shadow-sm"><Sparkles className="h-7 w-7" /><div><p className="font-bold">Fresh essentials, delivered quickly</p><p className="text-xs text-emerald-100">Stock and prices are rechecked securely before ordering.</p></div></section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Bill details</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-600">Item total</span><span>{money(pricing.subtotal)}</span></div><div className="flex justify-between"><span className="text-slate-600">Delivery fee</span><span className={Number(pricing.deliveryFee) ? '' : 'font-semibold text-emerald-600'}>{Number(pricing.deliveryFee) ? money(pricing.deliveryFee) : 'FREE'}</span></div><div className="flex justify-between"><span className="text-slate-600">Platform fee</span><span>{money(pricing.platformFee)}</span></div>{Number(pricing.tax) > 0 ? <div className="flex justify-between"><span className="text-slate-600">Taxes</span><span>{money(pricing.tax)}</span></div> : null}<div className="flex justify-between border-t border-dashed pt-4 text-lg font-bold"><span>To pay</span><span>{money(pricing.total)}</span></div></div><p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700"><ShieldCheck className="h-4 w-4" />Safe and secure payments</p></section>
          {error ? <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(15,23,42,.08)]"><div className="mx-auto flex max-w-6xl items-center gap-3"><button onClick={() => setShowPaymentSheet(true)} className="min-w-[125px] rounded-xl bg-slate-50 px-3 py-2.5 text-left"><span className="block text-[10px] font-bold uppercase text-slate-400">Pay using</span><span className="flex items-center gap-1 text-sm font-bold">{paymentMethod === 'razorpay' ? 'Online' : 'Cash'} <ChevronRight className="h-3.5 w-3.5" /></span></button><button onClick={placeOrder} disabled={placing} className="flex min-h-14 flex-1 items-center justify-between rounded-xl bg-emerald-600 px-5 text-white shadow-lg shadow-emerald-900/15 disabled:opacity-60"><span><span className="block text-xs text-emerald-100">{money(pricing.total)}</span><strong>{placing ? 'Please wait...' : paymentMethod === 'razorpay' ? 'Pay & place order' : 'Place order'}</strong></span>{placing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight />}</button></div></div>

      <AnimatePresence>{showPaymentSheet ? <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentSheet(false)}><motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold">Choose payment</h2><p className="text-sm text-slate-500">Amount payable {money(pricing.total)}</p></div><button onClick={() => setShowPaymentSheet(false)} className="rounded-full bg-slate-100 p-2"><X className="h-5 w-5" /></button></div><div className="space-y-3"><PaymentOption active={paymentMethod === 'razorpay'} icon={CreditCard} title="Pay online" subtitle="UPI, cards, netbanking and wallets" onClick={() => { setPaymentMethod('razorpay'); setShowPaymentSheet(false); }} />{!codUnavailable ? <PaymentOption active={paymentMethod === 'cash'} icon={Banknote} title="Cash on Delivery" subtitle="Pay the delivery partner at your door" onClick={() => { setPaymentMethod('cash'); setShowPaymentSheet(false); }} /> : <p className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">Cash on Delivery is unavailable for this order.</p>}</div></motion.div></motion.div> : null}</AnimatePresence>

      <AnimatePresence>{showPlacing ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-white/95"><div className="text-center"><motion.span animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"><PackageCheck className="h-12 w-12 text-emerald-600" /></motion.span><h2 className="mt-6 text-2xl font-bold">Placing your Quick order</h2><p className="mt-2 text-slate-500">Confirming products, price and seller...</p></div></motion.div> : null}</AnimatePresence>

      <AnimatePresence>{showSuccess ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-white p-6"><motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="w-full max-w-sm text-center"><span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-14 w-14 text-emerald-600" /></span><h1 className="mt-6 text-3xl font-black">Order confirmed!</h1><p className="mt-2 text-slate-500">Your Quick order has been sent to {placedOrder?.sellerId?.storeName || cart[0]?.sellerName || 'the seller'}.</p><div className="mt-6 rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Order ID</p><p className="mt-1 text-lg font-black">#{placedOrder?.order_id || placedOrder?.orderId}</p></div><button onClick={() => navigate(`/quick/orders/${placedOrder?._id}?confirmed=true`, { replace: true, state: { order: placedOrder } })} className="mt-6 w-full rounded-xl bg-emerald-600 py-4 font-bold text-white">Track order</button><button onClick={() => navigate('/', { replace: true })} className="mt-3 w-full py-3 text-sm font-bold text-slate-500">Continue shopping</button></motion.div></motion.div> : null}</AnimatePresence>
    </div>
  );
}
