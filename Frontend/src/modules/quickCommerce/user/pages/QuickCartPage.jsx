import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Banknote, Check, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Copy, CreditCard, FileText, Loader2, Mail, MapPin, MessageCircle,
  Minus, PackageCheck, Phone, Plus, Send, Share2, ShieldCheck, ShoppingBag,
  Sparkles, Trash2, Utensils, Wallet, X, Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

import { getMediaUrl } from '@/shared/utils/media';
import { publicAPI } from '@food/api';
import { useProfile } from '@food/context/ProfileContext';
import { useLocationSelector } from '@food/components/user/UserLayout';
import { useAppLocation } from '@food/hooks/useAppLocation';
import { useCompanyName } from '@food/hooks/useCompanyName';
import { getCurrentUser, isModuleAuthenticated } from '@food/utils/auth';
import {
  readDeliveryAddressMode,
  readStoredUserLocation,
} from '@food/utils/locationPersistence';
import { initRazorpayPayment } from '@food/utils/razorpay';
import { useQuickCart } from '../context/QuickCartContext';
import {
  calculateQuickOrder,
  cancelQuickOrder,
  placeQuickOrder,
  verifyQuickOrderPayment,
} from '../services/orderService';

const RUPEE_SYMBOL = '\u20B9';
const money = (value) => `${RUPEE_SYMBOL}${Number(value || 0).toFixed(2)}`;

const QUICK_CART_RECIPIENT_STORAGE_KEY = 'quick-cart-recipient-details-v1';
const QUICK_CART_NOTE_STORAGE_KEY = 'quick-cart-order-note-v1';

const formatFullAddress = (address) => {
  if (!address) return '';
  if (address.formattedAddress && address.formattedAddress !== 'Select location') {
    const looksLikeLatLng = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(String(address.formattedAddress).trim());
    if (!looksLikeLatLng) return address.formattedAddress;
  }
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.additionalDetails) parts.push(address.additionalDetails);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode || address.pincode) parts.push(address.zipCode || address.pincode);
  if (parts.length > 0) return parts.join(', ');
  if (address.address && address.address !== 'Select location') return address.address;
  return '';
};

const normalizeAddress = (source = {}, user = {}, location = {}) => {
  const s = source || {};
  const u = user || {};
  const loc = location || {};
  return {
    label: s.label === 'Office' || s.label === 'Work' ? 'Office' : s.label === 'Other' ? 'Other' : 'Home',
    fullName: s.fullName || s.name || u.name || '',
    phone: s.phone || u.phone || '',
    street: s.street || s.address || s.formattedAddress || loc.formattedAddress || loc.address || '',
    additionalDetails: s.additionalDetails || s.landmark || '',
    city: s.city || loc.city || loc.area || '',
    state: s.state || loc.state || '',
    zipCode: s.zipCode || s.pincode || loc.pincode || loc.zipCode || '',
  };
};

const sanitizePhone = (value) => String(value || '').replace(/[^\d+]/g, '').slice(0, 14);

export default function QuickCartPage() {
  const companyName = useCompanyName() || 'BiteCube';
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart } = useQuickCart();
  const { getDefaultAddress, addresses = [], userProfile } = useProfile();
  const { openLocationSelector } = useLocationSelector();
  const { location: currentLocation, loading: currentLocationLoading } = useAppLocation();

  const user = getCurrentUser('user') || {};
  const storedLocation = readStoredUserLocation() || {};

  // Address state
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [deliveryAddressMode, setDeliveryAddressMode] = useState(() => {
    if (typeof window === 'undefined') return 'saved';
    return readDeliveryAddressMode();
  });
  const [address, setAddress] = useState(() => normalizeAddress(getDefaultAddress?.(), user, storedLocation));
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Recipient details state
  const [recipientDetails, setRecipientDetails] = useState(() => {
    try {
      if (typeof window === 'undefined') return { name: '', phone: '' };
      const raw = localStorage.getItem(QUICK_CART_RECIPIENT_STORAGE_KEY);
      if (!raw) return { name: userProfile?.name || user?.name || '', phone: userProfile?.phone || user?.phone || '' };
      const stored = JSON.parse(raw);
      return {
        name: stored?.name || userProfile?.name || user?.name || '',
        phone: sanitizePhone(stored?.phone || userProfile?.phone || user?.phone || ''),
      };
    } catch {
      return { name: userProfile?.name || user?.name || '', phone: userProfile?.phone || user?.phone || '' };
    }
  });
  const [isEditingRecipient, setIsEditingRecipient] = useState(false);

  // Note for seller / delivery
  const [storeNote, setStoreNote] = useState(() => {
    try {
      if (typeof window === 'undefined') return '';
      const raw = localStorage.getItem(QUICK_CART_NOTE_STORAGE_KEY);
      if (!raw) return '';
      const stored = JSON.parse(raw);
      return String(stored?.storeNote || '');
    } catch {
      return '';
    }
  });
  const [showStoreNoteInput, setShowStoreNoteInput] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const raw = localStorage.getItem(QUICK_CART_NOTE_STORAGE_KEY);
      if (!raw) return false;
      const stored = JSON.parse(raw);
      return Boolean(stored?.showStoreNoteInput) || String(stored?.storeNote || '').trim().length > 0;
    } catch {
      return false;
    }
  });

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Payment & checkout state
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(true);
  const [showGstModal, setShowGstModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePayload, setSharePayload] = useState(null);

  // Order progression state
  const [placing, setPlacing] = useState(false);
  const [showPlacing, setShowPlacing] = useState(false);
  const [orderProgress, setOrderProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState('');
  const [serverPricing, setServerPricing] = useState(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [maxCodAmount, setMaxCodAmount] = useState(0);

  const idempotencyRef = useRef('');
  const progressIntervalRef = useRef(null);

  // Sync delivery mode
  useEffect(() => {
    try {
      const mode = readDeliveryAddressMode();
      setDeliveryAddressMode((prev) => (prev === mode ? prev : mode));
    } catch {}
  });

  // Sync recipient storage
  useEffect(() => {
    try {
      localStorage.setItem(
        QUICK_CART_RECIPIENT_STORAGE_KEY,
        JSON.stringify({ name: recipientDetails.name, phone: recipientDetails.phone })
      );
    } catch {}
  }, [recipientDetails]);

  // Sync note storage
  useEffect(() => {
    try {
      localStorage.setItem(
        QUICK_CART_NOTE_STORAGE_KEY,
        JSON.stringify({ storeNote, showStoreNoteInput })
      );
    } catch {}
  }, [storeNote, showStoreNoteInput]);

  // Sync default address
  useEffect(() => {
    const latest = normalizeAddress(getDefaultAddress?.(), user, readStoredUserLocation() || {});
    setAddress((prev) => ({
      ...prev,
      ...Object.fromEntries(Object.entries(latest).filter(([, val]) => val)),
    }));
  }, [getDefaultAddress, user.name, user.phone]);

  // Fetch business settings
  useEffect(() => {
    publicAPI.getBusinessSettings().then((response) => {
      const settings = response?.data?.data || {};
      setOnlineOnly(Boolean(settings.onlinePaymentOnly));
      setMaxCodAmount(Number(settings.maxCodAmount || 0));
      if (settings.onlinePaymentOnly) setPaymentMethod('razorpay');
    }).catch(() => {});
  }, []);

  // Calculate pricing from server
  useEffect(() => {
    if (!cart.length) return;
    let active = true;
    const timer = setTimeout(() => {
      calculateQuickOrder(cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })))
        .then((response) => {
          if (active) setServerPricing(response?.data?.pricing || response?.pricing || null);
        })
        .catch((err) => {
          if (active) setError(err?.response?.data?.message || 'Some cart items need attention');
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cart]);

  // Derived calculations
  const localSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart]
  );
  const localOriginalSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.originalPrice || item.price || 0) * Number(item.quantity || 0), 0),
    [cart]
  );
  const totalItemSavings = Math.max(0, localOriginalSubtotal - localSubtotal);

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

  // Available Time Slots for scheduling
  const availableTimeSlots = useMemo(() => {
    if (!isScheduled || !scheduledDate) return [];
    try {
      const slots = [];
      const now = new Date();
      const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const isToday = scheduledDate === nowStr;
      const currentHour = now.getHours();

      for (let h = 9; h <= 22; h++) {
        if (isToday && h <= currentHour + 1) continue;
        const period = h >= 12 ? 'PM' : 'AM';
        const display12 = h % 12 || 12;
        const timeString = `${String(h).padStart(2, '0')}:00`;
        const displayString = `${display12}:00 ${period}`;
        slots.push({ value: timeString, label: displayString });
      }
      return slots;
    } catch {
      return [];
    }
  }, [isScheduled, scheduledDate]);

  useEffect(() => {
    if (isScheduled && availableTimeSlots.length > 0) {
      const isValid = availableTimeSlots.some((slot) => slot.value === scheduledTime);
      if (!isValid) setScheduledTime(availableTimeSlots[0].value);
    } else if (!isScheduled) {
      setScheduledDate('');
      setScheduledTime('');
    }
  }, [isScheduled, availableTimeSlots, scheduledTime]);

  // Derived delivery address
  const savedAddress = getDefaultAddress?.();
  const selectedAddress = addresses.find((addr) => (addr.id || addr._id) === selectedAddressId);
  const activeAddress = selectedAddress || savedAddress || address;
  const formattedAddressText = formatFullAddress(activeAddress) || activeAddress?.street || 'Select a delivery address';
  const hasValidAddress = Boolean(activeAddress?.street && activeAddress?.city);

  const recipientName = String(recipientDetails.name || '').trim() || userProfile?.name || user?.name || 'Customer';
  const recipientPhone = sanitizePhone(recipientDetails.phone || '') || userProfile?.phone || user?.phone || '';

  // Address selection handlers
  const handleSelectAddressByLabel = (label) => {
    const normalized = String(label).toLowerCase();
    const match = addresses.find((a) => String(a.label || '').toLowerCase() === normalized);
    if (match) {
      setSelectedAddressId(match.id || match._id);
      setAddress(normalizeAddress(match, user, storedLocation));
    }
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id || addr._id);
    setAddress(normalizeAddress(addr, user, storedLocation));
  };

  const openAddressModal = () => {
    try {
      openLocationSelector();
    } catch {
      setIsEditingAddress(true);
    }
  };

  // Share handlers
  const handleShare = () => {
    const storeName = cart[0]?.sellerName || 'Quick Store';
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const url = window.location.href;
    const text = `Check out my cart from ${storeName} on ${companyName}! ${totalItems} item(s) worth ${money(pricing.total)}.`;
    setSharePayload({ title: `${storeName} Cart`, text, url });
    setShowShareModal(true);
  };

  const openShareTarget = (target) => {
    if (!sharePayload) return;
    const { text, url } = sharePayload;
    if (target === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
    } else if (target === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    } else if (target === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(sharePayload.title)}&body=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
    }
  };

  const copyShareLink = () => {
    if (sharePayload?.url) {
      navigator.clipboard.writeText(sharePayload.url);
      toast.success('Link copied to clipboard');
      setShowShareModal(false);
    }
  };

  // Payment selection label
  const selectedPaymentLabel = paymentMethod === 'razorpay' ? 'Online Payment (Razorpay)' : 'Cash on Delivery';

  // Finalize order success
  const finalizeSuccess = (order) => {
    setPlacedOrder(order);
    clearCart();
    window.dispatchEvent(new CustomEvent('order-placed', { detail: { ...order, orderType: 'quick' } }));
    setShowPlacing(false);
    setShowSuccess(true);
    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch {}
  };

  const payOnline = async (order, razorpay) =>
    new Promise((resolve, reject) => {
      let settled = false;
      initRazorpayPayment({
        key: razorpay.key,
        amount: razorpay.amount,
        currency: razorpay.currency || 'INR',
        order_id: razorpay.orderId,
        name: `${companyName} Quick`,
        description: `Quick order #${order.order_id || order._id}`,
        prefill: {
          name: recipientName,
          email: userProfile?.email || user.email || '',
          contact: recipientPhone,
        },
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
          } catch (verifyError) {
            reject(verifyError);
          }
        },
        onError: async (paymentError) => {
          if (settled) return;
          settled = true;
          try {
            await cancelQuickOrder(order._id, 'Online payment failed');
          } catch {}
          reject(new Error(paymentError?.description || 'Online payment failed'));
        },
        onClose: async () => {
          if (settled) return;
          settled = true;
          try {
            await cancelQuickOrder(order._id, 'Payment window closed by customer');
          } catch {}
          reject(new Error('Payment was cancelled'));
        },
      }).catch(async (loadError) => {
        if (!settled) {
          settled = true;
          try {
            await cancelQuickOrder(order._id, 'Payment gateway could not be opened');
          } catch {}
          reject(loadError);
        }
      });
    });

  const placeOrder = async () => {
    if (!isModuleAuthenticated('user')) {
      navigate('/user/auth/login', { state: { from: '/quick/cart' } });
      return;
    }
    if (!address.street?.trim() || !address.city?.trim() || !recipientPhone?.trim()) {
      setError('Please provide a complete delivery address and contact phone number.');
      setIsEditingAddress(true);
      toast.error('Please enter delivery address details.');
      return;
    }
    if (codUnavailable && paymentMethod === 'cash') {
      setError('Cash on Delivery is unavailable for this order. Select Online Payment.');
      toast.error('Cash on Delivery is unavailable for this order.');
      return;
    }

    try {
      setPlacing(true);
      setShowPlacing(true);
      setOrderProgress(20);
      setError('');

      progressIntervalRef.current = setInterval(() => {
        setOrderProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 300);

      const latestLocation = readStoredUserLocation() || storedLocation;
      const location =
        latestLocation.latitude && latestLocation.longitude
          ? { type: 'Point', coordinates: [Number(latestLocation.longitude), Number(latestLocation.latitude)] }
          : undefined;

      if (!idempotencyRef.current) {
        idempotencyRef.current = `quick-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const response = await placeQuickOrder(
        {
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          deliveryAddress: { ...address, location },
          customerName: recipientName,
          customerPhone: recipientPhone,
          storeNote: storeNote?.trim() || undefined,
          scheduledDelivery: isScheduled && scheduledDate && scheduledTime ? { date: scheduledDate, time: scheduledTime } : undefined,
          paymentMethod,
        },
        idempotencyRef.current
      );

      clearInterval(progressIntervalRef.current);
      setOrderProgress(95);

      const order = response?.data?.order || response?.order;
      const razorpay = response?.data?.razorpay || response?.razorpay;
      if (!order?._id) throw new Error('Order ID was not returned');

      if (paymentMethod === 'razorpay') {
        if (!razorpay?.orderId || !razorpay?.key) throw new Error('Online payment could not be initialized');
        setShowPlacing(false);
        const paidOrder = await payOnline(order, razorpay);
        finalizeSuccess(paidOrder);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        finalizeSuccess(order);
      }
      idempotencyRef.current = '';
    } catch (err) {
      clearInterval(progressIntervalRef.current);
      setError(err?.response?.data?.message || err.message || 'Could not place Quick order');
      toast.error(err?.response?.data?.message || err.message || 'Could not place Quick order');
      idempotencyRef.current = '';
    } finally {
      setPlacing(false);
      setShowPlacing(false);
      setOrderProgress(0);
    }
  };

  // Lock scroll on modals
  useEffect(() => {
    if (showPlacing || showSuccess) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPlacing, showSuccess]);

  // Empty cart view
  if (!cart.length && !showSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="sticky top-0 z-10 border-b bg-white dark:border-gray-800 dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-gray-800 dark:text-white">Quick Cart</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
            <ShoppingBag className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">Your Quick cart is empty</h2>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">Add daily essentials to start a new order</p>
          <Link to="/">
            <button className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 active:scale-95">
              Browse Products
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const storeName = cart[0]?.sellerName || 'Quick Store';

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Header - Sticky at top */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-gray-800 dark:bg-[#1a1a1a]/95">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between px-3 py-2 md:px-6 md:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 md:text-sm">{storeName}</p>
                <p className="truncate text-sm font-medium text-gray-800 dark:text-white md:text-base">
                  10-15 mins to <span className="font-semibold">Location</span>
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 md:text-sm">
                    {formattedAddressText}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Share2 className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto pb-44 md:pb-52">
        {/* Savings Banner */}
        {totalItemSavings > 0 && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/30 md:px-6 md:py-3">
            <div className="mx-auto flex max-w-7xl items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 md:text-base">
                Saved {money(totalItemSavings)} on this order
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
          <div className="mx-auto max-w-3xl space-y-3 md:space-y-4">
            {/* Cart Items Card */}
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-[#1a1a1a] md:rounded-3xl md:px-6 md:py-5">
              <div className="space-y-6">
                {cart.map((item, index) => {
                  const displayPrice = Number(item.price || 0);
                  const originalDisplayPrice = Number(item.originalPrice || item.price || 0);
                  const hasDiscount = originalDisplayPrice > displayPrice;
                  const discountPercent = hasDiscount
                    ? Math.round(((originalDisplayPrice - displayPrice) / originalDisplayPrice) * 100)
                    : 0;

                  return (
                    <div key={item.lineItemId || `${item.productId}-${item.variantId}`}>
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Product Image */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-slate-50 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:h-20 md:w-20">
                          <img
                            src={getMediaUrl(item.image)}
                            alt={item.name}
                            className="h-full w-full object-contain transition-transform duration-500 hover:scale-105"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>

                        {/* Item Details */}
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-gray-900 dark:text-gray-100 md:text-base">
                            {item.name}
                          </h3>
                          {(item.variantName || item.packSize) && (
                            <p className="mt-1 w-fit rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 md:text-xs">
                              {item.variantName || item.packSize}
                            </p>
                          )}
                        </div>

                        {/* Controls & Price */}
                        <div className="flex shrink-0 flex-col items-end gap-2.5">
                          {/* Quantity Stepper */}
                          <div className="flex items-center overflow-hidden rounded-lg border border-emerald-500/30 bg-white shadow-sm dark:border-emerald-500/40 dark:bg-gray-900">
                            <button
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  removeFromCart(item.productId, item.variantId);
                                } else {
                                  updateQuantity(item.productId, item.quantity - 1, item.variantId);
                                }
                              }}
                              className="px-2.5 py-1.5 text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                            >
                              {item.quantity <= 1 ? <Trash2 className="h-3.5 w-3.5 text-rose-500" /> : <Minus className="h-3.5 w-3.5" />}
                            </button>
                            <span className="min-w-[28px] text-center text-sm font-black text-emerald-700 dark:text-emerald-400 md:text-base">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                              className="px-2.5 py-1.5 text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="flex flex-col items-end text-right">
                            <p className="text-sm font-black text-gray-900 dark:text-gray-100 md:text-base">
                              {money(displayPrice * item.quantity)}
                            </p>
                            {hasDiscount && (
                              <div className="mt-0.5 flex flex-col items-end gap-0.5">
                                <p className="text-xs text-gray-400 line-through md:text-sm">
                                  {money(originalDisplayPrice * item.quantity)}
                                </p>
                                <span className="rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  {discountPercent}% OFF
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < cart.length - 1 && (
                        <div className="mt-5 border-b border-dashed border-gray-100 dark:border-gray-800/40" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add more items button */}
              <button
                onClick={() => navigate('/')}
                className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:underline dark:text-emerald-400 md:mt-6 md:text-base"
              >
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                <span>Add more items</span>
              </button>
            </div>

            {/* Note & Store Instructions */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-[#1a1a1a] md:px-6 sm:flex-row">
              <button
                onClick={() => setShowStoreNoteInput((prev) => !prev)}
                className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 md:rounded-xl md:px-4 md:py-3 md:text-base"
              >
                <Utensils className="h-4 w-4 text-emerald-600 dark:text-emerald-400 md:h-5 md:w-5" />
                <span className="truncate">{storeNote || 'Add delivery / store instructions'}</span>
              </button>
            </div>

            {/* Store Note Input */}
            {showStoreNoteInput && (
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1a1a1a] md:px-6 md:py-4">
                <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Instructions for seller or delivery partner
                </p>
                <textarea
                  value={storeNote}
                  onChange={(e) => setStoreNote(e.target.value)}
                  placeholder="Eg. Leave at doorstep, call upon arrival, etc."
                  className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-700 dark:bg-[#0a0a0a] dark:text-gray-100 md:h-24 md:p-4 md:text-base"
                  maxLength={240}
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                  <span>Note will be attached to order.</span>
                  <span>{storeNote.length}/240</span>
                </div>
              </div>
            )}

            {/* Delivery Time / Schedule */}
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-sm dark:border-gray-800 dark:bg-[#1a1a1a] md:px-6">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="mt-0.5">
                  <Zap className="h-5 w-5 fill-emerald-600/20 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base text-gray-800 dark:text-gray-200">
                    Delivery in <span className="font-bold text-emerald-600 dark:text-emerald-400">10-15 mins</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    Want this later?
                    <button
                      onClick={() => {
                        const next = !isScheduled;
                        setIsScheduled(next);
                        if (next && !scheduledDate) {
                          const now = new Date();
                          const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                          setScheduledDate(todayStr);
                        }
                      }}
                      className="border-b border-dashed border-gray-500 font-medium outline-none transition hover:text-emerald-600"
                    >
                      {isScheduled ? 'Cancel schedule' : 'Schedule it'}
                    </button>
                  </p>
                </div>
              </div>

              {isScheduled && (
                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-3 dark:border-gray-800 sm:flex-row">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Date (Up to Tomorrow)</label>
                    <input
                      type="date"
                      min={new Date().toLocaleDateString('en-CA')}
                      max={new Date(Date.now() + 86400000).toLocaleDateString('en-CA')}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-[#0a0a0a] dark:text-gray-200"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Time</label>
                    {availableTimeSlots.length > 0 ? (
                      <div className="relative">
                        <select
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full appearance-none rounded-md border border-gray-300 bg-white p-2 pr-8 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-[#0a0a0a] dark:text-gray-200"
                        >
                          {availableTimeSlots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      </div>
                    ) : (
                      <div className="w-full rounded-md border border-gray-200 bg-gray-100 p-2 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {scheduledDate ? 'No slots available' : 'Select date first'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Address Card */}
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-sm dark:border-gray-800 dark:bg-[#1a1a1a] md:px-6">
              <div className="flex w-full items-start justify-between text-left">
                <div className="flex flex-1 items-start gap-4">
                  <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/40">
                    <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200 md:text-base">
                      Delivery at{' '}
                      <span className="font-semibold">
                        {deliveryAddressMode === 'current' ? 'Current location' : 'Location'}
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-2 pr-4 text-sm text-gray-500 dark:text-gray-400">
                      {formattedAddressText}
                    </p>

                    {!hasValidAddress && (
                      <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Select a delivery location to continue
                      </p>
                    )}

                    {/* Quick Address Label Selection Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Home', 'Work', 'Other'].map((label) => {
                        const normalized = label.toLowerCase();
                        const exists = addresses.some(
                          (a) => String(a.label || '').toLowerCase() === normalized
                        );
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSelectAddressByLabel(label);
                            }}
                            disabled={!exists}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                              exists
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-300'
                                : 'cursor-not-allowed border border-gray-100 bg-gray-50 text-gray-400 dark:bg-gray-900'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Saved Addresses List */}
                    {addresses.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {addresses.map((addr) => {
                          const addrId = addr.id || addr._id;
                          const isSelected = addrId && addrId === selectedAddressId;
                          return (
                            <button
                              key={addrId || `${addr.label}-${addr.street}`}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectSavedAddress(addr);
                              }}
                              className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/20'
                                  : 'border-slate-100 hover:border-slate-200 dark:border-gray-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {addr.label || 'Saved address'}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                    {formatFullAddress(addr) || addr.street || 'Address details'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="whitespace-nowrap rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                    Selected
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAddressModal}
                  className="rounded-full bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                  aria-label="Open location selector"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Enter Address Manually Drawer */}
              {isEditingAddress && (
                <div className="mt-4 grid gap-3 border-t border-dashed border-gray-200 pt-4 dark:border-gray-800 sm:grid-cols-2">
                  {[
                    ['fullName', 'Full name'],
                    ['phone', 'Phone number'],
                    ['street', 'House / Flat / Street address'],
                    ['additionalDetails', 'Landmark / Area details'],
                    ['city', 'City'],
                    ['state', 'State'],
                    ['zipCode', 'PIN code'],
                  ].map(([key, label]) => (
                    <label key={key} className={key === 'street' || key === 'additionalDetails' ? 'sm:col-span-2' : ''}>
                      <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
                      <input
                        value={address[key] || ''}
                        onChange={(e) => setAddress((curr) => ({ ...curr, [key]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-[#111111] dark:text-gray-100"
                      />
                    </label>
                  ))}
                  <div className="sm:col-span-2 text-right">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      Save Address
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Details Card */}
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-[#1a1a1a] md:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
                  <Phone className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400 md:h-5 md:w-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 md:text-base">
                      {recipientName}, <span className="font-semibold">{recipientPhone || '+91-XXXXXXXXXX'}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Order recipient details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRecipient((prev) => !prev)}
                  className="whitespace-nowrap text-xs font-semibold text-emerald-600 transition hover:underline dark:text-emerald-400 md:text-sm"
                >
                  {isEditingRecipient ? 'Done' : 'Change'}
                </button>
              </div>

              {isEditingRecipient && (
                <div className="mt-4 space-y-3 border-t border-dashed border-gray-200 pt-4 dark:border-gray-800">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <input
                      type="text"
                      value={recipientDetails.name}
                      onChange={(e) => setRecipientDetails((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter recipient name"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-[#111111] dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                    <input
                      type="tel"
                      value={recipientDetails.phone}
                      onChange={(e) => setRecipientDetails((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                      placeholder="Enter recipient phone"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-[#111111] dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bill Details Card */}
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-5 shadow-sm dark:border-gray-800 dark:bg-[#1a1a1a] md:px-6">
              <button onClick={() => setShowBillDetails(!showBillDetails)} className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div className="text-left">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold tracking-wide text-emerald-600 dark:text-emerald-500">To Pay</span>
                      {totalItemSavings > 0 && (
                        <span className="text-base font-medium text-gray-400 line-through dark:text-gray-500">
                          {money(pricing.total + totalItemSavings)}
                        </span>
                      )}
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-500">
                        {money(pricing.total)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Incl. taxes and charges</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showBillDetails ? 'rotate-90' : ''}`} />
              </button>

              {showBillDetails && (
                <div className="mt-4 space-y-3 border-t border-dashed border-gray-200 pt-4 dark:border-gray-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Item Total</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{money(pricing.subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                    <span className={pricing.deliveryFee === 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-medium text-gray-800 dark:text-gray-200'}>
                      {pricing.deliveryFee === 0 ? 'FREE' : money(pricing.deliveryFee)}
                    </span>
                  </div>

                  {pricing.subtotal < 499 && (
                    <div className="-mt-1">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <Sparkles className="h-3 w-3" />
                        <span>Free delivery on orders above {money(499)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Platform Fee</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{money(pricing.platformFee)}</span>
                  </div>

                  {Number(pricing.tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span
                        className="cursor-pointer border-b border-dashed border-gray-400 text-gray-600 dark:text-gray-400"
                        onClick={() => setShowGstModal(true)}
                      >
                        GST & Charges
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{money(pricing.tax)}</span>
                    </div>
                  )}

                  {totalItemSavings > 0 && (
                    <div className="flex justify-between text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <span>Item Savings</span>
                      <span>-{money(totalItemSavings)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-3 text-base font-bold dark:border-gray-800">
                    <span className="text-gray-900 dark:text-white">Total Amount</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{money(pricing.total)}</span>
                  </div>

                  <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Safe and secure payments
                  </p>
                </div>
              )}
            </div>

            {/* Cancellation Policy Card */}
            <div className="rounded-2xl bg-gray-50 px-4 py-4 text-left dark:bg-[#1a1a1a]/30 md:px-6">
              <h3 className="mb-0.5 text-[15px] font-bold tracking-tight text-gray-400 dark:text-gray-500">
                Cancellation policy:
              </h3>
              <p className="text-[13px] leading-snug tracking-tight text-gray-400 dark:text-gray-500">
                Please double-check your order and address details.
                <br />
                Orders are non-refundable once placed.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sticky - Pay Using & Place Order Bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex-shrink-0 border-t border-slate-200 bg-white shadow-lg dark:border-gray-800 dark:bg-[#1a1a1a]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-4">
          <div className="mx-auto w-full max-w-lg space-y-3">
            {/* Pay Using Slim Pro UI */}
            <div
              onClick={() => setShowPaymentSheet(true)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-2 shadow-sm transition-all duration-200 hover:bg-gray-100 active:scale-[0.98] dark:border-gray-800 dark:bg-[#222222] dark:hover:bg-[#282828]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {paymentMethod === 'razorpay' ? <Zap className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 opacity-80 dark:text-gray-400">
                    PAYING WITH
                  </p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {selectedPaymentLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                CHANGE <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={placeOrder}
              disabled={placing}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-emerald-600 px-6 font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:h-14"
            >
              <div className="flex flex-col justify-center border-r-[1.5px] border-white/20 pr-4 text-left">
                <span className="text-xs font-semibold text-white/90 md:text-sm">{money(pricing.total)}</span>
                <span className="mt-[-2px] text-[9px] font-bold uppercase tracking-wider text-white/80 md:text-[10px]">
                  Total
                </span>
              </div>
              <div className="mx-auto flex items-center gap-1 text-sm tracking-wide md:text-lg">
                {placing ? (
                  <>
                    <span>Processing...</span>
                    <Loader2 className="h-4 w-4 animate-spin md:h-5 md:w-5" />
                  </>
                ) : !hasValidAddress ? (
                  <>
                    <span>Select Address</span>
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                  </>
                ) : (
                  <>
                    <span>{paymentMethod === 'razorpay' ? 'Pay & Place Order' : 'Place Order'}</span>
                    <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Selection Bottom Sheet */}
      <AnimatePresence>
        {showPaymentSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentSheet(false)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[101] flex max-h-[82vh] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-[#1a1a1a] md:max-h-[60vh]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex h-full min-h-0 flex-col p-5 md:p-6">
                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold leading-none text-gray-900 dark:text-white">Payment Method</h2>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-tight text-gray-400">Select how you want to pay</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentSheet(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
                  {/* Online Payment */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('razorpay');
                      setShowPaymentSheet(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all duration-300 active:scale-[0.98] ${
                      paymentMethod === 'razorpay'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                        : 'border-gray-100 bg-white shadow-sm hover:border-emerald-500/30 dark:border-gray-800/80 dark:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                          paymentMethod === 'razorpay' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black leading-none ${paymentMethod === 'razorpay' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            Online Payment
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[8px] font-black tracking-wider ${
                              paymentMethod === 'razorpay' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}
                          >
                            SECURE
                          </span>
                        </div>
                        <p className={`mt-1 text-[11px] font-bold ${paymentMethod === 'razorpay' ? 'text-white/80' : 'text-gray-400'}`}>
                          UPI, Cards, Netbanking & Wallets
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                        paymentMethod === 'razorpay' ? 'border-white bg-white' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {paymentMethod === 'razorpay' && <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={4} />}
                    </div>
                  </button>

                  {/* Cash on Delivery */}
                  {!codUnavailable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash');
                        setShowPaymentSheet(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all duration-300 active:scale-[0.98] ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                          : 'border-gray-100 bg-white shadow-sm hover:border-emerald-500/30 dark:border-gray-800/80 dark:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                            paymentMethod === 'cash' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          <Banknote className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <span className={`text-sm font-black leading-none ${paymentMethod === 'cash' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            Cash on Delivery
                          </span>
                          <p className={`mt-1 text-[11px] font-bold ${paymentMethod === 'cash' ? 'text-white/80' : 'text-gray-400'}`}>
                            Pay when order arrives
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                          paymentMethod === 'cash' ? 'border-white bg-white' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {paymentMethod === 'cash' && <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={4} />}
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                      Cash on Delivery is unavailable for this order. Please pay online.
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div className="shrink-0">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Pay</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{money(pricing.total)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPaymentSheet(false)}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Placing Order Modal */}
      {showPlacing && (
        <div className="fixed inset-0 z-[60] h-screen w-screen overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
            style={{ animation: 'slideUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="px-6 py-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Placing your Quick order</h2>

              {/* Payment Info */}
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {paymentMethod === 'razorpay'
                      ? `Pay ${money(pricing.total)} online (Razorpay)`
                      : 'Pay on delivery (COD)'}
                  </p>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <MapPin className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Delivering to Location</p>
                  <p className="mt-1 line-clamp-1 text-sm text-gray-600 dark:text-gray-400">{formattedAddressText}</p>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="relative mb-6">
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-150 ease-linear"
                    style={{
                      width: `${orderProgress}%`,
                      boxShadow: '0 0 10px rgba(5, 150, 105, 0.5)',
                    }}
                  />
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPlacing(false);
                  setPlacing(false);
                }}
                className="w-full text-right"
              >
                <span className="text-base font-semibold text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400">
                  CANCEL
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmed Celebration Modal */}
      {showSuccess && (
        <div
          className="fixed inset-0 z-[70] flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-white dark:bg-[#0a0a0a]"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          {/* Confetti Elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute h-2.5 w-2.5 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  backgroundColor: ['#059669', '#10b981', '#34d399', '#3b82f6', '#f59e0b'][Math.floor(Math.random() * 5)],
                  animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            {/* Animated Tick Circle */}
            <div className="relative mb-8" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' }}>
              <div
                className="absolute inset-0 h-32 w-32 rounded-full border-4 border-emerald-500"
                style={{ animation: 'ringPulse 1.5s ease-out infinite', opacity: 0.3 }}
              />
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-2xl shadow-emerald-500/40">
                <Check className="h-16 w-16 text-white" strokeWidth={3} />
              </div>
            </div>

            <div style={{ animation: 'slideUp 0.5s ease-out 0.6s both' }}>
              <div className="mb-2 flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {address.city || 'Your Location'}
                </h2>
              </div>
              <p className="line-clamp-2 max-w-sm text-base text-gray-500 dark:text-gray-400">
                {formattedAddressText}
              </p>
            </div>

            <div className="mt-8 text-center" style={{ animation: 'slideUp 0.5s ease-out 0.8s both' }}>
              <h3 className="mb-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">Order Confirmed!</h3>
              <p className="text-gray-600 dark:text-gray-300">Your daily essentials are on the way</p>
              {placedOrder && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Order ID: #{placedOrder?.order_id || placedOrder?.orderId || placedOrder?._id}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex w-full max-w-xs flex-col gap-3" style={{ animation: 'slideUp 0.5s ease-out 1s both' }}>
              <button
                onClick={() =>
                  navigate(`/quick/orders/${placedOrder?._id}?confirmed=true`, {
                    replace: true,
                    state: { order: placedOrder },
                  })
                }
                className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 hover:scale-105"
              >
                Track Your Order
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-2.5 text-sm font-bold text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showShareModal && sharePayload && (
              <>
                <motion.div
                  className="fixed inset-0 z-[10020] bg-black/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowShareModal(false)}
                />
                <motion.div
                  className="fixed left-1/2 top-1/2 z-[10021] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-gray-200 px-5 pb-3 pt-5 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Cart</h3>
                    <button
                      className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setShowShareModal(false)}
                    >
                      <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>

                  <div className="space-y-2 px-5 py-4">
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        onClick={() => {
                          navigator.share(sharePayload).catch(() => {});
                          setShowShareModal(false);
                        }}
                      >
                        <Share2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Share via system apps</span>
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      onClick={() => openShareTarget('whatsapp')}
                    >
                      <MessageCircle className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">WhatsApp</span>
                    </button>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      onClick={() => openShareTarget('telegram')}
                    >
                      <Send className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Telegram</span>
                    </button>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      onClick={() => openShareTarget('email')}
                    >
                      <Mail className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Email</span>
                    </button>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      onClick={copyShareLink}
                    >
                      <Copy className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Copy link</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* GST Modal */}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showGstModal && (
              <>
                <motion.div
                  className="fixed inset-0 z-[10020] bg-black/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowGstModal(false)}
                />
                <motion.div
                  className="fixed left-1/2 top-1/2 z-[10021] w-[90vw] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-5">
                    <p className="mb-4 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                      Taxes are calculated based on applicable government rates.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-800 dark:text-gray-200">GST on Items & Delivery</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{money(pricing.tax)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3 text-[14px] font-bold dark:border-gray-800">
                        <span className="text-gray-900 dark:text-white">Total Taxes</span>
                        <span className="text-gray-900 dark:text-white">{money(pricing.tax)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full border-t border-gray-100 py-3 text-center text-sm font-semibold text-emerald-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-emerald-400 dark:hover:bg-gray-800"
                    onClick={() => setShowGstModal(false)}
                  >
                    OKAY
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Animation Styles */}
      <style>{`
        @keyframes slideUpModal {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
