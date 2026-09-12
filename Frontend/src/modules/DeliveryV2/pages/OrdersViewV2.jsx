import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, MapPin, Phone, 
  ChevronRight, Lock, CheckCircle2,
  ShoppingBag, Utensils
} from 'lucide-react';
import { ActionSlider } from '@/modules/DeliveryV2/components/ui/ActionSlider';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { getOrderMongoId, getOrderDisplayId, getOrderAcceptId } from '@food/utils/orderDispatchId';

export default function OrdersViewV2({
  incomingOrders = [],
  onAcceptOrder,
  onRejectOrder,
  onOpenOrderMap,
}) {
  const { activeOrders = [], activeOrder, selectActiveOrder, maxSlots = 3 } = useDeliveryStore();
  const [activeSubTab, setActiveSubTab] = useState('new'); // 'new' | 'accepted'

  const isSlotsFull = activeOrders.length >= maxSlots;

  // Auto switch to 'accepted' if no new orders but active orders exist, or 'new' if new orders exist
  React.useEffect(() => {
    if (incomingOrders.length > 0 && activeOrders.length === 0) {
      setActiveSubTab('new');
    }
  }, [incomingOrders.length, activeOrders.length]);

  return (
    <div className="min-h-full flex flex-col bg-gray-50 pb-28">
      {/* ─── 1. TOP ORANGE HEADER (Matches #e7770d 1:1 Target Design) ─── */}
      <div 
        className="pt-6 safe-top pb-6 px-6 shadow-md rounded-b-[2.5rem]"
        style={{ backgroundColor: '#e7770d' }}
      >
        <div className="flex flex-col mb-5">
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Orders</h1>
          <p className="text-white/90 text-xs font-semibold mt-0.5 tracking-wide">
            {activeOrders.length}/{maxSlots} active slots used
          </p>
        </div>

        {/* Segmented Control Pill Switcher */}
        <div className="bg-black/15 p-1 rounded-full flex gap-1 backdrop-blur-md border border-white/20">
          <button
            onClick={() => setActiveSubTab('new')}
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
            {activeOrders.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'accepted' ? 'bg-[#e7770d] text-white' : 'bg-white/30 text-white'
              }`}>
                {activeOrders.length}
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

                const earnings = Number(order.earnings || order.riderEarning || (order.pricing?.deliveryFee) || 40).toFixed(2);
                const displayId = getOrderDisplayId(order) || `#${order.order_id || order.orderId || order._id?.slice?.(-6)}`;

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
                        <span className="text-lg font-black text-gray-900">₹{earnings}</span>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earning</span>
                      </div>
                    </div>

                    {/* Step 1: Pickup & Step 2: Drop */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-4 h-4 rounded-full bg-[#e7770d] border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">P</div>
                        <div className="w-0.5 h-10 bg-dashed border-l border-gray-200 my-0.5" />
                        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center text-[8px] text-white font-bold">D</div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#e7770d]">
                              {isQuick ? 'Seller Pickup' : 'Restaurant Pickup'}
                            </span>
                            {storePhone && (
                              <a href={`tel:${storePhone}`} className="text-gray-400 hover:text-gray-600 p-1">
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-gray-900 text-xs font-bold line-clamp-1">{storeName}</p>
                          <p className="text-gray-500 text-[11px] line-clamp-1 font-medium">{storeAddress}</p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                              Customer Drop
                            </span>
                            {customerPhone && (
                              <a href={`tel:${customerPhone}`} className="text-gray-400 hover:text-gray-600 p-1">
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-gray-900 text-xs font-bold line-clamp-1">{customerName}</p>
                          <p className="text-gray-500 text-[11px] line-clamp-1 font-medium">{customerAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Area: Accept Slider or Slot Lock */}
                    <div className="pt-2 space-y-3">
                      {isSlotsFull ? (
                        <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 flex items-center gap-3">
                          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                          <span className="text-xs font-semibold">
                            All {maxSlots} slots in use — complete an active order to accept more
                          </span>
                        </div>
                      ) : (
                        <ActionSlider
                          label="Slide to Accept"
                          onConfirm={() => onAcceptOrder?.(order)}
                          color="bg-black"
                          successLabel="Accepted ✓"
                        />
                      )}

                      <div className="flex justify-center">
                        <button
                          onClick={() => onRejectOrder?.(order)}
                          className="text-gray-400 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest transition-colors py-1 px-4"
                        >
                          Pass this task
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* ──── ACCEPTED ORDERS LIST ──── */
          activeOrders.length === 0 ? (
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
              {activeOrders.map((order, idx) => {
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
                const displayId = getOrderDisplayId(order) || `#${order.order_id || order.orderId || order._id?.slice?.(-6)}`;
                const earnings = Number(order.earnings || order.riderEarning || order.pricing?.deliveryFee || 40).toFixed(2);
                
                const status = String(order.deliveryStatus || order.orderStatus || 'PICKING_UP').toUpperCase();
                const isSelected = (getOrderMongoId(activeOrder) || getOrderAcceptId(activeOrder)) === (getOrderMongoId(order) || getOrderAcceptId(order));

                const statusLabel = 
                  status === 'REACHED_PICKUP' ? 'At Store / Pickup' :
                  status === 'PICKED_UP' ? 'Heading to Drop' :
                  status === 'REACHED_DROP' ? 'At Customer Location' :
                  status === 'COMPLETED' ? 'Delivered' :
                  'Picking Up';

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
                      if (onOpenOrderMap) onOpenOrderMap(order);
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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectActiveOrder(getOrderMongoId(order) || getOrderAcceptId(order));
                          if (onOpenOrderMap) onOpenOrderMap(order);
                        }}
                        className="bg-[#e7770d] hover:bg-[#d06806] text-white font-bold text-[11px] px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow-md shadow-[#e7770d]/20"
                      >
                        Manage Delivery →
                      </button>
                    </div>
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
