import { sendError, sendResponse } from '../../../../utils/response.js';
import {
    getQuickSellerWithdrawalsService,
    updateQuickSellerWithdrawalStatusService
} from '../services/sellerWithdrawal.service.js';

export const getQuickSellerWithdrawals = async (req, res) => {
    try {
        const data = await getQuickSellerWithdrawalsService(req.query || {});
        return sendResponse(res, 200, 'Quick seller withdrawals fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch quick seller withdrawals');
    }
};

export const updateQuickSellerWithdrawalStatus = async (req, res) => {
    try {
        const data = await updateQuickSellerWithdrawalStatusService(req.params.id, req.body || {});
        return sendResponse(res, 200, 'Quick seller withdrawal status updated successfully', data);
    } catch (error) {
        return sendError(res, 400, error.message || 'Failed to update quick seller withdrawal status');
    }
};
