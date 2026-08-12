import { QuickHeroBanner } from '../models/quickHeroBanner.model.js';
import { uploadBannerImage } from '../../../../services/upload.service.js';

export const listQuickHeroBanners = async () => {
    return QuickHeroBanner.find()
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();
};

export const createQuickHeroBannersFromFiles = async (files, meta = {}) => {
    if (!files || !files.length) {
        return [];
    }

    const results = [];

    for (const file of files) {
        try {
            let imageUrl = '';
            if (file.buffer) {
                imageUrl = await uploadBannerImage(file.buffer);
            } else if (file.filename) {
                imageUrl = `/uploads/${file.filename}`;
            } else if (file.path) {
                imageUrl = file.path;
            }

            const banner = await QuickHeroBanner.create({
                imageUrl: imageUrl,
                publicId: null,
                title: meta.title || '',
                ctaText: meta.ctaText || '',
                ctaLink: meta.ctaLink || '',
                sortOrder: meta.sortOrder ?? 0,
                isActive: true
            });

            results.push({ success: true, banner: banner.toObject() });
        } catch (error) {
            results.push({ success: false, error: error.message });
        }
    }

    return results;
};

export const deleteQuickHeroBanner = async (id) => {
    const doc = await QuickHeroBanner.findById(id);
    if (!doc) {
        return { deleted: false };
    }
    await doc.deleteOne();
    return { deleted: true };
};

export const updateQuickHeroBannerOrder = async (id, sortOrder) => {
    const updated = await QuickHeroBanner.findByIdAndUpdate(
        id,
        { sortOrder },
        { new: true }
    ).lean();
    return updated;
};

export const toggleQuickHeroBannerStatus = async (id, isActive) => {
    const updated = await QuickHeroBanner.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
    ).lean();
    return updated;
};

export const getPublicQuickHeroBanners = async () => {
    const banners = await QuickHeroBanner.find({ isActive: true })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();
    return banners;
};
