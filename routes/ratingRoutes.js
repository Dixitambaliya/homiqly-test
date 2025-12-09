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
    getAllVendorRatings,
    selectRating,
    getPublicRatings
} = require('../controller/ratingController');
const { authenticationToken } = require('../middleware/authMiddleware');

// // User routes
router.post('/add-rating', authenticationToken, vendorRatesUser);

router.post('/select-rating/:rating_id', authenticationToken, selectRating);

// Vendor routes
router.get('/getrating', authenticationToken, getVendorRatings);

router.get('/get-public-rating', authenticationToken, getPublicRatings);

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
