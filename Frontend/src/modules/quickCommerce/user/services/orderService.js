import { userClient } from "@/services/api/axios";

export const calculateQuickOrder = async (items) => {
  const response = await userClient.post("/quick-commerce/orders/calculate", { items });
  return response.data;
};

export const placeQuickOrder = async (payload, idempotencyKey) => {
  const response = await userClient.post("/quick-commerce/orders", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return response.data;
};

export const verifyQuickOrderPayment = async (payload) => {
  const response = await userClient.post('/quick-commerce/orders/verify-payment', payload);
  return response.data;
};

export const fetchMyQuickOrders = async (params = {}) => {
  const response = await userClient.get("/quick-commerce/orders", { params });
  return response.data;
};

export const fetchQuickOrder = async (orderId) => {
  const response = await userClient.get(`/quick-commerce/orders/${String(orderId)}`);
  return response.data;
};

export const cancelQuickOrder = async (orderId, reason = "") => {
  const response = await userClient.patch(`/quick-commerce/orders/${String(orderId)}/cancel`, { reason });
  return response.data;
};
