import mongoose from 'mongoose';
import { QuickCommerceSeller } from '../models/seller.model.js';
import { sendError, sendResponse } from '../../../../utils/response.js';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getDefaultStoreTimings = () =>
    DAY_NAMES.reduce((acc, day) => {
        acc[day] = {
            isOpen: true,
            openingTime: '09:00',
            closingTime: '22:00'
        };
        return acc;
    }, {});

const normalizeTime = (value, fallback) => {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return fallback;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const sanitizeStoreTimings = (input = {}) => {
    const defaults = getDefaultStoreTimings();
    const next = {};

    for (const day of DAY_NAMES) {
        const incoming = input?.[day] || {};
        const fallback = defaults[day];
        const isOpen = incoming?.isOpen !== undefined ? Boolean(incoming.isOpen) : fallback.isOpen;
        next[day] = {
            isOpen,
            openingTime: isOpen ? normalizeTime(incoming?.openingTime, fallback.openingTime) : '',
            closingTime: isOpen ? normalizeTime(incoming?.closingTime, fallback.closingTime) : ''
        };
    }

    return next;
};

export const getSellerStoreTimingsController = async (req, res, next) => {
    try {
        const sellerId = req.user?.userId;
        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendError(res, 401, 'Unauthorized');
        }

        const seller = await QuickCommerceSeller.findById(sellerId).select('storeTimings').lean();
        if (!seller) {
            return sendError(res, 404, 'Seller not found');
        }

        return sendResponse(res, 200, 'Store timings fetched successfully', {
            storeTimings: sanitizeStoreTimings(seller.storeTimings || {})
        });
    } catch (error) {
        next(error);
    }
};

export const upsertSellerStoreTimingsController = async (req, res, next) => {
    try {
        const sellerId = req.user?.userId;
        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendError(res, 401, 'Unauthorized');
        }

        const nextTimings = sanitizeStoreTimings(req.body?.storeTimings || {});
        const seller = await QuickCommerceSeller.findByIdAndUpdate(
            sellerId,
            { $set: { storeTimings: nextTimings } },
            { new: true }
        )
            .select('storeTimings')
            .lean();

        if (!seller) {
            return sendError(res, 404, 'Seller not found');
        }

        return sendResponse(res, 200, 'Store timings updated successfully', {
            storeTimings: sanitizeStoreTimings(seller.storeTimings || {})
        });
    } catch (error) {
        next(error);
    }
};
