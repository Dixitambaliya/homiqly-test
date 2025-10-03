const express = require('express');
const router = express.Router();

const { sendOtp, verifyOtp } = require('../controller/otpController');

// Route to send OTP
router.post('/send-otp', sendOtp);

// Route to verify OTP
router.post('/verify-otp', verifyOtp);

module.exports = router;
