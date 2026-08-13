import mongoose from 'mongoose';

const quickCommerceSellerWithdrawalSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuickCommerceSeller',
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Minimum withdrawal amount is Rs. 1']
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'processed', 'rejected'],
            default: 'pending',
            index: true
        },
        paymentMethod: {
            type: String,
            default: 'bank_transfer'
        },
        bankDetails: {
            accountNumber: String,
            ifscCode: String,
            bankName: String,
            accountHolderName: String,
            upiId: String
        },
        adminNote: String,
        rejectionReason: String,
        transactionId: String,
        processedAt: Date
    },
    {
        collection: 'quick_commerce_seller_withdrawals',
        timestamps: true
    }
);

quickCommerceSellerWithdrawalSchema.index({ createdAt: -1 });

export const QuickCommerceSellerWithdrawal = mongoose.model('QuickCommerceSellerWithdrawal', quickCommerceSellerWithdrawalSchema);
