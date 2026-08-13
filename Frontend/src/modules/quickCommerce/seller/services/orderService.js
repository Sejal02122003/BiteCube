import { restaurantClient } from "@/services/api/axios";

export const fetchOrders = async (params = {}) => {
  const response = await restaurantClient.get("/quick-commerce/seller/orders", {
    params: { limit: 30, page: 1, ...params },
  });
  return response.data;
};

export const fetchOrderById = async (orderId) => {
  const response = await restaurantClient.get(`/quick-commerce/seller/orders/${String(orderId)}`);
  return response.data;
};

export const updateOrderStatus = async (orderId, body = {}) => {
  const response = await restaurantClient.patch(`/quick-commerce/seller/orders/${String(orderId)}/status`, body ?? {});
  return response.data;
};

export const acceptOrder = async (orderId) => {
  return updateOrderStatus(orderId, { orderStatus: "packing" });
};

export const rejectOrder = async (orderId, reason = "") => {
  return updateOrderStatus(orderId, { orderStatus: "cancelled_by_seller", note: reason });
};

export const markOrderReady = async (orderId) => {
  return updateOrderStatus(orderId, { orderStatus: "ready_for_pickup" });
};

export const resendDeliveryNotification = async (orderId) => {
  const response = await restaurantClient.post(
    `/quick-commerce/seller/orders/${String(orderId)}/resend-notification`,
  );
  return response.data;
};
