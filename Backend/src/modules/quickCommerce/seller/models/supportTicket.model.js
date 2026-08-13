import mongoose from 'mongoose';

const quickCommerceSellerSupportTicketSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuickCommerceSeller',
            required: true,
            index: true
        },
        category: {
            type: String,
            enum: ['orders', 'payments', 'catalog', 'seller', 'technical', 'other'],
            required: true
        },
        issueType: { type: String, required: true, trim: true },
        subject: { type: String, default: '', trim: true },
        description: { type: String, default: '', trim: true },
        orderRef: { type: String, default: '', trim: true },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
        status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open', index: true },
        adminResponse: { type: String, default: '' }
    },
    { collection: 'quick_commerce_seller_support_tickets', timestamps: true }
);

quickCommerceSellerSupportTicketSchema.index({ sellerId: 1, createdAt: -1 });
quickCommerceSellerSupportTicketSchema.index({ status: 1, createdAt: -1 });

export const QuickCommerceSellerSupportTicket = mongoose.model(
    'QuickCommerceSellerSupportTicket',
    quickCommerceSellerSupportTicketSchema
);
