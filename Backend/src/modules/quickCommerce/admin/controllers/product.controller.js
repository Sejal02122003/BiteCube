import { sendResponse, sendError } from '../../../../utils/response.js';
import {
    createProductService,
    getProductsService,
    getProductByIdService,
    updateProductService,
    toggleProductStatusService,
    deleteProductService,
    updateLowestPriceEverSelectionService
} from '../services/product.service.js';

/**
 * Controller to create a new Quick Commerce product
 */
export const createProduct = async (req, res) => {
    try {
        const product = await createProductService(req.body);
        return sendResponse(res, 201, "Product created successfully", product);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to create product");
    }
};

/**
 * Controller to get all Quick Commerce products with search, filters, and pagination
 */
export const getProducts = async (req, res) => {
    try {
        const result = await getProductsService(req.query);
        return sendResponse(res, 200, "Products fetched successfully", result);
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to fetch products");
    }
};

/**
 * Public controller to get active Quick Commerce products for mobile/user app
 */
export const getPublicQuickProductsController = async (req, res) => {
    try {
        const query = {
            isActive: true,
            isAvailable: true,
            approvalStatus: 'approved',
            ...req.query
        };
        const result = await getProductsService(query);
        return sendResponse(res, 200, "Public products fetched successfully", result);
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to fetch public products");
    }
};

export const getPublicLowestPriceEverProductsController = async (req, res) => {
    try {
        const query = {
            isActive: true,
            isAvailable: true,
            approvalStatus: 'approved',
            showInLowestPriceEver: true,
            limit: req.query.limit || 20,
            sortBy: 'lowestPriceEverOrder',
            sortOrder: 'asc',
            ...req.query
        };
        const result = await getProductsService(query);
        return sendResponse(res, 200, "Lowest price ever products fetched successfully", result);
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to fetch lowest price ever products");
    }
};

/**
 * Controller to get a single product by ID
 */
export const getProductById = async (req, res) => {
    try {
        const product = await getProductByIdService(req.params.id);
        return sendResponse(res, 200, "Product details fetched successfully", product);
    } catch (error) {
        return sendError(res, 404, error.message || "Product not found");
    }
};

/**
 * Controller to update an existing product
 */
export const updateProduct = async (req, res) => {
    try {
        const updatedProduct = await updateProductService(req.params.id, req.body);
        return sendResponse(res, 200, "Product updated successfully", updatedProduct);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to update product");
    }
};

/**
 * Controller to toggle product active status
 */
export const toggleProductStatus = async (req, res) => {
    try {
        const product = await toggleProductStatusService(req.params.id);
        return sendResponse(res, 200, `Product status changed to ${product.isActive ? 'Active' : 'Inactive'}`, product);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to toggle product status");
    }
};

/**
 * Controller to delete a product
 */
export const deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await deleteProductService(req.params.id);
        return sendResponse(res, 200, "Product deleted successfully", deletedProduct);
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to delete product");
    }
};

export const updateLowestPriceEverSelection = async (req, res) => {
    try {
        const updatedProduct = await updateLowestPriceEverSelectionService(req.params.id, req.body);
        return sendResponse(
            res,
            200,
            updatedProduct.showInLowestPriceEver
                ? "Product added to Lowest Price Ever section"
                : "Product removed from Lowest Price Ever section",
            updatedProduct
        );
    } catch (error) {
        return sendError(res, 400, error.message || "Failed to update Lowest Price Ever selection");
    }
};
