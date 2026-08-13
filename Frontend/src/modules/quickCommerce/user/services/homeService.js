import api from "@/services/api/axios";

export const fetchPublicQuickCategories = async (params = {}) => {
  const response = await api.get("/quick-commerce/categories/public", { params });
  return response.data;
};

export const fetchPublicQuickSubcategories = async (params = {}) => {
  const response = await api.get("/quick-commerce/subcategories/public", { params });
  return response.data;
};

export const fetchPublicQuickProducts = async (params = {}) => {
  const response = await api.get("/quick-commerce/products/public", { params });
  return response.data;
};

export const fetchPublicQuickProductById = async (id) => {
  const response = await api.get(`/quick-commerce/products/public/${id}`);
  return response.data;
};

export const fetchPublicLowestPriceEverProducts = async (params = {}) => {
  const response = await api.get("/quick-commerce/products/lowest-price-ever/public", {
    params,
  });
  return response.data;
};
