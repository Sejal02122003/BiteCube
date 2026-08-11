import { adminClient } from "@/services/api/axios";

/**
 * Service to interact with Quick Commerce Admin Category APIs
 */

export const fetchCategories = async (params = {}) => {
  const response = await adminClient.get('/quick-commerce/admin/categories', { params });
  return response.data;
};

export const fetchCategoryById = async (id) => {
  const response = await adminClient.get(`/quick-commerce/admin/categories/${id}`);
  return response.data;
};

export const createCategory = async (categoryData) => {
  const response = await adminClient.post('/quick-commerce/admin/categories', categoryData);
  return response.data;
};

export const updateCategory = async (id, categoryData) => {
  const response = await adminClient.put(`/quick-commerce/admin/categories/${id}`, categoryData);
  return response.data;
};

export const toggleCategoryStatus = async (id) => {
  const response = await adminClient.patch(`/quick-commerce/admin/categories/${id}/status`);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await adminClient.delete(`/quick-commerce/admin/categories/${id}`);
  return response.data;
};

export const uploadCategoryImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await adminClient.post('/uploads/single', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
