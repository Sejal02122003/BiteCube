import express from 'express';
import {
    getSellerOrderByIdController,
    listSellerOrdersController,
    resendDeliveryNotificationSellerController,
    updateSellerOrderStatusController
} from '../controllers/order.controller.js';

const router = express.Router();

router.get('/', listSellerOrdersController);
router.get('/:orderId', getSellerOrderByIdController);
router.patch('/:orderId/status', updateSellerOrderStatusController);
router.post('/:orderId/resend-notification', resendDeliveryNotificationSellerController);

export default router;
