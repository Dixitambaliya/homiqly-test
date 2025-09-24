const { db } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const adminAuthQueries = require("../config/adminQueries/adminAuthQueries");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

const resetCodes = new Map(); // Store reset codes in memory
const RESET_EXPIRATION = 10 * 60 * 1000;
const generateResetCode = () =>
    Math.floor(1000 + Math.random() * 900000).toString(); // 6-digit code

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Register Admin
const registerAdmin = asyncHandler(async (req, res) => {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
        return res.status(400).json({ error: "All fields required" });
    }

    try {
        const [results] = await db.query(adminAuthQueries.adminCheck, [email]);

        if (results.length > 0) {
            return res.status(400).json({ error: "email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertResult = await db.query(adminAuthQueries.adminInsert, [
            email,
            name,
            hashedPassword,
        ]);

        res.status(200).json({
            message: "Admin created",
            admin_id: insertResult.insertId,
            name,
        });
    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    try {
        const [results] = await db.query(adminAuthQueries.adminLogin, [email]);

        if (!results || results.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const admin = results[0];

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Optional: Update FCM token
        if (fcmToken && fcmToken.trim() !== "") {
            try {
                await db.query(
                    "UPDATE admin SET fcmToken = ? WHERE admin_id = ?",
                    [fcmToken.trim(), admin.admin_id]
                );
            } catch (err) {
                console.error("FCM token update error:", err.message);
            }
        }

        // Final JWT with email included
        const token = jwt.sign(
            {
                admin_id: admin.admin_id,
                name: admin.name,
                email: admin.email,
                role: admin.role || "admin"
            },
            process.env.JWT_SECRET
        );

        res.status(200).json({
            message: "Login successful",
            token,
            admin_id: admin.admin_id,
            name: admin.name,
            email: admin.email,
            role: admin.role || "admin"
        });

    } catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const loginUpdateAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    try {
        const [results] = await db.query(adminAuthQueries.adminLogin, [email]);

        if (!results || results.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const admin = results[0];

        // For plain text password comparison (not recommended for production)
        if (password === admin.password) {
            const token = jwt.sign(
                {
                    userId: admin.admin_id,
                    email: admin.email,
                },
                process.env.JWT_SECRET,
                { expiresIn: "2h" }
            );

            // Build the dummy-style response
            const responsePayload = {
                user: {
                    id: `${admin.admin_id}`,
                    displayName: admin.name || "Admin User",
                    photoURL:
                        "https://api-dev-minimal-v630.pages.dev/assets/images/avatar/avatar-25.webp", // optional static image
                    phoneNumber: admin.phone || "+1 416-555-0198",
                    country: admin.country || "Canada",
                    address: admin.address || "90210 Broadway Blvd",
                    state: admin.state || "California",
                    city: admin.city || "San Francisco",
                    zipCode: admin.zip_code || "94116",
                    about:
                        admin.about ||
                        "Praesent turpis. Phasellus viverra nulla ut metus varius laoreet.",
                    role: "admin",
                    isPublic: true,
                    email: admin.email,
                    password: "@2Minimal", // ideally don't return this in production
                },
                accessToken: token,
            };

            return res.status(200).json(responsePayload);
        }

        // For hashed password comparison
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                userId: admin.admin_id,
                email: admin.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        // Build the dummy-style response
        const responsePayload = {
            user: {
                id: `${admin.admin_id}`,
                displayName: admin.name || "Admin User",
                photoURL:
                    "https://api-dev-minimal-v630.pages.dev/assets/images/avatar/avatar-25.webp", // optional static image
                phoneNumber: admin.phone || "+1 416-555-0198",
                country: admin.country || "Canada",
                address: admin.address || "90210 Broadway Blvd",
                state: admin.state || "California",
                city: admin.city || "San Francisco",
                zipCode: admin.zip_code || "94116",
                about:
                    admin.about ||
                    "Praesent turpis. Phasellus viverra nulla ut metus varius laoreet.",
                role: "admin",
                isPublic: true,
                email: admin.email,
                password: "@2Minimal", // ideally don't return this in production
            },
            accessToken: token,
        };

        res.status(200).json(responsePayload);
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

const requestResetAdmin = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const [results] = await db.query(adminAuthQueries.adminMailCheck, [email]);
        if (!results || results.length === 0) {
            return res.status(404).json({ error: "Admin email not found" });
        }

        const code = generateResetCode();
        const expiryTime = Date.now() + RESET_EXPIRATION;
        resetCodes.set(email, { code, expires: expiryTime });

        await transport.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Admin Password Reset Code",
            text: `Your password reset code is: ${code}. It will expire in 5 minutes.`,
        });

        res.status(200).json({ message: "Reset code sent to admin email" });
    } catch (err) {
        console.error("Email Sending Error:", err);
        res
            .status(500)
            .json({ error: "Error sending email", details: err.message });
    }
});

const verifyResetCode = asyncHandler(async (req, res) => {
    const { email, resetCode } = req.body;
    if (!email || !resetCode)
        return res.status(400).json({ error: "Required fields missing" });

    const storedData = resetCodes.get(email);
    if (!storedData || storedData.expires < Date.now()) {
        return res.status(400).json({ error: "Invalid or expired code" });
    }

    if (storedData.code !== resetCode) {
        return res.status(400).json({ error: "Incorrect reset code" });
    }

    resetCodes.delete(email);
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });

    res.json({ message: "Code verified successfully", token });
});

const resetPassword = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(400).json({ error: "Token is required" });
    }

    const token = authHeader.split(" ")[1];
    const { newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).json({ error: "Please provide new password" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;

        const adminRows = await db.query(adminAuthQueries.getAdminByEmail, [email]);

        if (!adminRows || adminRows.length === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(adminAuthQueries.resetAdminPassword, [
            hashedPassword,
            email,
        ]);

        res.json({ message: "Admin password reset successfully" });
    } catch (err) {
        console.error("Admin Password Reset Error:", err);
        res
            .status(400)
            .json({ error: "Invalid or expired token", details: err.message });
    }
});

const changeAdminPassword = asyncHandler(async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
        return res.status(400).json({
            error: "All fields are required: email, oldPassword, newPassword",
        });
    }

    try {
        const [adminRows] = await db.query(adminAuthQueries.getAdminByEmail, [
            email,
        ]);

        if (!adminRows || adminRows.length === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const admin = adminRows[0];
        const isMatch = await bcrypt.compare(oldPassword, admin.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Old password is incorrect" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query(adminAuthQueries.resetAdminPassword, [
            hashedNewPassword,
            email,
        ]);

        res.json({ message: "Admin password changed successfully" });
    } catch (err) {
        console.error("Change Admin Password Error:", err);
        res
            .status(500)
            .json({ error: "Internal server error", details: err.message });
    }
});

module.exports = {
    registerAdmin,
    loginAdmin,
    requestResetAdmin,
    changeAdminPassword,
    resetPassword,
    verifyResetCode,
    loginUpdateAdmin,
};
