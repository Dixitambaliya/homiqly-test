const express = require('express');
const router = express.Router();

const { sendOtp, verifyOtp, checkPhoneAvailability } = require('../controller/otpController');
const { authenticationToken } = require('../middleware/authMiddleware');

// Route to send OTP
router.post('/send-otp', authenticationToken, sendOtp);

// Route to verify OTP
router.post('/verify-otp', authenticationToken, verifyOtp);

router.get('/verify-phone', authenticationToken, checkPhoneAvailability);

module.exports = router;
