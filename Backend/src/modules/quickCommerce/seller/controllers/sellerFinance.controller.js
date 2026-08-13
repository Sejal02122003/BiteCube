import { sendError, sendResponse } from '../../../../utils/response.js';
import { getSellerFinance } from '../services/sellerFinance.service.js';

export const getSellerFinanceController = async (req, res, next) => {
    try {
        const sellerId = req.user?.userId;
        if (!sellerId) return sendError(res, 401, 'Seller authentication required');

        const data = await getSellerFinance(sellerId, req.query || {});
        return sendResponse(res, 200, 'Finance fetched successfully', data);
    } catch (error) {
        next(error);
    }
};
