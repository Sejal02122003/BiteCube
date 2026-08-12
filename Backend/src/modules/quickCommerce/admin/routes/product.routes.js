import express from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
    updateLowestPriceEverSelection
} from '../controllers/product.controller.js';

const router = express.Router();

// Routes relative to /v1/quick-commerce/admin/products
router.route('/')
    .post(createProduct)
    .get(getProducts);

router.route('/:id')
    .get(getProductById)
    .put(updateProduct)
    .delete(deleteProduct);

router.patch('/:id/status', toggleProductStatus);
router.patch('/:id/lowest-price-ever', updateLowestPriceEverSelection);

export default router;
