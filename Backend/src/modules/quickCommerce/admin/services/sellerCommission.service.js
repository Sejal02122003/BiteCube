import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { QuickCommerceSeller } from '../../seller/models/seller.model.js';
import { QuickCommerceSellerCommission } from '../models/sellerCommission.model.js';
import { QuickCommerceCommissionSettings } from '../models/commissionSettings.model.js';

const getActiveSettingsDoc = async () => {
    let settings = await QuickCommerceCommissionSettings.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!settings) {
        settings = new QuickCommerceCommissionSettings();
        await settings.save();
    }
    return settings;
};

const formatSellerCode = (seller = {}) => {
    const slug = String(seller.slug || '').trim();
    if (slug) return slug;
    const id = seller?._id?.toString?.() || seller?._id || '';
    return id ? `SELL${String(id).slice(-6).padStart(6, '0')}` : '';
};

const mapCommissionDoc = (doc = {}, index = 0) => ({
    _id: doc._id,
    sl: index + 1,
    sellerId: doc.sellerId?._id ? String(doc.sellerId._id) : String(doc.sellerId || ''),
    sellerName: doc.sellerId?.storeName || '',
    sellerCode: doc.sellerId?._id ? formatSellerCode(doc.sellerId) : '',
    seller: doc.sellerId?._id
        ? {
            _id: doc.sellerId._id,
            storeName: doc.sellerId.storeName || '',
            slug: doc.sellerId.slug || '',
            ownerName: doc.sellerId.ownerName || '',
            ownerPhone: doc.sellerId.ownerPhone || ''
        }
        : null,
    defaultCommission: doc.defaultCommission || { type: 'percentage', value: 0 },
    notes: doc.notes || '',
    status: doc.status !== false
});

export const getSellerCommissionsService = async () => {
    const list = await QuickCommerceSellerCommission.find({})
        .sort({ createdAt: -1 })
        .populate({ path: 'sellerId', select: 'storeName slug ownerName ownerPhone' })
        .lean();

    return { commissions: list.map((doc, index) => mapCommissionDoc(doc, index)) };
};

export const getSellerCommissionBootstrapService = async () => {
    const [commissionsData, approvedSellers, settings] = await Promise.all([
        getSellerCommissionsService(),
        QuickCommerceSeller.find({ status: 'approved' })
            .sort({ createdAt: -1 })
            .select('storeName slug ownerName ownerPhone')
            .lean(),
        getActiveSettingsDoc()
    ]);

    const commissionBySellerId = new Set(
        (commissionsData.commissions || []).map((entry) => String(entry.sellerId))
    );

    const sellers = (approvedSellers || []).map((seller) => ({
        _id: seller._id,
        storeName: seller.storeName || '',
        slug: seller.slug || '',
        sellerId: formatSellerCode(seller),
        ownerName: seller.ownerName || '',
        ownerPhone: seller.ownerPhone || '',
        hasCommissionSetup: commissionBySellerId.has(String(seller._id))
    }));

    return {
        commissions: commissionsData.commissions || [],
        sellers,
        globalSettings: {
            globalSellerCommission: settings.globalSellerCommission || 0,
            globalGstOnItem: settings.globalGstOnItem || 0,
            globalGstOnCommission: settings.globalGstOnCommission || 0,
            globalPaymentGatewayFee: settings.globalPaymentGatewayFee || 0,
            globalTcs: settings.globalTcs || 0,
            applyGlobalTaxes: settings.applyGlobalTaxes !== false
        }
    };
};

export const getSellerCommissionByIdService = async (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await QuickCommerceSellerCommission.findById(id)
        .populate({ path: 'sellerId', select: 'storeName slug ownerName ownerPhone' })
        .lean();
    if (!doc) return null;
    return mapCommissionDoc(doc);
};

export const createSellerCommissionService = async (body = {}) => {
    const seller = await QuickCommerceSeller.findById(body.sellerId).lean();
    if (!seller) {
        throw new ValidationError('Seller not found');
    }

    const exists = await QuickCommerceSellerCommission.findOne({ sellerId: body.sellerId }).lean();
    if (exists) {
        throw new ValidationError('Commission already exists for this seller');
    }

    const created = await QuickCommerceSellerCommission.create({
        sellerId: body.sellerId,
        defaultCommission: body.defaultCommission,
        notes: body.notes || '',
        status: true
    });

    return created.toObject();
};

export const updateSellerCommissionService = async (id, body = {}) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

    const existing = await QuickCommerceSellerCommission.findById(id).lean();
    if (!existing) return null;

    if (String(existing.sellerId) !== String(body.sellerId)) {
        const duplicate = await QuickCommerceSellerCommission.findOne({ sellerId: body.sellerId, _id: { $ne: id } }).lean();
        if (duplicate) {
            throw new ValidationError('Commission already exists for this seller');
        }
    }

    const seller = await QuickCommerceSeller.findById(body.sellerId).lean();
    if (!seller) {
        throw new ValidationError('Seller not found');
    }

    return QuickCommerceSellerCommission.findByIdAndUpdate(
        id,
        {
            $set: {
                sellerId: body.sellerId,
                defaultCommission: body.defaultCommission,
                notes: body.notes || ''
            }
        },
        { new: true }
    ).lean();
};

export const deleteSellerCommissionService = async (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const deleted = await QuickCommerceSellerCommission.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
};

export const toggleSellerCommissionStatusService = async (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await QuickCommerceSellerCommission.findById(id);
    if (!doc) return null;
    doc.status = !Boolean(doc.status);
    await doc.save();
    return doc.toObject();
};

export const updateGlobalSellerCommissionSettingsService = async (body = {}) => {
    const settings = await getActiveSettingsDoc();

    if (body.globalSellerCommission !== undefined) settings.globalSellerCommission = Number(body.globalSellerCommission);
    if (body.globalGstOnItem !== undefined) settings.globalGstOnItem = Number(body.globalGstOnItem);
    if (body.globalGstOnCommission !== undefined) settings.globalGstOnCommission = Number(body.globalGstOnCommission);
    if (body.globalPaymentGatewayFee !== undefined) settings.globalPaymentGatewayFee = Number(body.globalPaymentGatewayFee);
    if (body.globalTcs !== undefined) settings.globalTcs = Number(body.globalTcs);
    if (body.applyGlobalTaxes !== undefined) settings.applyGlobalTaxes = Boolean(body.applyGlobalTaxes);

    await settings.save();

    return {
        globalSellerCommission: settings.globalSellerCommission,
        globalGstOnItem: settings.globalGstOnItem,
        globalGstOnCommission: settings.globalGstOnCommission,
        globalPaymentGatewayFee: settings.globalPaymentGatewayFee,
        globalTcs: settings.globalTcs,
        applyGlobalTaxes: settings.applyGlobalTaxes
    };
};
