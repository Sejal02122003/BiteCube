import { sendResponse, sendError } from '../../../../utils/response.js';
import { getQuickDashboardStatsService } from '../services/dashboard.service.js';

export const getDashboardStats = async (req, res) => {
    try {
        const data = await getQuickDashboardStatsService(req.query || {});
        return sendResponse(res, 200, "Quick Commerce dashboard stats fetched successfully", data);
    } catch (error) {
        return sendError(res, 500, "Error fetching dashboard stats", error.message);
    }
};
