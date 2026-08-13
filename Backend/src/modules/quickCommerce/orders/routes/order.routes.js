import express from 'express';
import { calculateQuickOrderController, createQuickOrderController, verifyQuickPaymentController, listQuickOrdersController, getQuickOrderController, cancelQuickOrderController } from '../controllers/order.controller.js';

const router = express.Router();
router.post('/calculate', calculateQuickOrderController);
router.post('/', createQuickOrderController);
router.post('/verify-payment', verifyQuickPaymentController);
router.get('/', listQuickOrdersController);
router.get('/:orderId', getQuickOrderController);
router.patch('/:orderId/cancel', cancelQuickOrderController);
export default router;
