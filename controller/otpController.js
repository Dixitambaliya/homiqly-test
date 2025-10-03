const asyncHandler = require('express-async-handler');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db'); // your mysql2 pool

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// ---- Send OTP ----
const sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    try {
        // Check if user exists
        const [users] = await db.query("SELECT user_id, is_approved FROM users WHERE phone=?", [phone]);
        if (users.length === 0) return res.status(404).json({ message: "User not found" });

        const user = users[0];
        if (user.is_approved === 1) return res.json({ message: "User already verified" });

        const otp = generateOTP();

        // Create JWT containing phone + OTP (expires in 5 minutes)
        const token = jwt.sign({ phone, otp }, process.env.JWT_SECRET, { expiresIn: '5m' });

        // Send OTP via WhatsApp
        await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${phone}`,
            body: `Your OTP is: ${otp}. It expires in 5 minutes.`
        });

        res.json({ message: "OTP sent", token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to send OTP" });
    }
});

// ---- Verify OTP ----
const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp, token } = req.body;
    if (!phone || !otp || !token) return res.status(400).json({ message: "Phone, OTP and token are required" });

    try {
        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.phone !== phone) return res.status(400).json({ message: "Phone mismatch" });
        if (decoded.otp !== parseInt(otp)) return res.status(400).json({ message: "Incorrect OTP" });

        // ✅ OTP is valid, update user as approved
        await db.query("UPDATE users SET is_approved=1 WHERE phone=?", [phone]);

        res.json({ message: "OTP verified, user approved" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: "Invalid or expired OTP" });
    }
});

module.exports = { sendOtp, verifyOtp };
