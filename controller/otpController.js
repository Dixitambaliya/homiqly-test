const asyncHandler = require('express-async-handler');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db'); // your mysql2 pool

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// ---- Send OTP via SMS ----
const sendOtp = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
    }

    try {
        // 1️⃣ Get current user data
        const [[currentUser]] = await db.query(
            "SELECT phone FROM users WHERE user_id = ?",
            [user_id]
        );

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2️⃣ Check if phone belongs to another user
        const [rows] = await db.query(
            "SELECT user_id FROM users WHERE phone = ? AND user_id != ?",
            [phone, user_id]
        );

        if (rows.length > 0) {
            return res.status(400).json({
                message: "This phone number is already registered with another account.",
            });
        }

        // 3️⃣ If phone changed, update & reset approval
        if (phone !== currentUser.phone) {
            await db.query(
                "UPDATE users SET phone = ?, is_approved = 0 WHERE user_id = ?",
                [phone, user_id]
            );
        }

        const twilioConfigured =
            client &&
            process.env.TWILIO_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_PHONE_NUMBER;

        let otp = null;
        let token = null;

        if (twilioConfigured) {
            otp = generateOTP();

            const smsMessage = `Your Homiqly verification code is ${otp}. It expires in 5 minutes. Never share this code.`;

            token = jwt.sign(
                { phone, otp },
                process.env.JWT_SECRET,
                { expiresIn: "5m" }
            );

        } else {
            token = jwt.sign(
                { phone },
                process.env.JWT_SECRET,
                { expiresIn: "5m" }
            );
        }

        // 6️⃣ Response
        return res.json({
            message:"OTP sent via SMS",
            token,
            phoneUpdated: phone !== currentUser.phone,
        });

    } catch (err) {
        console.error("SMS sending error:", err);
        return res.status(500).json({ message: "Failed to send OTP via SMS" });
    }
});


const checkPhoneAvailability = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const phone = req.body.phone || req.query.phone;

    if (!phone) {
        return res.status(400).json({
            available: 0,
            message: "Phone is required"
        });
    }

    try {
        // Get current user's phone
        const [[currentUser]] = await db.query(
            "SELECT phone FROM users WHERE user_id = ?",
            [user_id]
        );

        if (!currentUser) {
            return res.status(404).json({
                available: 0,
                message: "User not found"
            });
        }

        // Check if phone exists with another account
        const [rows] = await db.query(
            "SELECT user_id FROM users WHERE phone = ? AND user_id != ?",
            [phone, user_id]
        );

        if (rows.length > 0) {
            return res.status(409).json({
                available: 0,
                message: "Phone number is already used by another account"
            });
        }

        // Phone is same as current user's phone
        if (phone === currentUser.phone) {
            return res.status(200).json({
                available: 1,
                message: "Phone is already your registered number"
            });
        }

        // Phone is new + free
        return res.status(200).json({
            available: 1,
            message: "Phone number is available"
        });

    } catch (err) {
        console.error("Phone check error:", err);
        return res.status(500).json({
            available: 0,
            message: "Failed to check phone availability",
            error: err.message
        });
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





module.exports = { sendOtp, verifyOtp, checkPhoneAvailability };
