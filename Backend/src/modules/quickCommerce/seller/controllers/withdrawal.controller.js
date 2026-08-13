import { sendError, sendResponse } from '../../../../utils/response.js';
import { QuickCommerceSellerWithdrawal } from '../models/sellerWithdrawal.model.js';
import { getSellerFinance } from '../services/sellerFinance.service.js';

export const createSellerWithdrawalRequestController = async (req, res, next) => {
    try {
        const sellerId = req.user?.userId;
        const { amount, bankDetails } = req.body || {};

        if (!sellerId) return sendError(res, 401, 'Seller authentication required');
        if (!amount || Number(amount) <= 0) return sendError(res, 400, 'Invalid withdrawal amount');

        const finance = await getSellerFinance(sellerId);
        const availableBalance = Number(finance?.currentCycle?.estimatedPayout || 0);

        if (Number(amount) > availableBalance) {
            return sendError(res, 400, `Insufficient balance. Available: Rs.${availableBalance}`);
        }

        const withdrawal = new QuickCommerceSellerWithdrawal({
            sellerId,
            amount: Number(amount),
            bankDetails: bankDetails || {},
            status: 'pending'
        });

        await withdrawal.save();
        return sendResponse(res, 201, 'Withdrawal request submitted successfully', withdrawal);
    } catch (error) {
        next(error);
    }
};

export const listMySellerWithdrawalsController = async (req, res, next) => {
    try {
        const sellerId = req.user?.userId;
        if (!sellerId) return sendError(res, 401, 'Seller authentication required');

        const withdrawals = await QuickCommerceSellerWithdrawal.find({ sellerId })
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Withdrawals fetched successfully', withdrawals);
    } catch (error) {
        next(error);
    }
};
