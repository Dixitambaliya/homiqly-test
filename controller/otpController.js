const asyncHandler = require('express-async-handler');
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db'); // your mysql2 pool

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// ---- Send OTP via SMS ----
const sendOtp = asyncHandler(async (req, res) => {
    const { phone, email } = req.body;

    if (!phone && !email) {
        return res.status(400).json({ message: "Either phone or email is required" });
    }

    // 1️⃣ Lookup phone & email separately
    let [byPhone] = phone
        ? await db.query("SELECT user_id, firstName, lastName, phone, email, is_approved FROM users WHERE phone = ?", [phone])
        : [[]];

    let [byEmail] = email
        ? await db.query("SELECT user_id, firstName, lastName, phone, email, is_approved FROM users WHERE email = ?", [email])
        : [[]];

    const phoneExists = byPhone.length > 0;
    const emailExists = byEmail.length > 0;

    // 2️⃣ Determine correct user
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

    // 🚫 Restrict blocked users
    if (user && Number(user.is_approved) === 2) {
        return res.status(403).json({
            message: "Your account has been restricted."
        });
    }

    // 3️⃣ SMS OTP Logic
    let otp = null;
    let token = null;

    if (phone) {
        try {
            console.log("📤 Sending SMS OTP...");

            // Generate OTP ONLY NOW (NOT BEFORE!)
            otp = generateOTP();

            const smsMessage = `Your Homiqly verification code is ${otp}. It expires in 5 minutes. Never share this code.`;

            await new Promise(resolve => setTimeout(resolve, 100));

            // Create token ONLY AFTER SMS SUCCESS
            const tokenPayload = { otp };
            if (phone) tokenPayload.phone = phone;
            if (email) tokenPayload.email = email;

            token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "30m" });

            console.log("✅ SMS OTP sent successfully (simulated).");

        } catch (error) {
            console.error("❌ Failed to send SMS OTP:", error.message);

            return res.status(500).json({
                message: "Failed to send OTP via SMS. Please try again later."
            });
        }
    }

    // 4️⃣ EMAIL OTP (optional)
    if (email) {
        (async () => {
            try {
                const emailOtp = otp || generateOTP(); // fallback if no SMS
                await sendUserVerificationMail({
                    userEmail: email,
                    code: emailOtp,
                    subject: is_registered ? "Welcome back to Homiqly" : "Welcome to Homiqly",
                });

                console.log(`📧 OTP email sent to ${email}`);
            } catch (error) {
                console.error("❌ Email OTP Error:", error.message);
            }
        })();
    }

    // 5️⃣ Build final response
    const responseMsg = is_registered
        ? `Welcome back${user?.firstName ? `, ${user.firstName}` : ""}! We've sent your OTP.`
        : "OTP sent successfully. Please continue registration.";

    return res.status(200).json({
        message: responseMsg,
        token,
        is_registered,
        is_email_registered: email && !emailExists ? true : false,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
    });
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
