import ms from 'ms';
import mongoose from 'mongoose';
import { createOrUpdateOtp, verifyOtp } from '../../../../core/otp/otp.service.js';
import { FoodRefreshToken } from '../../../../core/refreshTokens/refreshToken.model.js';
import { AuthError, NotFoundError, ValidationError } from '../../../../core/auth/errors.js';
import { signAccessToken, signRefreshToken } from '../../../../core/auth/token.util.js';
import { config } from '../../../../config/env.js';
import { QuickCommerceSeller } from '../models/seller.model.js';

const QUICK_COMMERCE_SELLER_ROLE = 'QUICK_COMMERCE_SELLER';

const toSafeImageUrl = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.url || value.secure_url || '';
    return '';
};

const normalizePhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    return {
        digits,
        last10: digits.slice(-10)
    };
};

const buildLocationPayload = (payload = {}) => {
    const hasCoordinates =
        Number.isFinite(payload.longitude) && Number.isFinite(payload.latitude);
    const hasAddress =
        payload.formattedAddress ||
        payload.addressLine1 ||
        payload.addressLine2 ||
        payload.area ||
        payload.city ||
        payload.state ||
        payload.pincode ||
        payload.landmark;

    if (!hasCoordinates && !hasAddress) {
        return undefined;
    }

    return {
        type: 'Point',
        coordinates: hasCoordinates ? [Number(payload.longitude), Number(payload.latitude)] : undefined,
        latitude: Number.isFinite(payload.latitude) ? Number(payload.latitude) : undefined,
        longitude: Number.isFinite(payload.longitude) ? Number(payload.longitude) : undefined,
        formattedAddress: payload.formattedAddress || '',
        addressLine1: payload.addressLine1 || '',
        addressLine2: payload.addressLine2 || '',
        area: payload.area || '',
        city: payload.city || '',
        state: payload.state || '',
        pincode: payload.pincode || '',
        landmark: payload.landmark || ''
    };
};

const sanitizeQuickCommerceSellerForAuthResponse = (sellerDoc = {}) => {
    const id = sellerDoc?._id?.toString?.() || sellerDoc?.id?.toString?.() || sellerDoc?._id || sellerDoc?.id || null;
    return {
        id,
        _id: id,
        name: sellerDoc?.storeName || '',
        storeName: sellerDoc?.storeName || '',
        ownerName: sellerDoc?.ownerName || '',
        phone: sellerDoc?.ownerPhone || '',
        email: sellerDoc?.ownerEmail || '',
        role: QUICK_COMMERCE_SELLER_ROLE,
        status: sellerDoc?.status || 'pending',
        profileImage: toSafeImageUrl(sellerDoc?.profileImage),
        coverImage: toSafeImageUrl(sellerDoc?.coverImage),
        businessType: sellerDoc?.businessType || 'general-store',
        isActive: sellerDoc?.isActive !== false,
        isAcceptingOrders: sellerDoc?.isAcceptingOrders !== false,
        createdAt: sellerDoc?.createdAt
    };
};

const issueTokens = async (sellerDoc) => {
    const payload = {
        userId: sellerDoc._id.toString(),
        role: QUICK_COMMERCE_SELLER_ROLE
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const ttlMs = ms(config.jwtRefreshExpiresIn || '7d');

    await FoodRefreshToken.create({
        userId: sellerDoc._id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + ttlMs)
    });

    return {
        token: accessToken,
        accessToken,
        refreshToken
    };
};

const attachFcmToken = async (sellerDoc, fcmToken, platform) => {
    if (!fcmToken) return;

    let modified = false;
    if (platform === 'mobile') {
        if (!Array.isArray(sellerDoc.fcmTokenMobile)) sellerDoc.fcmTokenMobile = [];
        if (!sellerDoc.fcmTokenMobile.includes(fcmToken)) {
            sellerDoc.fcmTokenMobile.push(fcmToken);
            modified = true;
        }
    } else {
        if (!Array.isArray(sellerDoc.fcmTokens)) sellerDoc.fcmTokens = [];
        if (!sellerDoc.fcmTokens.includes(fcmToken)) {
            sellerDoc.fcmTokens.push(fcmToken);
            modified = true;
        }
    }

    if (modified) {
        await sellerDoc.save();
    }
};

const findSellerByPhone = async (phone) => {
    const { digits, last10 } = normalizePhone(phone);
    const candidates = [phone, digits, last10].filter(Boolean);

    return QuickCommerceSeller.findOne({
        $or: [
            { ownerPhone: { $in: candidates } },
            { ownerPhoneDigits: { $in: candidates } },
            { ownerPhoneLast10: { $in: candidates } },
            ...(last10 ? [{ ownerPhone: { $regex: new RegExp(`${last10}$`) } }] : [])
        ]
    });
};

export const requestQuickCommerceSellerOtp = async (phone) => {
    if (!phone) {
        throw new ValidationError('Phone is required');
    }

    const otp = await createOrUpdateOtp(phone);
    const shouldExposeOtp = config.nodeEnv !== 'production' || config.useDefaultOtp;
    return shouldExposeOtp ? { otp } : {};
};

export const verifyQuickCommerceSellerOtpAndLogin = async (phone, otp, fcmToken, platform) => {
    const result = await verifyOtp(phone, otp);
    if (!result.valid) {
        throw new AuthError(result.reason || 'OTP verification failed');
    }

    const sellerDoc = await findSellerByPhone(phone);
    if (!sellerDoc) {
        return {
            needsRegistration: true,
            phone
        };
    }

    if (sellerDoc.isActive === false) {
        throw new AuthError('Seller account is deactivated. Please contact support.');
    }

    await attachFcmToken(sellerDoc, fcmToken, platform);

    if (sellerDoc.status !== 'approved') {
        return {
            pendingApproval: true,
            status: sellerDoc.status,
            isRejected: sellerDoc.status === 'rejected',
            rejectionReason: sellerDoc.rejectionReason || null,
            phone
        };
    }

    const tokens = await issueTokens(sellerDoc);
    return {
        ...tokens,
        user: sanitizeQuickCommerceSellerForAuthResponse(sellerDoc.toObject()),
        needsRegistration: false
    };
};

export const registerQuickCommerceSeller = async (payload = {}) => {
    const existing = await findSellerByPhone(payload.phone);
    if (existing) {
        throw new ValidationError('Seller already registered with this phone number');
    }

    const zoneId = payload.zoneId && mongoose.Types.ObjectId.isValid(payload.zoneId)
        ? new mongoose.Types.ObjectId(payload.zoneId)
        : undefined;

    const seller = await QuickCommerceSeller.create({
        storeName: payload.storeName,
        ownerName: payload.ownerName,
        ownerEmail: payload.ownerEmail || '',
        ownerPhone: payload.phone,
        alternatePhone: payload.alternatePhone || '',
        businessType: payload.businessType || 'general-store',
        description: payload.description || '',
        profileImage: payload.profileImage || '',
        coverImage: payload.coverImage || '',
        addressLine1: payload.addressLine1 || '',
        addressLine2: payload.addressLine2 || '',
        area: payload.area || '',
        city: payload.city || '',
        state: payload.state || '',
        pincode: payload.pincode || '',
        landmark: payload.landmark || '',
        location: buildLocationPayload(payload),
        zoneId,
        panNumber: payload.panNumber || '',
        gstRegistered: Boolean(payload.gstRegistered),
        gstNumber: payload.gstNumber || '',
        fssaiNumber: payload.fssaiNumber || '',
        accountHolderName: payload.accountHolderName || '',
        accountNumber: payload.accountNumber || '',
        ifscCode: payload.ifscCode || '',
        upiId: payload.upiId || '',
        documents: {
            panImage: payload.documents?.panImage || '',
            gstImage: payload.documents?.gstImage || '',
            fssaiImage: payload.documents?.fssaiImage || '',
            storeImage: payload.documents?.storeImage || '',
            cancelledChequeImage: payload.documents?.cancelledChequeImage || ''
        }
    });

    return {
        seller: sanitizeQuickCommerceSellerForAuthResponse(seller.toObject()),
        pendingApproval: seller.status !== 'approved'
    };
};

export const getQuickCommerceSellerProfile = async (sellerId) => {
    const seller = await QuickCommerceSeller.findById(sellerId).lean();
    if (!seller) {
        throw new NotFoundError('Seller not found');
    }

    return {
        seller: {
            ...sanitizeQuickCommerceSellerForAuthResponse(seller),
            ownerEmail: seller.ownerEmail || '',
            alternatePhone: seller.alternatePhone || '',
            description: seller.description || '',
            addressLine1: seller.addressLine1 || '',
            addressLine2: seller.addressLine2 || '',
            area: seller.area || '',
            city: seller.city || '',
            state: seller.state || '',
            pincode: seller.pincode || '',
            landmark: seller.landmark || '',
            zoneId: seller.zoneId || null,
            panNumber: seller.panNumber || '',
            gstRegistered: Boolean(seller.gstRegistered),
            gstNumber: seller.gstNumber || '',
            fssaiNumber: seller.fssaiNumber || '',
            accountHolderName: seller.accountHolderName || '',
            accountNumber: seller.accountNumber || '',
            ifscCode: seller.ifscCode || '',
            upiId: seller.upiId || '',
            documents: seller.documents || {},
            location: seller.location || null
        }
    };
};

export const updateQuickCommerceSellerProfile = async (sellerId, payload = {}) => {
    const seller = await QuickCommerceSeller.findById(sellerId);
    if (!seller) {
        throw new NotFoundError('Seller not found');
    }

    const assignableFields = [
        'storeName',
        'ownerName',
        'ownerEmail',
        'alternatePhone',
        'businessType',
        'description',
        'profileImage',
        'coverImage',
        'addressLine1',
        'addressLine2',
        'area',
        'city',
        'state',
        'pincode',
        'landmark',
        'panNumber',
        'gstRegistered',
        'gstNumber',
        'fssaiNumber',
        'accountHolderName',
        'accountNumber',
        'ifscCode',
        'upiId'
    ];

    for (const field of assignableFields) {
        if (payload[field] !== undefined) {
            seller[field] = payload[field];
        }
    }

    if (payload.zoneId !== undefined) {
        seller.zoneId =
            payload.zoneId && mongoose.Types.ObjectId.isValid(payload.zoneId)
                ? new mongoose.Types.ObjectId(payload.zoneId)
                : undefined;
    }

    if (payload.documents) {
        seller.documents = {
            ...seller.documents?.toObject?.(),
            ...payload.documents
        };
    }

    const location = buildLocationPayload(payload);
    if (location) {
        seller.location = {
            ...(seller.location?.toObject?.() || {}),
            ...location
        };
    }

    await seller.save();

    return {
        seller: {
            ...(await getQuickCommerceSellerProfile(seller._id)).seller
        }
    };
};

export const QUICK_COMMERCE_SELLER_ROLE_NAME = QUICK_COMMERCE_SELLER_ROLE;
export const sanitizeQuickCommerceSellerProfile = sanitizeQuickCommerceSellerForAuthResponse;
