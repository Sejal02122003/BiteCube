import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getOrderMongoId, getOrderAcceptId } from '@food/utils/orderDispatchId';

const getOrderId = (o) => getOrderMongoId(o) || getOrderAcceptId(o) || o?._id || o?.orderId;

const resolveTripStatusFromOrder = (order, defaultStatus = 'PICKING_UP') => {
  if (!order) return 'IDLE';
  const s = String(
    order.deliveryStatus ||
    order.orderState?.status ||
    order.orderStatus ||
    order.status ||
    ''
  ).toLowerCase();

  if (['delivered', 'completed'].includes(s)) return 'COMPLETED';
  if (s === 'reached_drop' || order.deliveryState?.currentPhase === 'at_drop') return 'REACHED_DROP';
  if (['picked_up', 'delivering'].includes(s)) return 'PICKED_UP';
  if (s === 'reached_pickup' || order.deliveryState?.currentPhase === 'at_pickup') return 'REACHED_PICKUP';
  if (['confirmed', 'preparing', 'ready_for_pickup', 'packing', 'accepted'].includes(s)) return 'PICKING_UP';
  return defaultStatus;
};

/**
 * useDeliveryStore - Professional Zustand store for Delivery V2
 * Supports multi-order delivery slots (Food & Quick Commerce concurrently).
 */
export const useDeliveryStore = create(
  persist(
    (set, get) => ({
      // --- Rider Status ---
      isOnline: false,
      riderLocation: null, // { lat, lng }
      
      // --- Multi-Trip State ---
      activeOrders: [], // Array of active orders
      activeOrder: null, // Currently focused active order
      maxSlots: 3, // Maximum concurrent active delivery slots
      tripStatus: 'IDLE', // Status of the currently focused activeOrder
      
      // --- Admin / Business Settings ---
      settings: {
        pickupRangeLimit: 500, // meters
        deliveryRangeLimit: 500, // meters
      },

      // --- Actions ---
      toggleOnline: () => set((state) => ({ isOnline: !state.isOnline })),
      
      setOnline: (online) => set({ isOnline: online }),
      
      setRiderLocation: (location) => set({ riderLocation: location }),
      
      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setMaxSlots: (slots) => set({ maxSlots: Number(slots) || 3 }),

      setActiveOrders: (orders = []) => set((state) => {
        const list = Array.isArray(orders) ? orders : (orders ? [orders] : []);
        const currentActiveId = getOrderId(state.activeOrder);
        const nextFocused = list.find((o) => getOrderId(o) === currentActiveId) || list[0] || null;
        return {
          activeOrders: list,
          activeOrder: nextFocused,
          tripStatus: resolveTripStatusFromOrder(nextFocused, state.tripStatus)
        };
      }),

      setActiveOrder: (order) => set((state) => {
        if (!order) {
          return { activeOrder: null, tripStatus: 'IDLE' };
        }
        const orderId = getOrderId(order);
        const existingIdx = state.activeOrders.findIndex((o) => getOrderId(o) === orderId);
        const updatedList = existingIdx >= 0
          ? state.activeOrders.map((o, idx) => (idx === existingIdx ? { ...o, ...order } : o))
          : [...state.activeOrders, order];

        return {
          activeOrders: updatedList,
          activeOrder: order,
          tripStatus: resolveTripStatusFromOrder(order, state.tripStatus === 'IDLE' ? 'PICKING_UP' : state.tripStatus)
        };
      }),

      addActiveOrder: (order) => set((state) => {
        if (!order) return state;
        const orderId = getOrderId(order);
        const exists = state.activeOrders.some((o) => getOrderId(o) === orderId);
        const nextList = exists
          ? state.activeOrders.map((o) => (getOrderId(o) === orderId ? { ...o, ...order } : o))
          : [...state.activeOrders, order];

        const nextActive = state.activeOrder && getOrderId(state.activeOrder) !== orderId
          ? state.activeOrder
          : order;

        return {
          activeOrders: nextList,
          activeOrder: nextActive,
          tripStatus: resolveTripStatusFromOrder(nextActive, state.tripStatus === 'IDLE' ? 'PICKING_UP' : state.tripStatus)
        };
      }),

      selectActiveOrder: (orderId) => set((state) => {
        const target = state.activeOrders.find((o) => getOrderId(o) === orderId);
        if (!target) return state;
        return {
          activeOrder: target,
          tripStatus: resolveTripStatusFromOrder(target, state.tripStatus)
        };
      }),

      removeActiveOrder: (orderId) => set((state) => {
        const remaining = state.activeOrders.filter((o) => getOrderId(o) !== orderId);
        const currentActiveId = getOrderId(state.activeOrder);
        const nextActive = currentActiveId === orderId ? (remaining[0] || null) : state.activeOrder;
        return {
          activeOrders: remaining,
          activeOrder: nextActive,
          tripStatus: resolveTripStatusFromOrder(nextActive, 'IDLE')
        };
      }),

      updateTripStatus: (status) => set((state) => {
        if (!state.activeOrder) return { tripStatus: status };
        const activeId = getOrderId(state.activeOrder);
        const updatedOrder = { ...state.activeOrder, deliveryStatus: status, orderStatus: status };
        return {
          tripStatus: status,
          activeOrder: updatedOrder,
          activeOrders: state.activeOrders.map((o) => (getOrderId(o) === activeId ? updatedOrder : o))
        };
      }),

      clearActiveOrder: () => set({ 
        activeOrder: null, 
        activeOrders: [],
        tripStatus: 'IDLE' 
      }),

      // --- Selectors / Computed Helper ---
      canAdvanceToPickup: () => {
        const { activeOrder, tripStatus } = get();
        return activeOrder && tripStatus === 'PICKING_UP';
      },

      canAdvanceToDeliver: () => {
        const { activeOrder, tripStatus } = get();
        return activeOrder && tripStatus === 'PICKED_UP';
      }
    }),
    {
      name: 'delivery-v2-online-pref',
      partialize: (state) => ({ isOnline: state.isOnline }),
    }
  )
);
