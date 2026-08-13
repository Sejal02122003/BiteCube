import { adminClient } from "@/services/api/axios"

export const fetchSellers = async (params = {}) => {
  const response = await adminClient.get("/quick-commerce/admin/sellers", { params })
  return response.data
}

export const fetchSellerRequests = async (params = {}) => {
  const response = await adminClient.get("/quick-commerce/admin/sellers", { params })
  return response.data
}

export const updateSeller = async (id, payload = {}) => {
  const response = await adminClient.put(`/quick-commerce/admin/sellers/${id}`, payload)
  return response.data
}

export const updateSellerRequestStatus = async (id, payload = {}) => {
  const response = await adminClient.patch(`/quick-commerce/admin/sellers/${id}/status`, payload)
  return response.data
}

export const fetchSellerRequestById = async (id) => {
  const response = await adminClient.get(`/quick-commerce/admin/sellers/${id}`)
  return response.data
}

export const toggleSellerActiveStatus = async (id) => {
  const response = await adminClient.patch(`/quick-commerce/admin/sellers/${id}/active`)
  return response.data
}
