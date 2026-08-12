import express from 'express';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import { authRateLimiter } from '../../../../middleware/rateLimit.js';
import {
    getCurrentQuickCommerceSellerController,
    registerQuickCommerceSellerController,
    requestQuickCommerceSellerOtpController,
    updateCurrentQuickCommerceSellerController,
    verifyQuickCommerceSellerOtpController
} from '../controllers/sellerAuth.controller.js';

const router = express.Router();

router.post('/auth/request-otp', authRateLimiter, requestQuickCommerceSellerOtpController);
router.post('/auth/verify-otp', authRateLimiter, verifyQuickCommerceSellerOtpController);
router.post('/auth/register', authRateLimiter, registerQuickCommerceSellerController);

router.get('/me', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), getCurrentQuickCommerceSellerController);
router.patch('/profile', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), updateCurrentQuickCommerceSellerController);

export default router;
