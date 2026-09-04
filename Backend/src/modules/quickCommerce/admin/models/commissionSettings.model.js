import mongoose from 'mongoose';

const quickCommissionSettingsSchema = new mongoose.Schema(
    {
        globalSellerCommission: { type: Number, min: 0, default: 0 },
        globalGstOnItem: { type: Number, min: 0, max: 100, default: 0 },
        globalGstOnCommission: { type: Number, min: 0, max: 100, default: 18 },
        globalPaymentGatewayFee: { type: Number, min: 0, max: 100, default: 2 },
        globalTcs: { type: Number, min: 0, max: 100, default: 1 },
        applyGlobalTaxes: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true, index: true }
    },
    { collection: 'payment_quick_commerce_commission_settings', timestamps: true }
);

quickCommissionSettingsSchema.index({ isActive: 1, createdAt: -1 });

export const QuickCommerceCommissionSettings = mongoose.model('QuickCommerceCommissionSettings', quickCommissionSettingsSchema);
