import { sendResponse, sendError } from '../../../../utils/response.js';

export const getDashboardStats = async (req, res) => {
    try {
        // Placeholder data for Quick Commerce Dashboard
        const dummyStats = {
            totalOrders: 150,
            activeStores: 12,
            totalRevenue: 45000,
            pendingDeliveries: 34
        };
        
        return sendResponse(res, 200, "Quick Commerce dashboard stats fetched successfully", dummyStats);
    } catch (error) {
        return sendError(res, 500, "Error fetching dashboard stats", error.message);
    }
};
