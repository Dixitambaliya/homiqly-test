const express = require('express');
const router = express.Router();
const {
    vendorRatesUser,
    getVendorRatings,
    getAllRatings,
    addRatingToServiceType,
    addRatingToPackages,
    getBookedPackagesForRating,
    getVendorServicesForReview
} = require('../controller/ratingController');
const { authenticationToken } = require('../middleware/authMiddleware');

// // User routes
router.post('/vendor-rating', authenticationToken, vendorRatesUser);

// Vendor routes
router.get('/vendor', authenticationToken, getVendorRatings);

// Admin routes
router.get('/all', authenticationToken, getAllRatings);

router.get('/bookedpackages', authenticationToken, getBookedPackagesForRating);

router.get('/getassignedservice', authenticationToken, getVendorServicesForReview);

router.post('/addrating', authenticationToken, addRatingToServiceType);

router.post('/ratepackages', authenticationToken, addRatingToPackages);

module.exports = router;
