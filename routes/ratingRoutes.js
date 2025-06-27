const express = require('express');
const router = express.Router();
const {
    addRating,
    getVendorRatings,
    getAllRatings
} = require('../controller/ratingController');
const { authenticationToken } = require('../middleware/authMiddleware');

// User routes
router.post('/add', authenticationToken, addRating);

// Vendor routes
router.get('/vendor', authenticationToken, getVendorRatings);

// Admin routes
router.get('/all', authenticationToken, getAllRatings);

module.exports = router;