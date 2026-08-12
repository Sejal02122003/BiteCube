import { restaurantClient } from "@/services/api/axios";

export const fetchProducts = async (params = {}) => {
  const response = await restaurantClient.get("/quick-commerce/seller/products", { params });
  return response.data;
};

export const fetchProductById = async (id) => {
  const response = await restaurantClient.get(`/quick-commerce/seller/products/${id}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await restaurantClient.post("/quick-commerce/seller/products", productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await restaurantClient.put(`/quick-commerce/seller/products/${id}`, productData);
  return response.data;
};

export const toggleProductStatus = async (id) => {
  const response = await restaurantClient.patch(`/quick-commerce/seller/products/${id}/status`);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await restaurantClient.delete(`/quick-commerce/seller/products/${id}`);
  return response.data;
};
