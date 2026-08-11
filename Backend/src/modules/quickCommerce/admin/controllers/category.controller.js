import { sendResponse, sendError } from '../../../../utils/response.js';
import {
    createCategoryService,
    getCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    toggleCategoryStatusService,
    deleteCategoryService
} from '../services/category.service.js';

/**
 * Controller to create a new Quick Commerce category
 */
export const createCategory = async (req, res) => {
    try {
        const category = await createCategoryService(req.body);
        return sendResponse(res, 201, "Category created successfully", category);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to create category");
    }
};

/**
 * Controller to get all Quick Commerce categories with filters, search, and pagination
 */
export const getCategories = async (req, res) => {
    try {
        const result = await getCategoriesService(req.query);
        return sendResponse(res, 200, "Categories fetched successfully", result);
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to fetch categories");
    }
};

/**
 * Controller to get a single category by ID
 */
export const getCategoryById = async (req, res) => {
    try {
        const category = await getCategoryByIdService(req.params.id);
        return sendResponse(res, 200, "Category details fetched successfully", category);
    } catch (error) {
        return sendError(res, 404, error.message || "Category not found");
    }
};

/**
 * Controller to update an existing category
 */
export const updateCategory = async (req, res) => {
    try {
        const updatedCategory = await updateCategoryService(req.params.id, req.body);
        return sendResponse(res, 200, "Category updated successfully", updatedCategory);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to update category");
    }
};

/**
 * Controller to toggle category active status
 */
export const toggleCategoryStatus = async (req, res) => {
    try {
        const category = await toggleCategoryStatusService(req.params.id);
        return sendResponse(res, 200, `Category status changed to ${category.isActive ? 'Active' : 'Inactive'}`, category);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to toggle category status");
    }
};

/**
 * Controller to delete a category
 */
export const deleteCategory = async (req, res) => {
    try {
        const deletedCategory = await deleteCategoryService(req.params.id);
        return sendResponse(res, 200, "Category deleted successfully", deletedCategory);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to delete category");
    }
};
