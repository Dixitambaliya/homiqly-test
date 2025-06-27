const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getBookingTrends,
    getServiceCategoryStats,
    getVendorPerformance,
    getRevenueAnalytics
} = require('../controller/analyticsController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.get('/dashboard', authenticationToken, getDashboardStats);
router.get('/booking-trends', authenticationToken, getBookingTrends);
router.get('/service-categories', authenticationToken, getServiceCategoryStats);
router.get('/vendor-performance', authenticationToken, getVendorPerformance);
router.get('/revenue', authenticationToken, getRevenueAnalytics);

module.exports = router;