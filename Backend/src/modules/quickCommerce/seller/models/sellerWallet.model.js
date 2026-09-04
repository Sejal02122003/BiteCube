import mongoose from 'mongoose';

const sellerWalletSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuickCommerceSeller',
            required: true,
            unique: true,
            index: true
        },
        balance: { type: Number, default: 0, min: 0 },
        balancePaise: { type: Number, default: 0, min: 0 },
        lockedAmount: { type: Number, default: 0, min: 0 },
        totalEarnings: { type: Number, default: 0, min: 0 },
        totalSettled: { type: Number, default: 0, min: 0 }
    },
    { collection: 'payment_quick_commerce_seller_wallets', timestamps: true }
);

export const QuickCommerceSellerWallet = mongoose.model('QuickCommerceSellerWallet', sellerWalletSchema);
