const asyncHandler = require('express-async-handler');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db'); // your mysql2 pool

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// ---- Send OTP via SMS ----
const sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    try {
        const otp = generateOTP();

        // Create JWT containing phone + OTP (expires in 5 minutes)
        const token = jwt.sign({ phone, otp }, process.env.JWT_SECRET, { expiresIn: '5m' });

        // Send OTP via SMS
        await client.messages.create({
            body: `Your OTP is: ${otp}. It expires in 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER, // Your Canadian Twilio number
            to: phone
        });

        res.json({ message: "OTP sent via SMS", token });
    } catch (err) {
        console.error("SMS sending error:", err);
        res.status(500).json({ message: "Failed to send OTP via SMS" });
    }
});


// ---- Verify OTP ----
const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp, token } = req.body;
    const user_id = req.user.user_id;

    if (!phone || !otp || !token) {
        return res.status(400).json({ message: "Phone, OTP and token are required" });
    }

    try {
        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.phone !== phone) {
            return res.status(400).json({ message: "Phone mismatch" });
        }
        if (decoded.otp !== parseInt(otp)) {
            return res.status(400).json({ message: "Incorrect OTP" });
        }

        // Update phone and approval status
        const [updateResult] = await db.query(
            "UPDATE users SET phone = ?, is_approved = 1 WHERE user_id = ?",
            [phone, user_id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "OTP verified, phone updated and user approved" });
    } catch (err) {
        console.error("OTP verification error:", err);
        res.status(400).json({ message: "Invalid or expired OTP" });
    }
});




module.exports = { sendOtp, verifyOtp };
