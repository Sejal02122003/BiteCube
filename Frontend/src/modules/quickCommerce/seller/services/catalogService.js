import { restaurantClient } from "@/services/api/axios";

export const fetchCategories = async (params = {}) => {
  const response = await restaurantClient.get("/quick-commerce/seller/catalog/categories", { params });
  return response.data;
};

export const fetchSubcategories = async (params = {}) => {
  const response = await restaurantClient.get("/quick-commerce/seller/catalog/subcategories", { params });
  return response.data;
};
