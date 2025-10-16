const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const analyticsGetQueries = require('../config/analyticsQueries/analyticsGetQueries');

const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        const [stats] = await db.query(analyticsGetQueries.getDashboardStats);

        res.status(200).json({
            message: "Dashboard stats fetched successfully",
            stats: stats[0]
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getBookingTrends = asyncHandler(async (req, res) => {
    try {
        const [trends] = await db.query(analyticsGetQueries.getBookingTrends);

        res.status(200).json({
            message: "Booking trends fetched successfully",
            trends
        });

    } catch (error) {
        console.error("Error fetching booking trends:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getServiceCategoryStats = asyncHandler(async (req, res) => {
    try {
        const [stats] = await db.query(analyticsGetQueries.getServiceCategoryStats);

        res.status(200).json({
            message: "Service category stats fetched successfully",
            stats
        });

    } catch (error) {
        console.error("Error fetching service category stats:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorPerformance = asyncHandler(async (req, res) => {
    try {
        const [performance] = await db.query(analyticsGetQueries.getVendorPerformance);

        res.status(200).json({
            message: "Vendor performance fetched successfully",
            performance
        });

    } catch (error) {
        console.error("Error fetching vendor performance:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
    try {
        // Fetch revenue data with platform fee applied dynamically per vendor type
        const [revenueData] = await db.query(analyticsGetQueries.getRevenueAnalytics);

        // Prepare chart data for frontend
        const revenueChartData = {
            labels: revenueData.map(r => `${r.month}/${r.year}`),
            datasets: [
                {
                    label: "Gross Revenue",
                    data: revenueData.map(r => r.gross_revenue),
                    backgroundColor: "#3b82f6",
                    borderColor: "#3b82f6",
                    borderWidth: 1,
                },
                {
                    label: "Commission",
                    data: revenueData.map(r => r.commission_revenue),
                    backgroundColor: "#10b981",
                    borderColor: "#10b981",
                    borderWidth: 1,
                },
            ],
        };

        res.status(200).json({
            message: "Revenue analytics fetched successfully",
            revenueData,       // raw DB data
            revenueChartData,  // formatted for Chart.js
        });
    } catch (error) {
        console.error("Error fetching revenue analytics:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});



module.exports = {
    getDashboardStats,
    getBookingTrends,
    getServiceCategoryStats,
    getVendorPerformance,
    getRevenueAnalytics
};