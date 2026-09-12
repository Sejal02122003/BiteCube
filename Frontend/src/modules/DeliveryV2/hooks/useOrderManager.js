import { useRef } from 'react';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { deliveryAPI } from '@food/api';
import { getOrderAcceptId, getOrderMongoId } from '@food/utils/orderDispatchId';
import { toast } from 'sonner';

/**
 * useOrderManager - Professional hook for real-world trip lifecycle actions.
 * Connects directly to the backend API services with multi-order support.
 */
export const useOrderManager = () => {
  const { 
    activeOrder,
    activeOrders,
    maxSlots,
    tripStatus,
    updateTripStatus,
    clearActiveOrder,
    setActiveOrder,
    addActiveOrder,
    removeActiveOrder,
    selectActiveOrder,
    riderLocation 
  } = useDeliveryStore();

  const resolveOrderId = (orderLike = activeOrder) =>
    getOrderMongoId(orderLike) || getOrderAcceptId(orderLike) || orderLike?._id || orderLike?.orderId;

  const acceptOrderInFlight = useRef(false);

  const acceptOrder = async (order) => {
    // Check if slots are full
    if (activeOrders.length >= maxSlots) {
      toast.error(`All ${maxSlots} slots are in use. Complete an active delivery to accept more.`);
      throw new Error('Slots full');
    }

    if (acceptOrderInFlight.current) {
      toast.info('Already processing this order...');
      return;
    }
    const orderId = resolveOrderId(order);
    if (!orderId) {
      toast.error('Invalid order data');
      return;
    }

    acceptOrderInFlight.current = true;
    try {
      const orderType = order?.orderType === 'quick' ? 'quick' : 'food';
      const response = await deliveryAPI.acceptOrder(orderId, {}, orderType);
      
      if (response?.data?.success) {
        const fullOrder = response.data.data?.order || order;
        
        // Robustly determine locations from multiple possible formats (Populated API vs Socket)
        const getLoc = (ref, keysLat, keysLng) => {
          if (!ref) return null;
          if (ref.location) {
            if (Array.isArray(ref.location.coordinates) && ref.location.coordinates.length >= 2) {
              return {
                lat: ref.location.coordinates[1],
                lng: ref.location.coordinates[0]
              };
            }
            return {
              lat: ref.location.latitude || ref.location.lat,
              lng: ref.location.longitude || ref.location.lng
            };
          }
          for (const k of keysLat) { if (ref[k] != null) return { lat: ref[k], lng: ref[keysLng[keysLat.indexOf(k)]] }; }
          return null;
        };

        const pickupEntity = fullOrder.orderType === 'quick' ? fullOrder.sellerId : fullOrder.restaurantId;
        const resLoc = getLoc(pickupEntity, ['latitude', 'lat'], ['longitude', 'lng']) ||
                       getLoc(fullOrder, ['restaurant_lat', 'restaurantLat', 'latitude'], ['restaurant_lng', 'restaurantLng', 'longitude']);
                       
        const cusLoc = getLoc(fullOrder.deliveryAddress, ['latitude', 'lat'], ['longitude', 'lng']) || 
                       getLoc(fullOrder, ['customer_lat', 'customerLat', 'latitude'], ['customer_lng', 'customerLng', 'longitude']);

        const normalizedAcceptedOrder = {
          ...fullOrder,
          orderId: orderId,
          orderType: orderType,
          restaurantId: fullOrder.restaurantId || fullOrder.sellerId,
          restaurantLocation: resLoc,
          customerLocation: cusLoc,
          deliveryStatus: 'PICKING_UP',
          orderStatus: 'PICKING_UP'
        };

        addActiveOrder(normalizedAcceptedOrder);
        updateTripStatus('PICKING_UP');
        toast.success(`Order #${fullOrder.order_id || orderId} Accepted!`);
        return normalizedAcceptedOrder;
      } else {
        toast.error(response?.data?.message || 'Order already taken or unavailable');
        throw new Error('Accept failed');
      }
    } catch (error) {
      console.error('Accept Order Error:', error);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Network error. Please try again.';
      if (error?.response?.status === 403 || msg.toLowerCase().includes('already accepted')) {
        toast.error('This order was just taken by another delivery partner.', { duration: 4000 });
      } else {
        toast.error(msg);
      }
      throw error;
    } finally {
      acceptOrderInFlight.current = false;
    }
  };

  /**
   * Mark "Reached Pickup" (Arrival at restaurant / seller)
   */
  const reachPickup = async (targetOrder = activeOrder) => {
    const orderId = resolveOrderId(targetOrder);
    if (!orderId) {
      toast.error('Order id not found. Please refresh current trip.');
      throw new Error('Missing order id');
    }
    try {
      const response = await deliveryAPI.confirmReachedPickup(orderId, targetOrder?.orderType);
      if (response?.data?.success) {
        updateTripStatus('REACHED_PICKUP');
      } else {
        throw new Error('Confirm pickup failed');
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to update status');
      throw error;
    }
  };

  /**
   * Mark "Picked Up" (Confirm order ID & start delivery)
   */
  const pickUpOrder = async (billImageUrl, otp, targetOrder = activeOrder) => {
    const orderId = resolveOrderId(targetOrder);
    if (!orderId) {
      toast.error('Order id not found. Please refresh current trip.');
      throw new Error('Missing order id');
    }
    try {
      const response = await deliveryAPI.confirmOrderId(
        orderId, 
        targetOrder.displayOrderId || orderId, 
        riderLocation || {},
        { billImageUrl, otp },
        targetOrder?.orderType
      );
      
      if (response?.data?.success) {
        updateTripStatus('PICKED_UP');
      } else {
        throw new Error('Confirm order ID failed');
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Error confirming pickup');
      throw error;
    }
  };

  /**
   * Mark "Reached Drop" (Arrival at customer)
   */
  const reachDrop = async (targetOrder = activeOrder) => {
    const orderId = resolveOrderId(targetOrder);
    if (!orderId) {
      toast.error('Order id not found. Please refresh current trip.');
      throw new Error('Missing order id');
    }
    try {
      const response = await deliveryAPI.confirmReachedDrop(orderId, targetOrder?.orderType);
      if (response?.data?.success) {
        updateTripStatus('REACHED_DROP');
      } else {
        throw new Error('Confirm drop failed');
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to notify arrival');
      throw error;
    }
  };

  /**
   * Finalize Delivery with OTP Check
   */
  const completeDelivery = async (otp, paymentMethodOverride = null, targetOrder = activeOrder) => {
    const orderId = resolveOrderId(targetOrder);
    if (!orderId) {
      toast.error('Order id not found. Please refresh current trip.');
      throw new Error('Missing order id');
    }
    try {
      const isAlreadyVerified = targetOrder?.deliveryVerification?.dropOtp?.verified;
      
      if (!isAlreadyVerified) {
        const verifyRes = await deliveryAPI.verifyDropOtp(orderId, otp, targetOrder?.orderType);
        if (!verifyRes?.data?.success) {
          toast.error('Invalid OTP. Please check with customer.');
          throw new Error('Invalid OTP');
        }
      }
      
      const otpToUse = otp || targetOrder?.deliveryVerification?.dropOtp?.code;
      
      let finalOrder = targetOrder;
      try {
        const completeRes = await deliveryAPI.completeDelivery(orderId, { 
          otp: otpToUse, 
          rating: 5,
          paymentMethod: paymentMethodOverride
        }, targetOrder?.orderType);
        if (completeRes.data?.success && completeRes.data?.data?.order) {
          finalOrder = completeRes.data.data.order;
        }
      } catch (completeErr) {
        console.warn('Complete call failed, but OTP was verified.', completeErr);
        const errMsg = String(completeErr?.response?.data?.error || completeErr?.response?.data?.message || '').toLowerCase();
        if (!errMsg.includes('already at status') && !errMsg.includes('delivered')) {
          throw completeErr;
        }
      }
      
      if (finalOrder) setActiveOrder(finalOrder);
      updateTripStatus('COMPLETED');
    } catch (error) {
      console.error('Completion Error:', error);
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Verification failed',
      );
      throw error;
    }
  };

  const resetTrip = (orderIdToRemove = null) => {
    if (orderIdToRemove) {
      removeActiveOrder(orderIdToRemove);
    } else {
      clearActiveOrder();
    }
  };

  return {
    activeOrder,
    activeOrders,
    maxSlots,
    tripStatus,
    acceptOrder,
    reachPickup,
    pickUpOrder,
    reachDrop,
    completeDelivery,
    resetTrip,
    selectActiveOrder,
    removeActiveOrder,
  };
};
