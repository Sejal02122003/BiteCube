import express from 'express';
import {
    getSellerOrderByIdController,
    listSellerOrdersController,
    updateSellerOrderStatusController
} from '../controllers/order.controller.js';

const router = express.Router();

router.get('/', listSellerOrdersController);
router.get('/:orderId', getSellerOrderByIdController);
router.patch('/:orderId/status', updateSellerOrderStatusController);

export default router;
