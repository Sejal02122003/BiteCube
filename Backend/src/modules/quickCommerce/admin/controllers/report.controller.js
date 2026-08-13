import { sendError, sendResponse } from '../../../../utils/response.js';
import {
    getQuickOrderReport,
    getQuickSellerReport,
    getQuickTaxReport,
    getQuickTaxReportDetail,
    getQuickTransactionReport
} from '../services/report.service.js';

export const getQuickTransactionReportController = async (req, res) => {
    try {
        const data = await getQuickTransactionReport(req.query || {});
        return sendResponse(res, 200, 'Quick transaction report fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch quick transaction report');
    }
};

export const getQuickOrderReportController = async (req, res) => {
    try {
        const data = await getQuickOrderReport(req.query || {});
        return sendResponse(res, 200, 'Quick order report fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch quick order report');
    }
};

export const getQuickTaxReportController = async (req, res) => {
    try {
        const data = await getQuickTaxReport(req.query || {});
        return sendResponse(res, 200, 'Quick tax report fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch quick tax report');
    }
};

export const getQuickTaxReportDetailController = async (req, res) => {
    try {
        const data = await getQuickTaxReportDetail(req.params.id, req.query || {});
        return sendResponse(res, 200, 'Quick tax report detail fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch quick tax report detail');
    }
};

export const getQuickSellerReportController = async (req, res) => {
    try {
        const data = await getQuickSellerReport(req.query || {});
        return sendResponse(res, 200, 'Quick seller report fetched successfully', data);
    } catch (error) {
        return sendError(res, 500, error.message || 'Failed to fetch quick seller report');
    }
};
