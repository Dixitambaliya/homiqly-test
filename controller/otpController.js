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
        // 🔍 1️⃣ Get current user data
        const [[currentUser]] = await db.query(
            "SELECT phone FROM users WHERE user_id = ?",
            [user_id]
        );

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔎 2️⃣ Check if any other user has this phone
        const [rows] = await db.query(
            "SELECT user_id FROM users WHERE phone = ? AND user_id != ?",
            [phone, user_id]
        );

        if (rows.length > 0) {
            return res.status(400).json({
                message: "This phone number is already registered with another account.",
            });
        }

        // 🔄 3️⃣ If phone changed, reset is_approved = 0 and update phone
        if (phone !== currentUser.phone) {
            await db.query(
                "UPDATE users SET phone = ?, is_approved = 0 WHERE user_id = ?",
                [phone, user_id]
            );
        }
        // 🔢 4️⃣ Generate OTP
        const otp = generateOTP();
        
        // 🔐 5️⃣ Create JWT containing phone + OTP
        const token = jwt.sign(
            { phone, otp },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );

        // 📩 6️⃣ Send OTP to the new number
        await client.messages.create({
            body: `Your Homiqly code is: ${otp}. It expires in 5 minutes. Never share this code.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
        });
        console.log("OTP send sucessfully.",phone);
        
        res.json({
            message: "OTP sent via SMS",
            token,
            phoneUpdated: phone !== currentUser.phone,
        });

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
