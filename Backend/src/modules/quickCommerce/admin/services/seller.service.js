import mongoose from 'mongoose';
import { QuickCommerceSeller } from '../../seller/models/seller.model.js';
import { deleteManagedUploadsByUrls } from '../../../../services/upload.service.js';

const generateSlug = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const buildLocationPayload = (payload = {}, currentLocation = null) => {
    const nextLocation = {
        ...(currentLocation?.toObject?.() || currentLocation || {})
    };

    const hasLat = payload.latitude !== undefined && payload.latitude !== null && payload.latitude !== '';
    const hasLng = payload.longitude !== undefined && payload.longitude !== null && payload.longitude !== '';

    if (hasLat) nextLocation.latitude = Number(payload.latitude);
    if (hasLng) nextLocation.longitude = Number(payload.longitude);
    if (Number.isFinite(nextLocation.latitude) && Number.isFinite(nextLocation.longitude)) {
        nextLocation.type = 'Point';
        nextLocation.coordinates = [nextLocation.longitude, nextLocation.latitude];
    }

    const addressFields = ['formattedAddress', 'addressLine1', 'addressLine2', 'area', 'city', 'state', 'pincode', 'landmark'];
    for (const field of addressFields) {
        if (payload[field] !== undefined) {
            nextLocation[field] = payload[field] || '';
        }
    }

    return Object.keys(nextLocation).length ? nextLocation : undefined;
};

const sanitizeSeller = (seller = {}) => ({
    id: seller?._id?.toString?.() || seller?._id || null,
    _id: seller?._id?.toString?.() || seller?._id || null,
    storeName: seller.storeName || '',
    slug: seller.slug || '',
    ownerName: seller.ownerName || '',
    ownerEmail: seller.ownerEmail || '',
    ownerPhone: seller.ownerPhone || '',
    alternatePhone: seller.alternatePhone || '',
    businessType: seller.businessType || 'general-store',
    description: seller.description || '',
    profileImage: seller.profileImage || '',
    coverImage: seller.coverImage || '',
    addressLine1: seller.addressLine1 || '',
    addressLine2: seller.addressLine2 || '',
    area: seller.area || '',
    city: seller.city || '',
    state: seller.state || '',
    pincode: seller.pincode || '',
    landmark: seller.landmark || '',
    location: seller.location || null,
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
    isActive: seller.isActive !== false,
    isAcceptingOrders: seller.isAcceptingOrders !== false,
    status: seller.status || 'pending',
    approvedAt: seller.approvedAt || null,
    rejectedAt: seller.rejectedAt || null,
    rejectionReason: seller.rejectionReason || '',
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt
});

export const getSellersService = async (query = {}) => {
    const {
        search = '',
        status = 'all',
        activity = 'all',
        businessType = 'all',
        zoneId,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = query;

    const filter = {};

    if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { storeName: regex },
            { slug: regex },
            { ownerName: regex },
            { ownerEmail: regex },
            { ownerPhone: regex },
            { city: regex }
        ];
    }

    if (status !== 'all') {
        filter.status = status;
    }

    if (activity === 'active') filter.isActive = true;
    if (activity === 'inactive') filter.isActive = false;

    if (businessType !== 'all') {
        filter.businessType = businessType;
    }

    if (zoneId && mongoose.Types.ObjectId.isValid(zoneId)) {
        filter.zoneId = new mongoose.Types.ObjectId(zoneId);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1, createdAt: -1 };

    const [sellers, total, totalPending, totalApproved, totalRejected, totalActive, totalInactive] = await Promise.all([
        QuickCommerceSeller.find(filter).sort(sortOptions).skip(skip).limit(limitNum).lean(),
        QuickCommerceSeller.countDocuments(filter),
        QuickCommerceSeller.countDocuments({ status: 'pending' }),
        QuickCommerceSeller.countDocuments({ status: 'approved' }),
        QuickCommerceSeller.countDocuments({ status: 'rejected' }),
        QuickCommerceSeller.countDocuments({ isActive: true }),
        QuickCommerceSeller.countDocuments({ isActive: false })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        sellers: sellers.map(sanitizeSeller),
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        },
        stats: {
            totalAll: totalPending + totalApproved + totalRejected,
            pending: totalPending,
            approved: totalApproved,
            rejected: totalRejected,
            active: totalActive,
            inactive: totalInactive
        }
    };
};

export const getSellerByIdService = async (id) => {
    const seller = await QuickCommerceSeller.findById(id).lean();
    if (!seller) {
        throw new Error('Seller not found');
    }
    return sanitizeSeller(seller);
};

export const updateSellerService = async (id, data = {}) => {
    const seller = await QuickCommerceSeller.findById(id);
    if (!seller) {
        throw new Error('Seller not found');
    }
    const previousProfileImage = String(seller.profileImage || '').trim();
    const previousCoverImage = String(seller.coverImage || '').trim();
    const previousDocuments = {
        ...(seller.documents?.toObject?.() || seller.documents || {})
    };

    if (data.storeName !== undefined) {
        const nextStoreName = String(data.storeName || '').trim();
        if (!nextStoreName) {
            throw new Error('Store name is required');
        }

        const nextSlug = data.slug && String(data.slug).trim() ? generateSlug(data.slug) : generateSlug(nextStoreName);
        const duplicate = await QuickCommerceSeller.findOne({
            _id: { $ne: id },
            $or: [
                { storeNameNormalized: nextStoreName.toLowerCase().replace(/\s+/g, ' ') },
                { slug: nextSlug }
            ]
        }).lean();

        if (duplicate) {
            throw new Error('Another seller already uses this store name or slug');
        }

        seller.storeName = nextStoreName;
        seller.slug = nextSlug;
    } else if (data.slug !== undefined) {
        const nextSlug = generateSlug(data.slug);
        if (!nextSlug) {
            throw new Error('Slug is required');
        }
        const duplicate = await QuickCommerceSeller.findOne({
            _id: { $ne: id },
            slug: nextSlug
        }).lean();
        if (duplicate) {
            throw new Error('Another seller already uses this slug');
        }
        seller.slug = nextSlug;
    }

    const assignableFields = [
        'ownerName',
        'ownerEmail',
        'ownerPhone',
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
        'upiId',
        'isAcceptingOrders'
    ];

    for (const field of assignableFields) {
        if (data[field] !== undefined) {
            seller[field] = data[field];
        }
    }

    if (data.zoneId !== undefined) {
        seller.zoneId = data.zoneId && mongoose.Types.ObjectId.isValid(data.zoneId)
            ? new mongoose.Types.ObjectId(data.zoneId)
            : undefined;
    }

    if (data.documents && typeof data.documents === 'object') {
        seller.documents = {
            ...(seller.documents?.toObject?.() || seller.documents || {}),
            ...data.documents
        };
    }

    const location = buildLocationPayload(data, seller.location);
    if (location) {
        seller.location = location;
    }

    await seller.save();
    const cleanupUrls = [];
    if (data.profileImage !== undefined && previousProfileImage && previousProfileImage !== String(seller.profileImage || '').trim()) {
        cleanupUrls.push(previousProfileImage);
    }
    if (data.coverImage !== undefined && previousCoverImage && previousCoverImage !== String(seller.coverImage || '').trim()) {
        cleanupUrls.push(previousCoverImage);
    }
    if (data.documents && typeof data.documents === 'object') {
        for (const [key, oldValue] of Object.entries(previousDocuments)) {
            if (data.documents[key] === undefined) continue;
            const nextValue = String(seller.documents?.[key] || '').trim();
            const prevValue = String(oldValue || '').trim();
            if (prevValue && prevValue !== nextValue) {
                cleanupUrls.push(prevValue);
            }
        }
    }
    await deleteManagedUploadsByUrls(cleanupUrls);
    return sanitizeSeller(seller.toObject());
};

export const updateSellerStatusService = async (id, data = {}) => {
    const seller = await QuickCommerceSeller.findById(id);
    if (!seller) {
        throw new Error('Seller not found');
    }

    const nextStatus = String(data.status || '').trim().toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(nextStatus)) {
        throw new Error('Valid status is required');
    }

    seller.status = nextStatus;
    if (nextStatus === 'approved') {
        seller.approvedAt = new Date();
        seller.rejectedAt = undefined;
        seller.rejectionReason = '';
        seller.isActive = true;
    } else if (nextStatus === 'rejected') {
        seller.rejectedAt = new Date();
        seller.rejectionReason = String(data.rejectionReason || '').trim();
    } else {
        seller.approvedAt = undefined;
        seller.rejectedAt = undefined;
        seller.rejectionReason = '';
    }

    await seller.save();
    return sanitizeSeller(seller.toObject());
};

export const toggleSellerActiveService = async (id) => {
    const seller = await QuickCommerceSeller.findById(id);
    if (!seller) {
        throw new Error('Seller not found');
    }

    seller.isActive = !seller.isActive;
    await seller.save();
    return sanitizeSeller(seller.toObject());
};
