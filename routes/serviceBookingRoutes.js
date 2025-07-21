const express = require('express');
const router = express.Router();
const { bookService,
    getVendorBookings,
    getUserBookings,
    approveOrRejectBooking,
    assignBookingToVendor,
    getEligiblevendors
} = require('../controller/serviceBookingController');
const { authenticationToken } = require("../middleware/authMiddleware")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

router.post('/bookservice', multiUpload, handleUploads, authenticationToken, bookService);
router.get('/vendorbookedservices', authenticationToken, getVendorBookings);
router.get('/userbookedservices', authenticationToken, getUserBookings);

router.get('/get-eligible-vendors/:booking_id', authenticationToken, getEligiblevendors);


router.put('/approveorrejectbooking', authenticationToken, approveOrRejectBooking);
router.post("/assignbooking", authenticationToken, assignBookingToVendor)

module.exports = router;
