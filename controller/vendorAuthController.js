const { db } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const vendorAuthQueries = require("../config/vendorQueries/vendorAuthQueries");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const admin = require("../config/firebaseConfig");
const Mail = require("nodemailer/lib/mailer");

const resetCodes = new Map(); // Store reset codes in memory
const RESET_EXPIRATION = 10 * 60 * 1000;

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const generateResetCode = () =>
    Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0");
        
// Create User
const registerVendor = async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        console.log("🚀 Incoming vendor registration request");
        console.log("📦 Request body:", req.body);
        console.log("📂 Uploaded files:", req.uploadedFiles);

        const {
            vendorType,
            name,
            phone,
            email,
            password,
            companyName,
            companyAddress,
            googleBusinessProfileLink,
            companyEmail,
            contactPerson,
            companyPhone,
            services,
            confirmation,
        } = req.body;

        if (!confirmation || confirmation !== "true") {
            console.warn("❌ Data not confirmed");
            return res
                .status(400)
                .json({ error: "Please confirm the data is correct." });
        }

        let hashedPassword = null;

        if (vendorType.toLowerCase() === "individual") {
            if (!password) {
                console.warn("❌ Missing password for individual vendor");
                return res
                    .status(400)
                    .json({ error: "Password is required for individual vendors." });
            }
            hashedPassword = await bcrypt.hash(password, 10);
            console.log("🔐 Password hashed successfully");
        }

        // Insert vendor
        const [vendorRes] = await conn.query(vendorAuthQueries.insertVendor, [
            vendorType,
            hashedPassword,
        ]);
        const vendor_id = vendorRes.insertId;
        console.log("✅ Vendor inserted with ID:", vendor_id);

        // Upload documents
        if (vendorType.toLowerCase() === "company") {
            console.log("🏢 Inserting company details");
            await conn.query(vendorAuthQueries.insertCompanyDetails, [
                vendor_id,
                companyName,
                contactPerson,
                companyEmail,
                googleBusinessProfileLink,
                companyPhone,
                companyAddress,
            ]);
        } else if (vendorType.toLowerCase() === "individual") {
            const resume = req.uploadedFiles?.resume?.[0]?.url || null;
            console.log("📄 Resume URL:", resume);

            if (!resume && req.files && req.files.some(f => f.fieldname === 'resume')) {
                console.warn("❌ Resume upload failed");
                return res
                    .status(400)
                    .json({ error: "Resume upload failed. Please try again." });
            }

            console.log("👤 Inserting individual details");
            await conn.query(vendorAuthQueries.insertIndividualDetails, [
                vendor_id,
                name,
                phone,
                email,
                resume,
            ]);
        }

        // Parse services
        console.log("🔍 Parsing services...");
        const parsedServices = JSON.parse(services);
        console.log("🛠 Services parsed:", parsedServices);

        const processedCategories = new Set();

        for (const service of parsedServices) {
            const { serviceCategoryId, serviceId, serviceLocation } = service;
            console.log("🔧 Processing service:", service);

            if (serviceCategoryId == null || serviceId == null) {
                console.warn("❌ Missing serviceCategoryId or serviceId");
                return res
                    .status(400)
                    .json({ error: `Missing serviceCategoryId or serviceId in service` });
            }

            if (!processedCategories.has(serviceCategoryId)) {
                const [categoryExists] = await db.query(
                    vendorAuthQueries.checkCategoryExits,
                    [serviceCategoryId]
                );
                console.log(`📂 Category check [${serviceCategoryId}]:`, categoryExists.length > 0);

                if (categoryExists.length === 0) {
                    return res
                        .status(400)
                        .json({
                            error: `Service category ID ${serviceCategoryId} does not exist.`,
                        });
                }

                if (vendorType.toLowerCase() === "individual") {
                    await conn.query(vendorAuthQueries.insertIndividualServiceCategory, [
                        vendor_id,
                        serviceCategoryId,
                    ]);
                } else {
                    await conn.query(vendorAuthQueries.insertCompanyServiceCategory, [
                        vendor_id,
                        serviceCategoryId,
                    ]);
                }

                processedCategories.add(serviceCategoryId);
                console.log(`✅ Category ${serviceCategoryId} inserted`);
            }

            const [serviceExists] = await db.query(
                vendorAuthQueries.checkserviceExits,
                [serviceId, serviceCategoryId]
            );
            console.log(`🔍 Service exists check [${serviceId}]:`, serviceExists.length > 0);

            if (serviceExists.length === 0) {
                return res
                    .status(400)
                    .json({
                        error: `Service ID ${serviceId} under category ${serviceCategoryId} does not exist.`,
                    });
            }

            if (vendorType.toLowerCase() === "individual") {
                await conn.query(vendorAuthQueries.insertIndividualService, [
                    vendor_id,
                    serviceId,
                    serviceLocation,
                ]);
            } else {
                await conn.query(vendorAuthQueries.insertCompanyService, [
                    vendor_id,
                    serviceId,
                    serviceLocation,
                ]);
            }

            console.log(`✅ Service ${serviceId} inserted for vendor ${vendor_id}`);
        }

        await conn.commit();
        console.log("✅ Transaction committed");

        // Admin email notification
        try {
            const [adminEmails] = await db.query("SELECT email FROM admin WHERE email IS NOT NULL");
            if (adminEmails.length > 0) {
                const emailAddresses = adminEmails.map(row => row.email);
                console.log("📧 Notifying admins:", emailAddresses);

                await transport.sendMail({
                    from: process.env.EMAIL_USER || "noreply@homiqly.com",
                    to: emailAddresses,
                    subject: "New Vendor Registration",
                    html: `
              <h2>New Vendor Registration</h2>
              <p>A new vendor has registered and is pending approval:</p>
              <ul>
                <li><strong>Vendor Type:</strong> ${vendorType}</li>
                <li><strong>Name:</strong> ${vendorType === 'individual' ? name : companyName}</li>
                <li><strong>Email:</strong> ${vendorType === 'individual' ? email : companyEmail}</li>
              </ul>
              <p>Please review and approve in the admin panel.</p>
            `
                });
                console.log("📧 Admin notification sent");
            }
        } catch (emailError) {
            console.error("⚠️ Failed to send admin notification:", emailError.message);
        }

        return res.status(201).json({
            message: "Vendor registered successfully",
            vendor_id,
        });

    } catch (err) {
        await conn.rollback();
        console.error("❌ Registration failed:", err);
        res.status(500).json({
            error: "Internal server error during vendor registration",
            details: err.message,
        });
    } finally {
        conn.release();
        console.log("🔚 DB connection released");
    }
};

const loginVendor = asyncHandler(async (req, res) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        let vendorDetails = null;
        let vendorType = null;

        // Try logging in as individual
        const [individualResult] = await db.query(
            vendorAuthQueries.vendorLoginIndividual,
            [email]
        );

        if (individualResult.length > 0) {
            vendorDetails = individualResult[0];
            vendorType = "individual";
        } else {
            // Try company vendor
            const [companyResult] = await db.query(
                vendorAuthQueries.vendorLoginCompany,
                [email]
            );

            if (companyResult.length > 0) {
                vendorDetails = companyResult[0];
                vendorType = "company";
            }
        }

        if (!vendorDetails) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const [vendorAuthResult] = await db.query(
            "SELECT password, is_authenticated, role FROM vendors WHERE vendor_id = ?",
            [vendorDetails.vendor_id]
        );

        if (vendorAuthResult.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const vendorAuth = vendorAuthResult[0];

        if (!vendorAuth.password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check plain password OR hashed
        let isPasswordValid = false;

        if (password === vendorAuth.password) {
            isPasswordValid = true;
        } else {
            isPasswordValid = await bcrypt.compare(password, vendorAuth.password);
        }

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check auth status
        if (vendorAuth.is_authenticated === 0) {
            return res.status(403).json({ error: "Your account is pending approval." });
        } else if (vendorAuth.is_authenticated === 2) {
            return res.status(403).json({ error: "Your account has been rejected." });
        }

        // Save FCM token if present
        if (fcmToken && fcmToken.trim() !== "") {
            try {
                await db.query(
                    "UPDATE vendors SET fcmToken = ? WHERE vendor_id = ?",
                    [fcmToken.trim(), vendorDetails.vendor_id]
                );
            } catch (err) {
                console.warn("FCM token update error:", err.message);
            }
        }

        // ✅ Build token payload with correct email
        const token = jwt.sign(
            {
                vendor_id: vendorDetails.vendor_id,
                name: vendorDetails.name,
                vendor_type: vendorType,
                email: vendorDetails.email,
                role: vendorAuth.role || "vendor",
            },
            process.env.JWT_SECRET
        );

        res.status(200).json({
            message: "Login successful",
            token,
            vendor_id: vendorDetails.vendor_id,
            vendor_type: vendorType,
            name: vendorDetails.name,
            role: vendorAuth.role || "vendor",
        });
    } catch (err) {
        console.error("Vendor login error:", err);
        res.status(500).json({
            error: "Server error",
            details: err.message,
        });
    }
});

const requestResetVendor = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        let vendorFound = false;

        // Check in company_details
        const [companyResult] = await db.query(
            vendorAuthQueries.vendorCompanyEmail,
            [email]
        );
        if (companyResult && companyResult.length > 0) {
            vendorFound = true;
        }

        // If not found in company table, check in individual_details
        if (!vendorFound) {
            const [individualResult] = await db.query(
                vendorAuthQueries.vendorIndividualEmail,
                [email]
            );
            if (individualResult && individualResult.length > 0) {
                vendorFound = true;
            }
        }

        if (!vendorFound) {
            return res.status(404).json({ error: "Vendor email not found" });
        }

        const code = generateResetCode();
        const expiryTime = Date.now() + RESET_EXPIRATION;
        resetCodes.set(email, { code, expires: expiryTime });

        await transport.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Vendor Password Reset Code",
            text: `Your password reset code is: ${code}. It will expire in 5 minutes.`,
        });

        res.status(200).json({ message: "Reset code sent to vendor email" });
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
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Step 1: Try company vendor
        const [companyRows] = await db.query(
            vendorAuthQueries.getVendorIdbycompanyEmail,
            [email]
        );

        if (companyRows.length > 0) {
            const vendorId = companyRows[0].vendor_id;

            await db.query(vendorAuthQueries.resetVendorPassword, [
                hashedPassword,
                vendorId,
            ]);

            return res.json({
                message: "Password reset successfully for company vendor",
            });
        }

        // Step 2: Try individual vendor
        const [individualRows] = await db.query(
            vendorAuthQueries.getVendorIdbyEmail,
            [email]
        );

        if (individualRows.length > 0) {
            const vendorId = individualRows[0].vendor_id;

            await db.query(vendorAuthQueries.resetVendorPassword, [
                hashedPassword,
                vendorId,
            ]);

            return res.json({
                message: "Password reset successfully for individual vendor",
            });
        }

        return res
            .status(404)
            .json({ error: "Vendor not found with provided email" });
    } catch (err) {
        console.error("Password Reset Error:", err);
        res
            .status(400)
            .json({ error: "Invalid or expired token", details: err.message });
    }
});

const changeVendorPassword = asyncHandler(async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
        return res
            .status(400)
            .json({
                error: "All fields are required: email, oldPassword, newPassword",
            });
    }

    try {
        // Step 1: Find vendor_id from individual or company
        let vendorId;

        const [company] = await db.query(
            vendorAuthQueries.getVendorIdbycompanyEmail,
            [email]
        );

        if (company.length > 0) {
            vendorId = company[0].vendor_id;
        } else {
            const [individual] = await db.query(
                vendorAuthQueries.getVendorIdbyEmail,
                [email]
            );
            if (individual.length > 0) {
                vendorId = individual[0].vendor_id;
            }
        }

        if (!vendorId) {
            return res.status(404).json({ error: "Vendor not found" });
        }

        // Step 2: Get current password from vendors table
        const [vendor] = await db.query(vendorAuthQueries.selectPassword, [
            vendorId,
        ]);

        if (vendor.length === 0) {
            return res
                .status(404)
                .json({ error: "Vendor not found in vendors table" });
        }

        // For plain text password comparison (not recommended for production)
        if (oldPassword === vendor[0].password) {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await db.query(vendorAuthQueries.resetVendorPassword, [
                hashedNewPassword,
                vendorId,
            ]);
            return res.json({ message: "Password changed successfully" });
        }

        // For hashed password comparison
        const isMatch = await bcrypt.compare(oldPassword, vendor[0].password);
        if (!isMatch) {
            return res.status(401).json({ error: "Old password is incorrect" });
        }

        // Step 3: Hash and update new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await db.query(vendorAuthQueries.resetVendorPassword, [
            hashedNewPassword,
            vendorId,
        ]);

        res.json({ message: "Password changed successfully" });
    } catch (err) {
        console.error("Change Password Error:", err);
        res
            .status(500)
            .json({ error: "Internal server error", details: err.message });
    }
});

module.exports = {
    registerVendor,
    loginVendor,
    requestResetVendor,
    verifyResetCode,
    resetPassword,
    changeVendorPassword,
};
