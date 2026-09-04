import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickCommerceOrder', required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickCommerceSeller', required: true, index: true },
    paymentMethod: { type: String, enum: ['cash', 'razorpay', 'wallet'], required: true },
    status: { type: String, enum: ['pending', 'captured', 'failed', 'refunded'], default: 'pending', index: true },
    payment: {
        method: { type: String, required: true },
        status: { type: String, required: true },
        amountDuePaise: { type: Number, required: true, min: 0 },
        razorpay: {
            orderId: { type: String, default: '' },
            paymentId: { type: String, default: '' },
            signature: { type: String, default: '' }
        },
        refund: {
            status: { type: String, enum: ['none', 'pending', 'processed', 'failed'], default: 'none' },
            destination: { type: String, enum: ['source', 'wallet'], default: 'source' },
            amountPaise: { type: Number, default: 0, min: 0 },
            refundId: { type: String, default: '' },
            processedAt: { type: Date, default: null }
        }
    },
    amounts: {
        totalCustomerPaidPaise: { type: Number, required: true, min: 0 },
        sellerSharePaise: { type: Number, default: 0, min: 0 },
        riderSharePaise: { type: Number, default: 0, min: 0 },
        platformNetProfitPaise: { type: Number, default: 0 },
        taxAmountPaise: { type: Number, default: 0, min: 0 }
    },
    gateway: {
        provider: { type: String, default: 'razorpay' },
        razorpayOrderId: { type: String, default: '' },
        razorpayPaymentId: { type: String, default: '' },
        razorpaySignature: { type: String, default: '' }
    },
    history: [{ kind: { type: String, required: true }, amountPaise: { type: Number, min: 0 }, at: { type: Date, default: Date.now }, note: String }]
}, { collection: 'payment_quick_commerce_transactions', timestamps: true });

paymentTransactionSchema.index({ 'gateway.razorpayOrderId': 1 }, { unique: true, sparse: true });
paymentTransactionSchema.index({ 'gateway.razorpayPaymentId': 1 }, { unique: true, sparse: true });

export const QuickCommercePaymentTransaction = mongoose.model('QuickCommercePaymentTransaction', paymentTransactionSchema);
