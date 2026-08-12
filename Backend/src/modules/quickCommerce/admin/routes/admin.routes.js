import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import categoryRoutes from './category.routes.js';
import subcategoryRoutes from './subcategory.routes.js';
import productRoutes from './product.routes.js';
import orderRoutes from './order.routes.js';
import quickHeroBannerRoutes from './quickHeroBanner.routes.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';

const router = express.Router();

// Apply auth and admin roles to all Quick Commerce admin routes
router.use(authMiddleware);
router.use(requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'));

// Dashboard route
router.get('/dashboard', getDashboardStats);

// Category, Subcategory & Product Management routes
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/hero-banners', quickHeroBannerRoutes);

export default router;



