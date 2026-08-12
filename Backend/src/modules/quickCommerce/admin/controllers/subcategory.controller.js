import { sendResponse, sendError } from '../../../../utils/response.js';
import {
    createSubcategoryService,
    getSubcategoriesService,
    getSubcategoryByIdService,
    updateSubcategoryService,
    toggleSubcategoryStatusService,
    deleteSubcategoryService
} from '../services/subcategory.service.js';

/**
 * Controller to create a new Quick Commerce subcategory
 */
export const createSubcategory = async (req, res) => {
    try {
        const subcategory = await createSubcategoryService(req.body);
        return sendResponse(res, 201, "Subcategory created successfully", subcategory);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to create subcategory");
    }
};

/**
 * Controller to get all Quick Commerce subcategories with search, filters, and pagination
 */
export const getSubcategories = async (req, res) => {
    try {
        const result = await getSubcategoriesService(req.query);
        return sendResponse(res, 200, "Subcategories fetched successfully", result);
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to fetch subcategories");
    }
};

export const getPublicQuickSubcategoriesController = async (req, res) => {
    try {
        const result = await getSubcategoriesService({
            ...req.query,
            isActive: true,
            status: 'active',
            sortBy: req.query.sortBy || 'sortOrder',
            sortOrder: req.query.sortOrder || 'asc',
        });
        return sendResponse(res, 200, "Public quick subcategories fetched successfully", result);
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to fetch public quick subcategories");
    }
};

/**
 * Controller to get a single subcategory by ID
 */
export const getSubcategoryById = async (req, res) => {
    try {
        const subcategory = await getSubcategoryByIdService(req.params.id);
        return sendResponse(res, 200, "Subcategory details fetched successfully", subcategory);
    } catch (error) {
        return sendError(res, 404, error.message || "Subcategory not found");
    }
};

/**
 * Controller to update an existing subcategory
 */
export const updateSubcategory = async (req, res) => {
    try {
        const updatedSubcategory = await updateSubcategoryService(req.params.id, req.body);
        return sendResponse(res, 200, "Subcategory updated successfully", updatedSubcategory);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to update subcategory");
    }
};

/**
 * Controller to toggle subcategory active status
 */
export const toggleSubcategoryStatus = async (req, res) => {
    try {
        const subcategory = await toggleSubcategoryStatusService(req.params.id);
        return sendResponse(res, 200, `Subcategory status changed to ${subcategory.isActive ? 'Active' : 'Inactive'}`, subcategory);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to toggle subcategory status");
    }
};

/**
 * Controller to delete a subcategory
 */
export const deleteSubcategory = async (req, res) => {
    try {
        const deletedSubcategory = await deleteSubcategoryService(req.params.id);
        return sendResponse(res, 200, "Subcategory deleted successfully", deletedSubcategory);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to delete subcategory");
    }
};
