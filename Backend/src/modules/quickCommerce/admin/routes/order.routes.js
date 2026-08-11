import express from 'express';
import * as orderController from '../controllers/order.controller.js';

const router = express.Router();

router.get('/', orderController.listOrdersAdminController);
router.get('/:orderId', orderController.getOrderByIdAdminController);
router.patch('/:orderId/status', orderController.updateOrderStatusAdminController);
router.delete('/:orderId', orderController.deleteOrderAdminController);
router.post('/:orderId/assign-delivery', orderController.assignDeliveryPartnerController);
router.post('/:orderId/resend-notification', orderController.resendDeliveryNotificationAdminController);

export default router;
