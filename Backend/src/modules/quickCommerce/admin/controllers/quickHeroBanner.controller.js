import {
    listQuickHeroBanners,
    createQuickHeroBannersFromFiles,
    deleteQuickHeroBanner,
    updateQuickHeroBannerOrder,
    toggleQuickHeroBannerStatus,
    getPublicQuickHeroBanners
} from '../services/quickHeroBanner.service.js';
import { sendResponse } from '../../../../utils/response.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export const listQuickHeroBannersController = async (req, res, next) => {
    try {
        const data = await listQuickHeroBanners();
        return sendResponse(res, 200, 'Quick hero banners fetched successfully', { banners: data });
    } catch (error) {
        next(error);
    }
};

export const uploadQuickHeroBannersController = async (req, res, next) => {
    try {
        if (!req.files || !req.files.length) {
            throw new ValidationError('No files uploaded');
        }

        const meta = {
            title: req.body.title,
            ctaText: req.body.ctaText,
            ctaLink: req.body.ctaLink
        };

        const results = await createQuickHeroBannersFromFiles(req.files, meta);
        return sendResponse(res, 201, 'Quick hero banners uploaded', { results });
    } catch (error) {
        next(error);
    }
};

export const deleteQuickHeroBannerController = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ValidationError('Banner id is required');
        }
        const result = await deleteQuickHeroBanner(id);
        return sendResponse(res, 200, result.deleted ? 'Quick hero banner deleted' : 'Quick hero banner not found', result);
    } catch (error) {
        next(error);
    }
};

export const updateQuickHeroBannerOrderController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sortOrder } = req.body;
        if (!id || typeof sortOrder !== 'number') {
            throw new ValidationError('id and numeric sortOrder are required');
        }
        const updated = await updateQuickHeroBannerOrder(id, sortOrder);
        return sendResponse(res, 200, 'Quick hero banner order updated', updated);
    } catch (error) {
        next(error);
    }
};

export const toggleQuickHeroBannerStatusController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (!id || typeof isActive !== 'boolean') {
            throw new ValidationError('id and boolean isActive are required');
        }
        const updated = await toggleQuickHeroBannerStatus(id, isActive);
        return sendResponse(res, 200, 'Quick hero banner status updated', updated);
    } catch (error) {
        next(error);
    }
};

export const getPublicQuickHeroBannersController = async (req, res, next) => {
    try {
        const banners = await getPublicQuickHeroBanners();
        return sendResponse(res, 200, 'Public quick hero banners fetched', { banners });
    } catch (error) {
        next(error);
    }
};
