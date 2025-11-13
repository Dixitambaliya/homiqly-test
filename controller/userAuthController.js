const asyncHandler = require("express-async-handler");
const twilio = require('twilio');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db } = require("../config/db");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const { sendPasswordUpdatedMail, sendPasswordResetCodeMail, sendUserVerificationMail, sendUserWelcomeMail } = require("../config/utils/email/mailer");
const { assignWelcomeCode } = require("../config/utils/email/mailer");
const userAuthQueries = require("../config/userQueries/userAuthQueries");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
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
        const [existingUsers] = await db.query(userAuthQueries.userMailCheck, [email, phone]);

        if (existingUsers.length > 0) {
            // Find the matching record by checking fields
            const existingUser = existingUsers.find(
                (user) => user.email === email || user.phone === phone
            );

            if (existingUser.email === email) {
                if (!existingUser.password) {
                    return res.status(400).json({
                        error: "This email is linked to a Google account. Please log in using Google.",
                    });
                }
                return res.status(400).json({ error: "This email is already registered." });
            }

            if (existingUser.phone === phone) {
                return res.status(400).json({ error: "This phone number already exists." });
            }
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
    const { email, name, fcmToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // ✂️ Split full name into first & last name
        let firstName = "";
        let lastName = "";

        if (name) {
            const parts = name.trim().split(" ");
            firstName = parts[0];
            lastName = parts.slice(1).join(" ") || "";
        }

        // 1️⃣ Check if user exists
        const [existingUsers] = await db.query(userAuthQueries.userMailCheckGoogle, [email]);
        let user, user_id;
        let is_google_register = false; // false = already registered

        if (!existingUsers || existingUsers.length === 0) {
            // 2️⃣ Not found → auto-register a new Google user
            const [result] = await db.query(
                `INSERT INTO users (email, firstName, lastName, created_at)
                 VALUES (?, ?, ?, NOW())`,
                [email, firstName, lastName]
            );

            user_id = result.insertId;
            user = { user_id, email, firstName, lastName };
            is_google_register = true; // true for new user
        } else {
            user = existingUsers[0];
            user_id = user.user_id;
        }

        // 3️⃣ Generate JWT token
        const token = jwt.sign(
            {
                user_id,
                email,
                status: user.status || "active",
            },
            process.env.JWT_SECRET
        );

        // 4️⃣ Respond immediately
        res.status(200).json({
            message: existingUsers.length > 0
                ? "Login successful via Google"
                : "Account created & logged in via Google",
            user_id,
            email,
            firstName: user.firstName || firstName,
            lastName: user.lastName || lastName,
            token,
            is_google_register,
        });

        // 🧩 5️⃣ Fire & forget: update FCM token
        if (fcmToken && fcmToken !== user.fcmToken) {
            (async () => {
                try {
                    await db.query("UPDATE users SET fcmToken = ? WHERE user_id = ?", [fcmToken, user_id]);
                    console.log(`📱 FCM token updated for user ${user_id}`);
                } catch (err) {
                    console.error("❌ FCM token update error:", err.message);
                }
            })();
        }

        // 🎁 6️⃣ Fire & forget: assign welcome promo code
        (async () => {
            try {
                await assignWelcomeCode({ user_id, user_email: email });
                console.log(`🎁 Welcome code assigned for ${email}`);
            } catch (err) {
                console.error("❌ Auto-assign welcome code error:", err.message);
            }
        })();

        // ✉️ 7️⃣ Fire & forget: send welcome email (only for new Google users)
        if (is_google_register && email) {
            (async () => {
                try {
                    await sendUserWelcomeMail({
                        userEmail: email,
                        fullName: `${firstName}${lastName ? " " + lastName : ""}`,
                    });
                    console.log(`📧 Welcome email sent to ${email}`);
                } catch (error) {
                    console.error("❌ Failed to send welcome email:", error.message);
                }
            })();
        }

    } catch (err) {
        console.error("Google Login Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});


// ✅ Step 1: Request OTP
const sendOtp = asyncHandler(async (req, res) => {
    const { phone, email } = req.body;

    if (!phone && !email) {
        return res.status(400).json({ message: "Either phone or email is required" });
    }

    // ✅ 1. Lookup phone & email separately
    let [byPhone] = phone
        ? await db.query("SELECT user_id, firstName, lastName, phone, email FROM users WHERE phone = ?", [phone])
        : [[]];
    let [byEmail] = email
        ? await db.query("SELECT user_id, firstName, lastName, phone, email FROM users WHERE email = ?", [email])
        : [[]];

    const phoneExists = byPhone.length > 0;
    const emailExists = byEmail.length > 0;

    // ✅ 2. Determine final user (if both exist and same user_id)
    let user = null;
    if (phone && email) {
        if (phoneExists && emailExists && byPhone[0].user_id === byEmail[0].user_id) {
            user = byPhone[0];
        } else if (phoneExists && !emailExists) {
            user = byPhone[0];
        } else if (emailExists && !phoneExists) {
            user = byEmail[0];
        } else if (phoneExists && emailExists && byPhone[0].user_id !== byEmail[0].user_id) {
            return res.status(400).json({
                message: "Phone and email belong to different accounts. Please use only one to log in.",
                conflict: true,
            });
        }
    } else {
        user = phoneExists ? byPhone[0] : byEmail[0];
    }

    const is_registered = phoneExists || emailExists;

    // 🔢 3. Generate OTP
    const otp = generateOTP();

    // 🔐 4. Create JWT (valid 30 min)
    const tokenPayload = { otp };
    if (phone) tokenPayload.phone = phone;
    if (email) tokenPayload.email = email;
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "30m" });

    // 📱 5. Send OTP via SMS (async)
    if (phone) {
        try {
            const smsMessage = `Your Homiqly verification code is ${otp}. It expires in 5 minutes. Never share this code.`;
            // ✅ Await Twilio directly
            await client.messages.create({
                body: smsMessage,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone,
            });

        } catch (error) {
            console.error("❌ Failed to send SMS OTP:", error.message);

            // Optionally handle Twilio errors properly:
            if (
                error.message.includes("cannot be a landline") ||
                error.code === 21614 ||
                error.code === 21211
            ) {
                return res.status(400).json({
                    message: "Invalid or unsupported phone number. Please use a valid mobile number.",
                    error: error.message,
                });
            }

            return res.status(500).json({
                message: "Failed to send OTP via SMS. Please try again later.",
                error: error.message,
            });
        }
    }

    // 📧 6. Send OTP via Email (async)
    if (email) {
        (async () => {
            try {
                await sendUserVerificationMail({
                    userEmail: email,
                    code: otp,
                    subject: is_registered
                        ? "Welcome back to Homiqly"
                        : "Welcome to Homiqly",
                });

                console.log(`📧 OTP email sent to ${email}`);
            } catch (error) {
                console.error("❌ Failed to send email OTP:", error.message);
            }
        })();
    }

    // ✅ 7. Build response
    const responseMsg = is_registered
        ? `Welcome back${user?.firstName ? `, ${user.firstName}` : ""}! We've sent your OTP.`
        : "OTP sent successfully. Please continue registration.";

    res.status(200).json({
        message: responseMsg,
        token,
        is_registered,
        // ✅ FINAL LOGIC:
        // if email provided AND it's new → true
        // if only phone is provided and new → false
        is_email_registered: email && !emailExists ? true : false,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
    });
});


function normalizePhone(phone) {
    if (!phone) return null;
    try {
        const parsed = parsePhoneNumberFromString(phone);
        if (!parsed) return phone;
        return parsed.nationalNumber; // return only the local part (no +91 or +1)
    } catch {
        return phone; // fallback if invalid format
    }
}

// ✅ Step 2: Verify OTP (Handles both Login & Registration)
const verifyOtp = asyncHandler(async (req, res) => {
    let { phone, email, otp, firstName, lastName, password } = req.body;
    const authHeader = req.headers.authorization;

    // ✅ Normalize incoming phone number
    const normalizedInputPhone = normalizePhone(phone);

    // ✅ Lookup all users
    let [allUsers] = await db.query("SELECT user_id, phone, email, firstName, lastName FROM users");

    // Normalize DB phones
    const matchedByDigits = allUsers.find(u => {
        const normalizedDbPhone = normalizePhone(u.phone);
        return normalizedDbPhone && normalizedInputPhone && normalizedDbPhone === normalizedInputPhone;
    });

    // Check existence
    let [byPhone] = phone
        ? await db.query("SELECT * FROM users WHERE phone = ?", [phone])
        : [[]];
    let [byEmail] = email
        ? await db.query("SELECT * FROM users WHERE email = ?", [email])
        : [[]];

    const phoneExists = byPhone.length > 0 || !!matchedByDigits;
    const emailExists = byEmail.length > 0;

    // 🚫 Cross-country duplicate check
    if (!byPhone.length && matchedByDigits) {
        return res.status(400).json({
            message: `This phone number (same digits) is already registered with another country code.`,
            conflict: true,
        });
    }

    // 🧠 Determine user & check conflict
    let user = null;

    if (phone && email) {
        if (phoneExists && emailExists) {
            // Both exist but belong to different users
            if (byPhone[0].user_id !== byEmail[0].user_id) {
                return res.status(400).json({
                    message: "This phone and email belong to different accounts. Please use only one.",
                    conflict: true,
                });
            } else {
                user = byPhone[0]; // Same user, safe to continue
            }
        } else if (phoneExists && !emailExists) {
            // 🚫 Block if trying to register a new email on existing phone
            if (!byPhone[0].email || byPhone[0].email === email) {
                // Allow only if email is same or null
                user = byPhone[0];
            } else {
                return res.status(400).json({
                    message: "This phone number is already registered with another account.",
                });
            }
        } else if (emailExists && !phoneExists) {
            // 🚫 Block if trying to register a new phone on existing email
            if (!byEmail[0].phone || byEmail[0].phone === phone) {
                user = byEmail[0];
            } else {
                return res.status(400).json({
                    message: "This email is already registered with another account.",
                });
            }
        } else {
            // Neither exists → new registration
            user = null;
        }
    } else {
        user = phoneExists ? byPhone[0] : byEmail[0];
    }

    // ✅ Direct password login (no OTP required)
    if (password && user) {
        const storedPassword = user.password
            ? (typeof user.password === "object" ? user.password.toString() : user.password)
            : null;

        if (storedPassword) {
            const isMatch = await bcrypt.compare(password, storedPassword);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            // Successful password login — return immediately
            const loginToken = jwt.sign(
                { user_id: user.user_id, phone: user.phone, email: user.email },
                process.env.JWT_SECRET
            );

            assignWelcomeCode({
                user_email: email,
                user_id: user.user_id,
                user_name: `${firstName || ""} ${lastName || ""}`.trim(),
            }).catch(err => console.error("❌ Auto-assign welcome code error:", err.message));

            return res.status(200).json({
                message: "Login successful via password",
                token: loginToken,
                user: {
                    user_id: user.user_id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    email: user.email,
                    is_approved: user.is_approved,
                    created_at: user.created_at,
                },
            });
        }
    }


    // ✅ OTP required
    if (!otp) {
        return res.status(400).json({ message: "OTP is required for login/registration" });
    }

    // 🧩 Decode OTP token
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(400).json({ message: "Authorization token missing" });
    }

    let decoded;
    try {
        const token = authHeader.split(" ")[1];
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(400).json({ message: "OTP expired. Please request a new one." });
        }
        return res.status(400).json({ message: "Invalid token" });
    }

    decoded.otp = String(decoded.otp);
    otp = String(otp);

    const otpValid =
        (decoded.phone && phone && decoded.phone === phone && decoded.otp === otp) ||
        (decoded.email && email && decoded.email === email && decoded.otp === otp);

    if (!otpValid) {
        return res.status(400).json({ message: "Invalid OTP or identifier" });
    }

    // ✅ OTP verified
    if (!user) {
        // New registration path
        if (!firstName || !lastName) {
            return res.status(200).json({
                message: "Welcome — please provide name (and optionally password)",
                requireDetails: true,
            });
        }

        // 🚫 NEW LOGIC — strict check before creating new user
        if (phoneExists) {
            return res.status(400).json({
                message: "This phone number is already registered. Please log in instead.",
            });
        }

        if (emailExists) {
            return res.status(400).json({
                message: "This email is already registered. Please log in instead.",
            });
        }

        // ✅ Create user only if both phone & email are free
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const [result] = await db.query(
            `INSERT INTO users (firstName, lastName, phone, email, password, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())`,
            [firstName, lastName, phone || null, email || null, hashedPassword]
        );

        const user_id = result.insertId;
        const loginToken = jwt.sign({ user_id, phone, email }, process.env.JWT_SECRET);

        if (email) {
            (async () => {
                try {
                    await
                        sendUserWelcomeMail({ userEmail: email, fullName: `${firstName}${lastName ? " " + lastName : ""}` });
                    console.log(`📧 Welcome email sent to ${email}`);
                } catch (err) {
                    console.error("❌ Failed to send welcome email:", err.message);
                }
            })();
        }

        assignWelcomeCode({
            user_email: email,
            user_id,
            user_name: `${firstName || ""} ${lastName || ""}`.trim(),
        })
            .catch(err => console.error("❌ Auto-assign welcome code error:", err.message));

        return res.status(200).json({
            message: "Registration successful",
            token: loginToken,
            user: {
                user_id,
                firstName,
                lastName,
                phone,
                email,
                created_at: new Date(),
            },
        });
    }

    // ✅ Existing user login via OTP
    const loginToken = jwt.sign(
        { user_id: user.user_id, phone: user.phone, email: user.email },
        process.env.JWT_SECRET
    );

    assignWelcomeCode({ user_id: user.user_id, user_email: email, user_name: `${firstName || ""} ${lastName || ""}`.trim(), })
        .catch(err => console.error("❌ Auto-assign welcome code error:", err.message));

    return res.status(200).json({
        message: "Login successful via OTP",
        token: loginToken,
        user: {
            user_id: user.user_id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            is_approved: user.is_approved,
            created_at: user.created_at,
        },
    });
});











module.exports = {
    registerUser,
    // loginUser,
    verifyCode,
    setPassword,
    requestReset,
    verifyResetCode,
    resetPassword,
    googleLogin,
    // googleSignup,
    sendOtp,
    verifyOtp
};
