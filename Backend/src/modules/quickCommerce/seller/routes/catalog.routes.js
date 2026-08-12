import express from 'express';
import { getSellerCategories, getSellerSubcategories } from '../controllers/catalog.controller.js';

const router = express.Router();

router.get('/categories', getSellerCategories);
router.get('/subcategories', getSellerSubcategories);

export default router;
