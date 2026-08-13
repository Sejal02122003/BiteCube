import { sendResponse } from '../../../../utils/response.js';
import * as service from '../services/quickDelivery.service.js';

const wrap = (handler, message) => async (req, res, next) => { try { const result = await handler(req.params.orderId, req.user?.userId, req.body || {}); return sendResponse(res, 200, message, result?.order ? result : { order: result }); } catch (error) { next(error); } };
export const getQuickDeliveryOrderController = wrap((id, rider) => service.getQuickDeliveryOrder(id, rider), 'Quick delivery order fetched');
export const acceptQuickDeliveryController = wrap((id, rider) => service.acceptQuickDelivery(id, rider), 'Quick delivery accepted');
export const rejectQuickDeliveryController = wrap((id, rider) => service.rejectQuickDelivery(id, rider), 'Quick delivery rejected');
export const reachQuickPickupController = wrap((id, rider) => service.reachQuickPickup(id, rider), 'Reached seller');
export const requestQuickPickupOtpController = wrap((id, rider) => service.requestQuickPickupOtp(id, rider), 'Pickup OTP requested');
export const confirmQuickPickupController = wrap((id, rider, body) => service.confirmQuickPickup(id, rider, body.otp), 'Quick order picked up');
export const reachQuickDropController = wrap((id, rider) => service.reachQuickDrop(id, rider), 'Reached customer');
export const verifyQuickDropOtpController = wrap((id, rider, body) => service.verifyQuickDropOtp(id, rider, body.otp), 'Delivery OTP verified');
export const completeQuickDeliveryController = wrap((id, rider, body) => service.completeQuickDelivery(id, rider, body), 'Quick delivery completed');
