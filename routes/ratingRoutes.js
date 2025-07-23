const express = require('express');
const router = express.Router();
const {
    getVendorRatings,
    getAllRatings,
    addRatingToServiceType,
    addRatingToPackages,
    getBookedPackagesForRating
} = require('../controller/ratingController');
const { authenticationToken } = require('../middleware/authMiddleware');

// // User routes
// router.post('/add', authenticationToken, addRating);

// Vendor routes
router.get('/vendor', authenticationToken, getVendorRatings);

// Admin routes
router.get('/all', authenticationToken, getAllRatings);

router.get('/bookedpackges', authenticationToken, getBookedPackagesForRating);

router.post('/addrating', authenticationToken, addRatingToServiceType);

router.post('/ratepackages', authenticationToken, addRatingToPackages);

module.exports = router;
