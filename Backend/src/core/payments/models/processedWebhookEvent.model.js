import mongoose from 'mongoose';

// A durable idempotency key for gateway deliveries. The unique index is the
// final guard when two copies of the same webhook arrive concurrently.
const processedWebhookEventSchema = new mongoose.Schema(
    {
        provider: { type: String, required: true, index: true },
        eventId: { type: String, required: true },
        eventType: { type: String, required: true },
        payloadHash: { type: String, required: true },
        status: { type: String, enum: ['processed'], default: 'processed' },
        processedAt: { type: Date, default: Date.now },
    },
    { collection: 'payment_processed_webhook_events', timestamps: true },
);

processedWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const ProcessedWebhookEvent = mongoose.model(
    'ProcessedWebhookEvent',
    processedWebhookEventSchema,
);
