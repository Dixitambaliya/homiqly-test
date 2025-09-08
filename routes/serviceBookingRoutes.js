const express = require('express');
const router = express.Router();
const { bookService,
    getVendorBookings,
    getUserBookings,
    approveOrRejectBooking,
    assignBookingToVendor,
    getEligiblevendors,
    approveOrAssignBooking,
    getAvailableVendors
} = require('../controller/serviceBookingController');
const { authenticationToken } = require("../middleware/authMiddleware")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

router.post('/bookservice', multiUpload, handleUploads, authenticationToken, bookService);
router.get('/vendorassignedservices', authenticationToken, getVendorBookings);
router.get('/getvendorsbytime', authenticationToken, getAvailableVendors);
router.get('/userbookedservices', authenticationToken, getUserBookings);
router.get('/get-eligible-vendors/:booking_id', authenticationToken, getEligiblevendors);
router.put('/approveorrejectbooking', authenticationToken, approveOrRejectBooking);
router.post("/assignbooking", authenticationToken, assignBookingToVendor);
router.post("/approveandassign", authenticationToken, approveOrAssignBooking)

module.exports = router;