import { sendError, sendResponse } from '../../../../utils/response.js';
import {
    createProductService,
    deleteProductService,
    getProductByIdService,
    getProductsService,
    toggleProductStatusService,
    updateProductService
} from '../../admin/services/product.service.js';

const getSellerScope = (req) => ({
    sellerId: req.user?.userId
});

export const createSellerProduct = async (req, res) => {
    try {
        const product = await createProductService(
            {
                ...req.body,
                sellerId: req.user?.userId
            },
            getSellerScope(req)
        );
        return sendResponse(res, 201, 'Product created successfully', product);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to create product');
    }
};

export const getSellerProducts = async (req, res) => {
    try {
        const result = await getProductsService(req.query, getSellerScope(req));
        return sendResponse(res, 200, 'Products fetched successfully', result);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch products');
    }
};

export const getSellerProductById = async (req, res) => {
    try {
        const product = await getProductByIdService(req.params.id, getSellerScope(req));
        return sendResponse(res, 200, 'Product details fetched successfully', product);
    } catch (error) {
        return sendError(res, 404, error.message || 'Product not found');
    }
};

export const updateSellerProduct = async (req, res) => {
    try {
        const product = await updateProductService(
            req.params.id,
            {
                ...req.body,
                sellerId: req.user?.userId
            },
            getSellerScope(req)
        );
        return sendResponse(res, 200, 'Product updated successfully', product);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update product');
    }
};

export const toggleSellerProductStatus = async (req, res) => {
    try {
        const product = await toggleProductStatusService(req.params.id, getSellerScope(req));
        return sendResponse(res, 200, `Product status changed to ${product.isActive ? 'Active' : 'Inactive'}`, product);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to toggle product status');
    }
};

export const deleteSellerProduct = async (req, res) => {
    try {
        const product = await deleteProductService(req.params.id, getSellerScope(req));
        return sendResponse(res, 200, 'Product deleted successfully', product);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to delete product');
    }
};
