import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, MapPin, Phone, 
  ChevronDown, ChevronUp, Package, 
  Navigation, CheckCircle2, Camera, Loader2, Image as ImageIcon, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { parseLatLng } from '@/modules/DeliveryV2/hooks/proximity.utils';

/**
 * PickupActionModal - Unified White/Green Theme with Slider Actions.
 * Includes Bill Upload feature prior to pickup.
 */
export const PickupActionModal = ({ 
  order, 
  status, 
  isWithinRange, 
  distanceToTarget,
  eta,
  onReachedPickup, 
  onPickedUp,
  onMinimize,
}) => {
  const navigate = useNavigate();
  const [showItems, setShowItems] = useState(false);

  if (!order) return null;

  const isAtPickup = status === 'REACHED_PICKUP';
  const isQuickOrder = order.orderType === 'quick';
  const restaurantName = isQuickOrder ? (order.sellerId?.storeName || order.restaurantName || 'Quick seller') : (order.restaurantName || order.restaurant_name || order.restaurantId?.restaurantName || order.restaurant?.restaurantName || 'Restaurant');
  const restaurantAddress = isQuickOrder ? ([order.sellerId?.addressLine1, order.sellerId?.area, order.sellerId?.city].filter(Boolean).join(', ') || 'Seller address not available') : (order.restaurantAddress || order.restaurant_address || order.restaurantLocation?.address || order.restaurantId?.address || 'Address not available');
  const restaurantPhone = isQuickOrder ? (order.sellerId?.ownerPhone || '') : (order.restaurantPhone || order.restaurant_phone || order.restaurantId?.phone || '');
  const restaurantCoords =
    parseLatLng(order.restaurantLocation) ||
    parseLatLng(order.restaurantId?.location) ||
    parseLatLng(order.restaurant_location);

  const openRestaurantInMaps = () => {
    navigate('/food/delivery/feed');
  };

  const distanceLabel = Number.isFinite(distanceToTarget)
    ? `${(distanceToTarget / 1000).toFixed(1)} km • ${eta || '--'} min to Store`
    : 'Locating your position...';
  const items = order.items || [];
  const restaurantLogo = order.restaurantImage || order.restaurant?.logo || order.restaurant?.profileImage || order.restaurantId?.profileImage || order.restaurantId?.logo || 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';

  return (
    <div className="fixed inset-0 z-110 p-0 sm:p-4 flex items-end justify-center">
      {/* Background Dim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 -z-10"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="w-full max-w-md sm:max-w-lg bg-white rounded-t-3xl sm:rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] p-4 sm:p-6 pb-6 sm:pb-12 max-h-[84vh] overflow-y-auto"
      >
        {/* Handle / Minimize */}
        <div className="w-full flex justify-center pb-2 sm:pb-4 pt-1">
          <button onClick={onMinimize} className="p-1 hover:bg-gray-100 active:scale-95 transition-all rounded-full flex flex-col items-center">
             <ChevronDown className="w-6 h-6 text-gray-400 stroke-3" />
          </button>
        </div>

        {/* Restaurant Header - Click to navigate to Orders Page */}
        <div 
          onClick={() => navigate('/food/delivery/orders')}
          className="flex items-start justify-between mb-5 sm:mb-8 pb-3 sm:pb-4 border-b border-gray-50 cursor-pointer group"
          title="Click to manage order on Orders page"
        >
          <div className="flex gap-3 sm:gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 overflow-hidden border border-gray-100">
              <img src={restaurantLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-gray-950 text-lg sm:text-xl font-bold">{restaurantName}</h3>
              <p className="text-blue-600 text-[11px] font-black uppercase tracking-widest mt-0.5">
                ORDER #{order.order_id || order.orderId || order._id}
              </p>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1.5">
                {isAtPickup ? (
                  <span className="text-green-600">Reached Location √</span>
                ) : (
                  <span className="text-orange-500">
                    {distanceLabel}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {restaurantPhone && (
              <button
                onClick={() => window.location.href = `tel:${restaurantPhone}`}
                className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100"
              >
                <Phone className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={openRestaurantInMaps}
              className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white shadow-lg"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delivery Process Redirect to Orders Page */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('/food/delivery/orders')}
            className="w-full py-4 px-5 bg-[#e7770d] hover:bg-[#d06806] active:scale-[0.98] text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-[#e7770d]/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Deliver Order on Orders Page</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

          {/* Delivery Instructions (User Note) */}
          {order?.note && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3.5 sm:p-4 flex gap-3 items-start">
              <ChefHat className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1.5">User Instructions</p>
                <p className="text-sm font-bold text-gray-800 leading-snug">"{order.note}"</p>
              </div>
            </div>
          )}

          {/* Collapsible Order Summary */}
          <button 
            onClick={() => setShowItems(!showItems)}
            className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 text-gray-900 font-bold text-xs uppercase tracking-widest">
              <Package className="w-5 h-5 text-gray-400" />
              <span>Order Details ({items.length || 0})</span>
            </div>
            {showItems ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {showItems && (
            <div className="overflow-hidden space-y-2 px-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 text-sm font-bold">{item.name || 'Item Name'}</span>
                  <span className="text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-lg text-xs">x{item.quantity || 1}</span>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </div>
    );
  };

export default PickupActionModal;
