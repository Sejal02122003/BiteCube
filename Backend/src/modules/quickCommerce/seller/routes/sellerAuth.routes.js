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
import { getSellerFinanceController } from '../controllers/sellerFinance.controller.js';
import {
    createSellerWithdrawalRequestController,
    listMySellerWithdrawalsController
} from '../controllers/withdrawal.controller.js';
import sellerProductRoutes from './product.routes.js';
import sellerCatalogRoutes from './catalog.routes.js';
import sellerOrderRoutes from './order.routes.js';

const router = express.Router();

router.post('/auth/request-otp', authRateLimiter, requestQuickCommerceSellerOtpController);
router.post('/auth/verify-otp', authRateLimiter, verifyQuickCommerceSellerOtpController);
router.post('/auth/register', authRateLimiter, registerQuickCommerceSellerController);

router.get('/me', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), getCurrentQuickCommerceSellerController);
router.patch('/profile', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), updateCurrentQuickCommerceSellerController);
router.get('/finance', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), getSellerFinanceController);
router.post('/withdraw', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), createSellerWithdrawalRequestController);
router.get('/withdrawals', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), listMySellerWithdrawalsController);
router.use('/products', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), sellerProductRoutes);
router.use('/catalog', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), sellerCatalogRoutes);
router.use('/orders', authMiddleware, requireRoles('QUICK_COMMERCE_SELLER'), sellerOrderRoutes);

export default router;
