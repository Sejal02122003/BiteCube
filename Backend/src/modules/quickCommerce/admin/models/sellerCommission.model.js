import mongoose from 'mongoose';

const sellerCommissionSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuickCommerceSeller',
            required: true,
            unique: true,
            index: true
        },
        defaultCommission: {
            type: {
                type: String,
                enum: ['percentage', 'amount'],
                default: 'percentage'
            },
            value: { type: Number, default: 0 }
        },
        notes: { type: String, trim: true, default: '' },
        status: { type: Boolean, default: true, index: true }
    },
    { collection: 'quick_commerce_seller_commissions', timestamps: true }
);

export const QuickCommerceSellerCommission = mongoose.model('QuickCommerceSellerCommission', sellerCommissionSchema);
