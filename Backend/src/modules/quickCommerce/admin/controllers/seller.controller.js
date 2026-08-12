import { sendError, sendResponse } from '../../../../utils/response.js';
import {
    getSellerByIdService,
    getSellersService,
    toggleSellerActiveService,
    updateSellerService,
    updateSellerStatusService
} from '../services/seller.service.js';

export const getSellers = async (req, res) => {
    try {
        const result = await getSellersService(req.query);
        return sendResponse(res, 200, 'Sellers fetched successfully', result);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch sellers');
    }
};

export const getSellerById = async (req, res) => {
    try {
        const seller = await getSellerByIdService(req.params.id);
        return sendResponse(res, 200, 'Seller details fetched successfully', seller);
    } catch (error) {
        return sendError(res, 404, error.message || 'Seller not found');
    }
};

export const updateSeller = async (req, res) => {
    try {
        const seller = await updateSellerService(req.params.id, req.body || {});
        return sendResponse(res, 200, 'Seller updated successfully', seller);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update seller');
    }
};

export const updateSellerStatus = async (req, res) => {
    try {
        const seller = await updateSellerStatusService(req.params.id, req.body || {});
        return sendResponse(res, 200, 'Seller status updated successfully', seller);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update seller status');
    }
};

export const toggleSellerActive = async (req, res) => {
    try {
        const seller = await toggleSellerActiveService(req.params.id);
        return sendResponse(res, 200, `Seller ${seller.isActive ? 'activated' : 'deactivated'} successfully`, seller);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to toggle seller status');
    }
};
