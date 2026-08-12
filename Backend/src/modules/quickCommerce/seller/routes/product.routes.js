import express from 'express';
import {
    createSellerProduct,
    deleteSellerProduct,
    getSellerProductById,
    getSellerProducts,
    toggleSellerProductStatus,
    updateSellerProduct
} from '../controllers/product.controller.js';

const router = express.Router();

router.route('/')
    .post(createSellerProduct)
    .get(getSellerProducts);

router.route('/:id')
    .get(getSellerProductById)
    .put(updateSellerProduct)
    .delete(deleteSellerProduct);

router.patch('/:id/status', toggleSellerProductStatus);

export default router;
