const express = require('express');
const router = express.Router();
const {
    vendorRatesUser,
    getVendorRatings,
    getAllRatings,
    addRatingToServiceType,
    addRatingToBooking,
    getBookedPackagesForRating,
    getVendorServicesForReview,
    getPackageRatings,
    getPackageAverageRating,
    getAllVendorRatings
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

router.get('/packageaverage/:package_id', authenticationToken, getPackageAverageRating);

router.get('/getallvendorsrating', authenticationToken, getAllVendorRatings);

router.post('/addrating', authenticationToken, addRatingToServiceType);

router.post('/ratebookings', authenticationToken, addRatingToBooking);

module.exports = router;
