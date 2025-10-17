const { db } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userAuthQueries = require("../config/userQueries/userAuthQueries");
const asyncHandler = require("express-async-handler");
const { assignWelcomeCode } = require("./promoCode");
const { sendPasswordUpdatedMail, sendPasswordResetCodeMail, sendUserVerificationMail } = require("../config/mailer");

const resetCodes = new Map(); // Store reset codes in memory
const RESET_EXPIRATION = 10 * 60 * 1000;
const generateResetCode = () =>
    Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0");

const registerUser = asyncHandler(async (req, res) => {
    const { firstname, lastname, email, phone } = req.body;

    if (!firstname || !lastname || !email || !phone) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    try {
        // 🔍 Check if user already exists
        const [existingUsers] = await db.query(userAuthQueries.userMailCheck, [email]);

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];

            // 🧩 Case 1: Account created via Google (no password)
            if (!existingUser.password) {
                return res.status(400).json({
                    error: "This email is linked to a Google account. Please log in using Google.",
                });
            }

            // 🧩 Case 2: Account exists with password (normal user)
            return res.status(400).json({
                error: "Email already exists. Please log in instead.",
            });
        }

        // 🟢 Create new user (no password yet)
        const [result] = await db.query(userAuthQueries.userInsert1, [
            firstname,
            lastname,
            email,
            phone,
        ]);

        // Generate and store OTP
        const code = generateResetCode();
        resetCodes.set(email, { code, expiresAt: Date.now() + RESET_EXPIRATION });

        // Send email
        sendUserVerificationMail({ firstname, userEmail: email, code }).catch(console.error);

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
        // 1️⃣ Check if user exists
        const [rows] = await db.query(
            "SELECT password FROM users WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "User not found." });
        }

        // 2️⃣ Check if password already set
        const existingPassword = rows[0].password;
        if (existingPassword && existingPassword.trim() !== '') {
            return res.status(400).json({ error: "User already has a password." });
        }

        // 3️⃣ Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4️⃣ Update password
        await db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email]
        );

        res.status(200).json({ message: "Password set successfully. You can now log in." });
    } catch (err) {
        console.error("Set Password Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

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

        // 🧩 Check if user registered via Google (no password stored)
        if (!user.password) {
            return res.status(400).json({
                error: "This account was created using Google. Please log in using Google.",
            });
        }

        // 🧩 Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // 🧩 Update FCM token if needed
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
            }
        }

        // 🧩 Assign welcome code if not already assigned
        let welcomeCode = null;
        try {
            welcomeCode = await assignWelcomeCode(user.user_id, user.email);
        } catch (err) {
            console.error("❌ Auto-assign welcome code error:", err.message);
        }

        // 🧩 Generate JWT
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
            ...(welcomeCode && { welcomeCode }),
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

        // ✅ Use helper for email
        sendPasswordResetCodeMail({ userEmail: email, code }).catch(console.error);

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
        const [result] = await db.query(userAuthQueries.PasswordUpdate, [hashed, email]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // fetch user info for email
        const [[user]] = await db.query(
            "SELECT CONCAT(firstName, ' ', lastName) AS userName, email AS userEmail FROM users WHERE email = ?",
            [email]
        );

        // send email asynchronously (don’t block response)
        sendPasswordUpdatedMail({
            userName: user?.userName || "User",
            userEmail: user?.userEmail || email,
        }).catch(console.error);

        res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset Error:", err);
        res.status(400).json({ error: "Invalid or expired token", details: err.message });
    }
});

const googleLogin = asyncHandler(async (req, res) => {
    const { email, fcmToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // 1️⃣ Check if user exists
        const [existingUsers] = await db.query(userAuthQueries.userMailCheck, [email]);

        if (!existingUsers || existingUsers.length === 0) {
            return res.status(404).json({ error: "User not found. Please sign up first." });
        }

        const user = existingUsers[0];
        const user_id = user.user_id;

        // 2️⃣ If user has password → must log in using email/password
        if (user.password && user.password.trim() !== "") {
            return res.status(403).json({
                error: "This email is registered with a password. Please log in using your email and password.",
            });
        }
        // Optional: Assign welcome code
        let welcomeCode = null;
        try {
            welcomeCode = await assignWelcomeCode(user_id, email);
        } catch (err) {
            console.error("❌ Auto-assign welcome code error:", err.message);
        }

        // 3️⃣ If password is empty → it's a Google account → allow login
        // Update FCM token if changed
        if (fcmToken && fcmToken !== user.fcmToken) {
            try {
                await db.query("UPDATE users SET fcmToken = ? WHERE user_id = ?", [fcmToken, user_id]);
            } catch (err) {
                console.error("❌ FCM token update error:", err.message);
            }
        }

        // 4️⃣ Generate JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                status: user.status || "active",
            },
            process.env.JWT_SECRET
            // { expiresIn: "30d" }
        );

        res.status(200).json({
            message: "Login successful via Google",
            user_id: user.user_id,
            token,
        });
    } catch (err) {
        console.error("Google Login Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const googleSignup = asyncHandler(async (req, res) => {
    const { email, name, picture, fcmToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    const [given_name = "", family_name = ""] = name?.split(" ") || [];

    try {
        // ✅ Check if user already exists
        const [existingUsers] = await db.query(userAuthQueries.userMailCheck, [email]);

        // 🟠 If user exists
        if (existingUsers.length > 0) {
            const user = existingUsers[0];

            // 🚫 If the user has a password → normal login account → reject
            if (user.password && user.password.trim() !== "") {
                return res.status(409).json({
                    error: "This email is registered with a password. Please log in using email and password.",
                });
            }

            // 🟢 If user exists but password is empty → login via Google
            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    email: user.email,
                    status: user.status || "active",
                },
                process.env.JWT_SECRET
                // { expiresIn: "30d" }
            );

            // Optional: Update FCM token if changed
            if (fcmToken && fcmToken !== user.fcmToken) {
                try {
                    await db.query("UPDATE users SET fcmToken = ? WHERE user_id = ?", [fcmToken, user.user_id]);
                } catch (err) {
                    console.error("❌ FCM token update error:", err.message);
                }
            }

            return res.status(200).json({
                message: "Login successful via Google",
                user_id: user.user_id,
                token,
            });
        }

        // 🟢 If user not found → create new Google user
        const [result] = await db.query(userAuthQueries.userInsert, [
            given_name,
            family_name,
            email,
            null, // phone
            picture,
            fcmToken || null
        ]);

        const user_id = result.insertId;

        // Fetch the inserted user
        const [[newUser]] = await db.query(userAuthQueries.userMailCheck, [email]);

        // Optional: Assign welcome code
        let welcomeCode = null;
        try {
            welcomeCode = await assignWelcomeCode(user_id, email);
        } catch (err) {
            console.error("❌ Auto-assign welcome code error:", err.message);
        }

        // Generate JWT
        const token = jwt.sign(
            {
                user_id: newUser.user_id,
                email: newUser.email,
                status: newUser.status || "active",
            },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );

        res.status(201).json({
            message: "Signup successful via Google",
            user_id: newUser.user_id,
            token,
            ...(welcomeCode && { welcomeCode }),
        });
    } catch (err) {
        console.error("Google Signup Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});




module.exports = {
    registerUser,
    loginUser,
    verifyCode,
    setPassword,
    requestReset,
    verifyResetCode,
    resetPassword,
    googleLogin,
    googleSignup
};
