import mongoose from 'mongoose';
import { sendError, sendResponse } from '../../../../utils/response.js';
import {
    validateQuickSellerGlobalCommissionSettingsDto,
    validateSellerCommissionUpsertDto
} from '../validators/sellerCommission.validator.js';
import {
    createSellerCommissionService,
    deleteSellerCommissionService,
    getSellerCommissionBootstrapService,
    getSellerCommissionByIdService,
    getSellerCommissionsService,
    toggleSellerCommissionStatusService,
    updateGlobalSellerCommissionSettingsService,
    updateSellerCommissionService
} from '../services/sellerCommission.service.js';

export const getSellerCommissions = async (_req, res) => {
    try {
        const data = await getSellerCommissionsService();
        return sendResponse(res, 200, 'Seller commissions fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch seller commissions');
    }
};

export const getSellerCommissionBootstrap = async (_req, res) => {
    try {
        const data = await getSellerCommissionBootstrapService();
        return sendResponse(res, 200, 'Seller commission bootstrap fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch seller commission bootstrap');
    }
};

export const getSellerCommissionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'Invalid commission id');
        }
        const commission = await getSellerCommissionByIdService(id);
        if (!commission) {
            return sendError(res, 404, 'Commission not found');
        }
        return sendResponse(res, 200, 'Commission fetched successfully', { commission });
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch commission');
    }
};

export const createSellerCommission = async (req, res) => {
    try {
        const body = validateSellerCommissionUpsertDto(req.body || {});
        const commission = await createSellerCommissionService(body);
        return sendResponse(res, 201, 'Commission created successfully', { commission });
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to create commission');
    }
};

export const updateSellerCommission = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'Invalid commission id');
        }
        const body = validateSellerCommissionUpsertDto(req.body || {});
        const commission = await updateSellerCommissionService(id, body);
        if (!commission) {
            return sendError(res, 404, 'Commission not found');
        }
        return sendResponse(res, 200, 'Commission updated successfully', { commission });
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update commission');
    }
};

export const deleteSellerCommission = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'Invalid commission id');
        }
        const result = await deleteSellerCommissionService(id);
        if (!result) {
            return sendError(res, 404, 'Commission not found');
        }
        return sendResponse(res, 200, 'Commission deleted successfully', result);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to delete commission');
    }
};

export const toggleSellerCommissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'Invalid commission id');
        }
        const commission = await toggleSellerCommissionStatusService(id);
        if (!commission) {
            return sendError(res, 404, 'Commission not found');
        }
        return sendResponse(res, 200, 'Status updated successfully', { commission });
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update status');
    }
};

export const updateGlobalSellerCommissionSettings = async (req, res) => {
    try {
        const body = validateQuickSellerGlobalCommissionSettingsDto(req.body || {});
        const data = await updateGlobalSellerCommissionSettingsService(body);
        return sendResponse(res, 200, 'Global seller commission settings updated successfully', data);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update global settings');
    }
};
