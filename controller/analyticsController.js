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
        // Fetch revenue data grouped by month/year
        const [revenueData] = await db.query(analyticsGetQueries.getRevenueAnalytics);

        // Map to only include the fields you want
        const simplifiedRevenue = revenueData.map(r => ({
            month: r.month,
            year: r.year,
            gross_revenue: r.gross_revenue,
            commission_revenue: r.commission_revenue
        }));

        res.status(200).json({
            message: "Revenue analytics fetched successfully",
            revenue: simplifiedRevenue
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