import { sendResponse } from '../../../../utils/response.js';
import * as orderService from '../services/order.service.js';

export async function calculateQuickOrderController(req, res, next) {
    try { return sendResponse(res, 200, 'Quick order pricing calculated', await orderService.calculateQuickOrder(req.user?.userId, req.body)); }
    catch (error) { next(error); }
}
export async function createQuickOrderController(req, res, next) {
    try { return sendResponse(res, 201, 'Quick order placed successfully', await orderService.createQuickOrder(req.user?.userId, req.body, req.get('Idempotency-Key'))); }
    catch (error) { next(error); }
}
export async function verifyQuickPaymentController(req, res, next) {
    try { return sendResponse(res, 200, 'Quick order payment verified', await orderService.verifyQuickPayment(req.user?.userId, req.body)); }
    catch (error) { next(error); }
}
export async function listQuickOrdersController(req, res, next) {
    try { return sendResponse(res, 200, 'Quick orders fetched', await orderService.listQuickOrders(req.user?.userId, req.query)); }
    catch (error) { next(error); }
}
export async function getQuickOrderController(req, res, next) {
    try { return sendResponse(res, 200, 'Quick order fetched', { order: await orderService.getQuickOrder(req.user?.userId, req.params.orderId) }); }
    catch (error) { next(error); }
}
export async function cancelQuickOrderController(req, res, next) {
    try { return sendResponse(res, 200, 'Quick order cancelled', { order: await orderService.cancelQuickOrder(req.user?.userId, req.params.orderId, req.body?.reason) }); }
    catch (error) { next(error); }
}
