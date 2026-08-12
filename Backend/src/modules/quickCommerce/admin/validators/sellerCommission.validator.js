import mongoose from 'mongoose';
import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const sellerCommissionUpsertSchema = z.object({
    sellerId: z.string().min(1, 'Seller is required'),
    defaultCommission: z.object({
        type: z.enum(['percentage', 'amount']).default('percentage'),
        value: z.number().min(0, 'Commission value must be 0 or greater')
    }),
    notes: z.string().optional().or(z.literal(''))
});

const quickGlobalSettingsSchema = z.object({
    globalSellerCommission: z.number().min(0).optional(),
    globalGstOnItem: z.number().min(0).max(100).optional(),
    globalGstOnCommission: z.number().min(0).max(100).optional(),
    globalPaymentGatewayFee: z.number().min(0).max(100).optional(),
    globalTcs: z.number().min(0).max(100).optional(),
    applyGlobalTaxes: z.boolean().optional()
});

export const validateSellerCommissionUpsertDto = (body) => {
    const normalized = {
        sellerId: body?.sellerId ? String(body.sellerId) : '',
        defaultCommission: {
            type: body?.defaultCommission?.type,
            value: Number(body?.defaultCommission?.value)
        },
        notes: body?.notes != null ? String(body.notes) : ''
    };

    const result = sellerCommissionUpsertSchema.safeParse(normalized);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    if (!mongoose.Types.ObjectId.isValid(result.data.sellerId)) {
        throw new ValidationError('Invalid sellerId');
    }
    if (
        result.data.defaultCommission.type === 'percentage' &&
        (result.data.defaultCommission.value < 0 || result.data.defaultCommission.value > 100)
    ) {
        throw new ValidationError('Percentage must be between 0-100');
    }

    return {
        sellerId: result.data.sellerId,
        defaultCommission: result.data.defaultCommission,
        notes: result.data.notes ? result.data.notes.trim() : ''
    };
};

export const validateQuickSellerGlobalCommissionSettingsDto = (body) => {
    const normalized = {
        globalSellerCommission: body?.globalSellerCommission !== undefined ? Number(body.globalSellerCommission) : undefined,
        globalGstOnItem: body?.globalGstOnItem !== undefined ? Number(body.globalGstOnItem) : undefined,
        globalGstOnCommission: body?.globalGstOnCommission !== undefined ? Number(body.globalGstOnCommission) : undefined,
        globalPaymentGatewayFee: body?.globalPaymentGatewayFee !== undefined ? Number(body.globalPaymentGatewayFee) : undefined,
        globalTcs: body?.globalTcs !== undefined ? Number(body.globalTcs) : undefined,
        applyGlobalTaxes: body?.applyGlobalTaxes !== undefined ? Boolean(body.applyGlobalTaxes) : undefined
    };

    const result = quickGlobalSettingsSchema.safeParse(normalized);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};
