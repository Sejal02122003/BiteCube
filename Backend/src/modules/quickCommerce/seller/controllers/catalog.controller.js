import { sendError, sendResponse } from '../../../../utils/response.js';
import { getCategoriesService } from '../../admin/services/category.service.js';
import { getSubcategoriesService } from '../../admin/services/subcategory.service.js';

export const getSellerCategories = async (req, res) => {
    try {
        const result = await getCategoriesService(req.query);
        return sendResponse(res, 200, 'Categories fetched successfully', result);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch categories');
    }
};

export const getSellerSubcategories = async (req, res) => {
    try {
        const result = await getSubcategoriesService(req.query);
        return sendResponse(res, 200, 'Subcategories fetched successfully', result);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch subcategories');
    }
};
