import crypto from 'crypto';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';
import { processRazorpayWebhook } from '../foodFinance.service.js';

/** Centralized, idempotent Razorpay webhook handler for food payments. */
export const handleRazorpayWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = config.razorpayWebhookSecret;

    if (!signature || !secret || !req.rawBody) {
        logger.warn('Razorpay Webhook: missing signature or raw body.');
        return res.status(400).send('Invalid signature');
    }

    const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    if (expected !== signature) {
        logger.warn('Razorpay Webhook: signature verification failed.');
        return res.status(400).send('Invalid signature');
    }

    const { event, payload } = req.body;
    if (!event || !payload) return res.status(400).send('Invalid webhook payload');

    try {
        const payloadHash = crypto.createHash('sha256').update(req.rawBody).digest('hex');
        // The payload hash safely identifies retries when an older delivery has
        // no Razorpay event-id header.
        const eventId = String(req.headers['x-razorpay-event-id'] || payloadHash);
        const result = await processRazorpayWebhook({
            eventId,
            eventType: event,
            payloadHash,
            payload,
        });
        logger.info(`Razorpay webhook ${event}: ${result.duplicate ? 'duplicate' : 'processed'}`);
        return res.status(200).json({ status: 'ok', duplicate: result.duplicate });
    } catch (err) {
        // Return non-2xx so Razorpay retries. We must not acknowledge a webhook
        // whose ledger and order snapshot could not commit together.
        logger.error(`Razorpay Webhook Logic Error: ${err.message}`);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
