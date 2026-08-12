import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const phoneSchema = z.string().min(8, 'Phone must be at least 8 digits').max(15, 'Phone must be at most 15 digits');

const requestOtpSchema = z.object({
    phone: phoneSchema
});

const verifyOtpSchema = z.object({
    phone: phoneSchema,
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    fcmToken: z.string().optional().nullable(),
    platform: z.enum(['web', 'mobile']).optional().default('web')
});

const registerSellerSchema = z.object({
    phone: phoneSchema,
    storeName: z.string().min(2, 'Store name is required').max(120, 'Store name is too long'),
    ownerName: z.string().min(2, 'Owner name is required').max(120, 'Owner name is too long'),
    ownerEmail: z.string().email('Valid owner email is required').optional().or(z.literal('')).default(''),
    businessType: z
        .enum(['grocery', 'pharmacy', 'pet-store', 'meat-store', 'florist', 'general-store', 'other'])
        .optional()
        .default('general-store'),
    alternatePhone: z.string().max(15, 'Alternate phone must be at most 15 digits').optional().or(z.literal('')).default(''),
    description: z.string().max(500, 'Description must be at most 500 characters').optional().or(z.literal('')).default(''),
    addressLine1: z.string().max(200).optional().or(z.literal('')).default(''),
    addressLine2: z.string().max(200).optional().or(z.literal('')).default(''),
    area: z.string().max(100).optional().or(z.literal('')).default(''),
    city: z.string().max(100).optional().or(z.literal('')).default(''),
    state: z.string().max(100).optional().or(z.literal('')).default(''),
    pincode: z.string().max(20).optional().or(z.literal('')).default(''),
    landmark: z.string().max(200).optional().or(z.literal('')).default(''),
    zoneId: z.string().optional().nullable(),
    panNumber: z.string().max(30).optional().or(z.literal('')).default(''),
    gstRegistered: z.boolean().optional().default(false),
    gstNumber: z.string().max(30).optional().or(z.literal('')).default(''),
    fssaiNumber: z.string().max(30).optional().or(z.literal('')).default(''),
    accountHolderName: z.string().max(120).optional().or(z.literal('')).default(''),
    accountNumber: z.string().max(40).optional().or(z.literal('')).default(''),
    ifscCode: z.string().max(20).optional().or(z.literal('')).default(''),
    upiId: z.string().max(120).optional().or(z.literal('')).default(''),
    profileImage: z.string().optional().or(z.literal('')).default(''),
    coverImage: z.string().optional().or(z.literal('')).default(''),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    formattedAddress: z.string().max(300).optional().or(z.literal('')).default(''),
    documents: z
        .object({
            panImage: z.string().optional().or(z.literal('')).default(''),
            gstImage: z.string().optional().or(z.literal('')).default(''),
            fssaiImage: z.string().optional().or(z.literal('')).default(''),
            storeImage: z.string().optional().or(z.literal('')).default(''),
            cancelledChequeImage: z.string().optional().or(z.literal('')).default('')
        })
        .optional()
        .default({})
});

const updateSellerProfileSchema = registerSellerSchema.omit({ phone: true }).partial();

const parse = (schema, body) => {
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};

export const validateQuickCommerceSellerOtpRequest = (body) => parse(requestOtpSchema, body);
export const validateQuickCommerceSellerOtpVerify = (body) => parse(verifyOtpSchema, body);
export const validateQuickCommerceSellerRegister = (body) => parse(registerSellerSchema, body);
export const validateQuickCommerceSellerProfileUpdate = (body) => parse(updateSellerProfileSchema, body);
