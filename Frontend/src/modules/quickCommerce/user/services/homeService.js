import api from "@/services/api/axios";

export const fetchPublicQuickCategories = async (params = {}) => {
  const response = await api.get("/quick-commerce/categories/public", { params });
  return response.data;
};

export const fetchPublicLowestPriceEverProducts = async (params = {}) => {
  const response = await api.get("/quick-commerce/products/lowest-price-ever/public", {
    params,
  });
  return response.data;
};
