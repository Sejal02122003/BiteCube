import { adminClient } from "@/services/api/axios";

/**
 * Service to interact with Quick Commerce Admin Product APIs
 */

export const fetchProducts = async (params = {}) => {
  const response = await adminClient.get('/quick-commerce/admin/products', { params });
  return response.data;
};

export const fetchProductById = async (id) => {
  const response = await adminClient.get(`/quick-commerce/admin/products/${id}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await adminClient.post('/quick-commerce/admin/products', productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await adminClient.put(`/quick-commerce/admin/products/${id}`, productData);
  return response.data;
};

export const toggleProductStatus = async (id) => {
  const response = await adminClient.patch(`/quick-commerce/admin/products/${id}/status`);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await adminClient.delete(`/quick-commerce/admin/products/${id}`);
  return response.data;
};

export const updateLowestPriceEverSelection = async (id, payload) => {
  const response = await adminClient.patch(
    `/quick-commerce/admin/products/${id}/lowest-price-ever`,
    payload,
  );
  return response.data;
};
