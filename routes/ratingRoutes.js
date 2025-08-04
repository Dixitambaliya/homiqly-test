const express = require('express');
const router = express.Router();
const {
    vendorRatesUser,
    getVendorRatings,
    getAllRatings,
    addRatingToServiceType,
    addRatingToPackages,
    getBookedPackagesForRating,
    getVendorServicesForReview,
    getPackageRatings
} = require('../controller/ratingController');
const { authenticationToken } = require('../middleware/authMiddleware');

// // User routes
router.post('/add-rating', authenticationToken, vendorRatesUser);

// Vendor routes
router.get('/getrating', authenticationToken, getVendorRatings);

// Admin routes
router.get('/all', authenticationToken, getAllRatings);

router.get('/bookedpackages', authenticationToken, getBookedPackagesForRating);

router.get('/getassignedservice', authenticationToken, getVendorServicesForReview);

router.get('/getpackagebookedrating', authenticationToken, getPackageRatings);

router.post('/addrating', authenticationToken, addRatingToServiceType);

router.post('/ratepackages', authenticationToken, addRatingToPackages);

module.exports = router;
