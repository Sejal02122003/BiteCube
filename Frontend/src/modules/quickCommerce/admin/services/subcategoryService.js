import { adminClient } from "@/services/api/axios";

/**
 * Service to interact with Quick Commerce Admin Subcategory APIs
 */

export const fetchSubcategories = async (params = {}) => {
  const response = await adminClient.get('/quick-commerce/admin/subcategories', { params });
  return response.data;
};

export const fetchSubcategoryById = async (id) => {
  const response = await adminClient.get(`/quick-commerce/admin/subcategories/${id}`);
  return response.data;
};

export const createSubcategory = async (subcategoryData) => {
  const response = await adminClient.post('/quick-commerce/admin/subcategories', subcategoryData);
  return response.data;
};

export const updateSubcategory = async (id, subcategoryData) => {
  const response = await adminClient.put(`/quick-commerce/admin/subcategories/${id}`, subcategoryData);
  return response.data;
};

export const toggleSubcategoryStatus = async (id) => {
  const response = await adminClient.patch(`/quick-commerce/admin/subcategories/${id}/status`);
  return response.data;
};

export const deleteSubcategory = async (id) => {
  const response = await adminClient.delete(`/quick-commerce/admin/subcategories/${id}`);
  return response.data;
};
