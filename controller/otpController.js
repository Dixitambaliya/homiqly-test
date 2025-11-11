const asyncHandler = require('express-async-handler');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db'); // your mysql2 pool

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// ---- Send OTP via SMS ----
const sendOtp = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id  // get current user ID from token or request body
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
    }

    try {
        // 🔎 Check if phone already exists in DB
        const [[existingUser]] = await db.query(
            "SELECT user_id FROM users WHERE phone = ?",
            [phone]
        );

        if (existingUser && existingUser.user_id !== user_id) {
            // ❌ Someone else is using this number
            return res.status(400).json({
                message:
                    "This phone number is already registered with another account. Please use another number.",
            });
        }

        // 🔢 Generate OTP
        const otp = generateOTP();

        // 🔐 Create JWT containing phone + OTP (expires in 5 minutes)
        const token = jwt.sign({ phone, otp }, process.env.JWT_SECRET, { expiresIn: "5m" });

        // 📩 Send OTP via SMS (Twilio)
        await client.messages.create({
            body: `Your Homiqly code is: ${otp}. It expires in 5 minutes. Never share this code.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
        });

        res.json({ message: "OTP sent via SMS", token });
    } catch (err) {
        console.error("SMS sending error:", err);
        res.status(500).json({ message: "Failed to send OTP via SMS" });
    }
});
// ---- Verify OTP ----
const verifyOtp = asyncHandler(async (req, res) => {
    const connection = await db.getConnection(); // 🔹 Get one connection for transaction

    try {
        const { phone, otp, token } = req.body;
        const user_id = req.user.user_id;

        if (!phone || !otp || !token) {
            return res.status(400).json({ message: "Phone, OTP and token are required" });
        }

        // Start transaction
        await connection.beginTransaction();

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.phone !== phone) {
            throw new Error("Phone mismatch");
        }
        if (decoded.otp !== parseInt(otp)) {
            throw new Error("Incorrect OTP");
        }

        // Perform the update
        const [updateResult] = await connection.query(
            "UPDATE users SET phone = ?, is_approved = 1 WHERE user_id = ?",
            [phone, user_id]
        );

        if (updateResult.affectedRows === 0) {
            throw new Error("User not found");
        }

        // Commit the transaction
        await connection.commit();

        res.json({ message: "OTP verified, phone updated and user approved" });
    } catch (err) {
        // Rollback on any error
        if (connection) await connection.rollback();
        console.error("OTP verification error:", err);
        res.status(400).json({ message: err.message || "Invalid or expired OTP" });
    } finally {
        if (connection) connection.release();
    }
});





module.exports = { sendOtp, verifyOtp };
