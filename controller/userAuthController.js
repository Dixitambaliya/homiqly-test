const { db } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userAuthQueries = require("../config/userQueries/userAuthQueries");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

const resetCodes = new Map(); // Store reset codes in memory
const RESET_EXPIRATION = 10 * 60 * 1000;
const generateResetCode = () =>
    Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0");

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Create User
const registerUser = asyncHandler(async (req, res) => {
    const { firstname, lastname, email, phone } = req.body;

    if (!firstname || !email || !lastname || !phone) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        const [existingUser] = await db.query(userAuthQueries.userMailCheck, [
            email,
        ]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Save only name/email (no password yet)
        const [result] = await db.query(userAuthQueries.userInsert1, [
            firstname,
            lastname,
            email,
            phone,
        ]);

        // Generate code and send
        const code = generateResetCode();
        resetCodes.set(email, { code, expiresAt: Date.now() + RESET_EXPIRATION });

        await transport.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email - Registration",
            text: `Hi ${firstname}, your verification code is: ${code}`,
        });

        res.status(200).json({
            message: "Verification code sent to email.",
            user_id: result.insertId,
        });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const verifyCode = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const entry = resetCodes.get(email);

    const OTP_VALIDITY_MINUTES = 10;

    if (!entry) {
        return res.status(400).json({ error: "No OTP found for this email." });
    }

    const otpExpiryTime = new Date(entry.createdAt).getTime() + OTP_VALIDITY_MINUTES * 60 * 1000;
    const currentTime = new Date().getTime();

    if (entry.code !== otp || currentTime > otpExpiryTime) {
        return res.status(400).json({ error: "Invalid or expired code." });
    }

    // ✅ Remove code once used
    resetCodes.delete(email);

    res.status(200).json({ message: "Code verified. You can now set your password." });
});


const setPassword = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(userAuthQueries.userSetPassword, [
            hashedPassword,
            email,
        ]);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ error: "User not found or already has a password." });
        }

        res
            .status(200)
            .json({ message: "Password set successfully. You can now log in." });
    } catch (err) {
        console.error("Set Password Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// User Login
const loginUser = asyncHandler(async (req, res) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const [loginUser] = await db.query(userAuthQueries.userLogin, [email]);

        if (!loginUser || loginUser.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = loginUser[0];

        // Safe check before bcrypt.compare
        if (!user.password || typeof user.password !== "string") {
            return res
                .status(400)
                .json({ error: "Password not set. Please reset your password." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Optional: Update FCM token
        if (fcmToken && typeof fcmToken === "string" && fcmToken.trim() !== "") {
            const trimmedToken = fcmToken.trim();

            if (user.fcmToken !== trimmedToken) {
                try {
                    await db.query(
                        "UPDATE users SET fcmToken = ? WHERE user_id = ?",
                        [trimmedToken, user.user_id]
                    );
                } catch (err) {
                    console.error("❌ FCM token update error:", err.message);
                }
            } else {
                console.log("ℹ️ FCM token already up-to-date for user:", user.user_id);
            }
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                status: user.status,
            },
            process.env.JWT_SECRET
        );

        res.status(200).json({
            message: "Login successful",
            user_id: user.user_id,
            token,
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const requestReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        const [user] = await db.query(userAuthQueries.GetUserOnMail, [email]);

        if (!user || user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const code = generateResetCode();
        const expires = Date.now() + RESET_EXPIRATION;
        resetCodes.set(email, { code, expires });

        await transport.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset Code",
            text: `Your password reset code is: ${code}. It expires in 5 minutes.`,
        });

        res.status(200).json({ message: "Reset code sent to email." });
    } catch (err) {
        console.error("Email sending failed:", err);
        res.status(500).json({ error: "Internal error", details: err.message });
    }
});

const verifyResetCode = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: "Email and code are required" });
    }

    const stored = resetCodes.get(email);
    if (!stored || stored.expires < Date.now()) {
        return res.status(400).json({ error: "Code expired or invalid" });
    }

    if (stored.code !== otp) {
        return res.status(400).json({ error: "Incorrect reset code" });
    }

    resetCodes.delete(email);

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });

    res.status(200).json({ message: "Code verified", token });
});

const resetPassword = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token required" });
    }

    const token = authHeader.split(" ")[1];
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: "New password is required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.query(userAuthQueries.PasswordUpdate, [
            hashed,
            email,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset Error:", err);
        res
            .status(400)
            .json({ error: "Invalid or expired token", details: err.message });
    }
});

const googleLogin = asyncHandler(async (req, res) => {
    const { email, name, picture, fcmToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    // Split name
    const [given_name = "", family_name = ""] = name?.split(" ") || [];

    const [existingUser] = await db.query(userAuthQueries.userMailCheck, [email]);

    let user_id;

    if (existingUser.length === 0) {
        const [result] = await db.query(userAuthQueries.userInsert, [
            given_name,
            family_name,
            email,
            "",        // phone
            picture,
            fcmToken
        ]);
        user_id = result.insertId;
    } else {
        user_id = existingUser[0].user_id;

        // ✅ Update FCM token for returning user
        if (fcmToken) {
            await db.query(
                "UPDATE users SET fcmToken = ? WHERE user_id = ?",
                [fcmToken, user_id]
            );
        }
    }

    const jwtToken = jwt.sign({
        user_id, email,
        status: "active"
    },
        process.env.JWT_SECRET
    );

    res.status(200).json({
        message: "Login successful via Google",
        token: jwtToken,
        user_id,
    });
});



module.exports = {
    registerUser,
    loginUser,
    verifyCode,
    setPassword,
    requestReset,
    verifyResetCode,
    resetPassword,
    googleLogin
};
