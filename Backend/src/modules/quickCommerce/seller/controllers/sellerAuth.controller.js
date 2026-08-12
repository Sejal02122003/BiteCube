import { sendResponse } from '../../../../utils/response.js';
import {
    getQuickCommerceSellerProfile,
    registerQuickCommerceSeller,
    requestQuickCommerceSellerOtp,
    updateQuickCommerceSellerAvailability,
    updateQuickCommerceSellerProfile,
    verifyQuickCommerceSellerOtpAndLogin
} from '../services/sellerAuth.service.js';
import {
    validateQuickCommerceSellerOtpRequest,
    validateQuickCommerceSellerOtpVerify,
    validateQuickCommerceSellerProfileUpdate,
    validateQuickCommerceSellerRegister
} from '../validators/sellerAuth.validator.js';

export const requestQuickCommerceSellerOtpController = async (req, res, next) => {
    try {
        const { phone } = validateQuickCommerceSellerOtpRequest(req.body);
        const result = await requestQuickCommerceSellerOtp(phone);
        return sendResponse(res, 200, 'OTP sent successfully', { phone, ...result });
    } catch (error) {
        next(error);
    }
};

export const verifyQuickCommerceSellerOtpController = async (req, res, next) => {
    try {
        const { phone, otp, fcmToken, platform } = validateQuickCommerceSellerOtpVerify(req.body);
        const result = await verifyQuickCommerceSellerOtpAndLogin(phone, otp, fcmToken, platform);
        return sendResponse(res, 200, 'Authentication successful', result);
    } catch (error) {
        next(error);
    }
};

export const registerQuickCommerceSellerController = async (req, res, next) => {
    try {
        const payload = validateQuickCommerceSellerRegister(req.body);
        const result = await registerQuickCommerceSeller(payload);
        return sendResponse(res, 201, 'Quick commerce seller registered successfully', result);
    } catch (error) {
        next(error);
    }
};

export const getCurrentQuickCommerceSellerController = async (req, res, next) => {
    try {
        const result = await getQuickCommerceSellerProfile(req.user?.userId);
        return sendResponse(res, 200, 'Seller profile fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

export const updateCurrentQuickCommerceSellerController = async (req, res, next) => {
    try {
        const payload = validateQuickCommerceSellerProfileUpdate(req.body || {});
        const result = await updateQuickCommerceSellerProfile(req.user?.userId, payload);
        return sendResponse(res, 200, 'Seller profile updated successfully', result);
    } catch (error) {
        next(error);
    }
};

export const updateQuickCommerceSellerAvailabilityController = async (req, res, next) => {
    try {
        const result = await updateQuickCommerceSellerAvailability(
            req.user?.userId,
            req.body?.isAcceptingOrders
        );
        return sendResponse(res, 200, 'Seller availability updated successfully', result);
    } catch (error) {
        next(error);
    }
};
