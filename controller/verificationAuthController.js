const { db } = require("../config/db");
const verificationQueries = require("../config/adminQueries/verificationQueries");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer")
const bcrypt = require("bcryptjs");
const generator = require('generate-password');

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const approveVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.params.vendor_id;
    const { is_authenticated } = req.body;

    if (!vendor_id || isNaN(vendor_id)) {
        return res.status(400).json({ message: "Invalid or missing vendor ID." });
    }

    if (![1, 2].includes(is_authenticated)) {
        return res.status(400).json({ error: "Invalid status, use 1 for approve 2 for reject." });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [vendorCheck] = await conn.query(verificationQueries.vendorCheck, [vendor_id]);
        if (!vendorCheck.length) {
            return res.status(404).json({ error: "Vendor not found" });
        }

        const vendor_type = vendorCheck[0].vendorType;
        let email;
        let plainPassword = null;

        // 1️⃣ Fetch vendor email and generate password if company
        if (vendor_type === "company") {
            const [result] = await conn.query(verificationQueries.getCompanyEmail, [vendor_id]);
            email = result[0]?.companyEmail;

            if (is_authenticated === 1) {
                plainPassword = generator.generate({
                    length: 10,
                    numbers: true,
                    uppercase: true,
                    lowercase: true
                });
                const hashedPassword = await bcrypt.hash(plainPassword, 10);
                await conn.query(verificationQueries.addVendorPassword, [hashedPassword, vendor_id]);
            }

        } else if (vendor_type === "individual") {
            const [result] = await conn.query(verificationQueries.getIndividualEmail, [vendor_id]);
            email = result[0]?.email;
        } else {
            return res.status(400).json({ error: "Email not found for vendor" });
        }

        // 2️⃣ Update vendor approval status
        await conn.query(verificationQueries.vendorApprove, [is_authenticated, vendor_id]);

        // 3️⃣ If approved, transfer packages and sub-packages
        if (is_authenticated === 1) {
            const [applications] = await conn.query(`
                SELECT * FROM vendor_package_applications WHERE vendor_id = ? AND status = 0
            `, [vendor_id]);

            for (const app of applications) {
                // Insert into vendor_packages
                const [vpRes] = await conn.query(`
                    INSERT INTO vendor_packages (vendor_id, package_id, serviceLocation)
                    VALUES (?, ?, ?)
                `, [vendor_id, app.package_id, app.serviceLocation]);
                const vendorPackageId = vpRes.insertId;

                // Fetch sub-packages from application
                const [subItems] = await conn.query(`
                    SELECT package_item_id FROM vendor_package_item_application
                    WHERE application_id = ?
                `, [app.application_id]);

                for (const sub of subItems) {
                    await conn.query(`
                        INSERT INTO vendor_package_items (vendor_packages_id, package_item_id, vendor_id, package_id)
                        VALUES (?, ?, ?, ?)
                    `, [vendorPackageId, sub.package_item_id, vendor_id, app.package_id]);
                }
                // Clear application tables
                await conn.query(`DELETE FROM vendor_package_item_application WHERE application_id = ?`, [app.application_id]);
                await conn.query(`DELETE FROM vendor_package_applications WHERE application_id = ?`, [app.application_id]);
            }


            // ✅ Initialize vendor_settings
            await conn.query(`
                INSERT INTO vendor_settings (vendor_id, manual_assignment_enabled, start_datetime, end_datetime)
                VALUES (?, 1, NULL, NULL)
                ON DUPLICATE KEY UPDATE manual_assignment_enabled = 1
            `, [vendor_id]);
        }

        await conn.commit();

        // 4️⃣ Send notification email
        const message = is_authenticated === 1 ? "Vendor approved" : "Vendor rejected";
        const subject = is_authenticated === 1 ? "Your account has been approved" : "Your account has been rejected";

        let text;
        if (is_authenticated === 1 && vendor_type === "company") {
            text = `Your company account has been approved.\n\nYou can now log in to your dashboard - https://ts-homiqly-adminpanel.vercel.app/vendor/login .\n\nYour password: ${plainPassword}\n\n NOTE:- You can change your password after logging in.`;
        } else if (is_authenticated === 1) {
            text = `Your account has been approved. You can now log in to your dashboard - https://ts-homiqly-adminpanel.vercel.app/vendor/login`;
        } else {
            text = `Your account has been rejected. You may contact support if you believe this is a mistake.`;
        }

        try {
            await transport.sendMail({
                from: `"Support" <${process.env.EMAIL_USER}>`,
                to: email,
                subject,
                text,
            });
            res.status(200).json({ message: `${message} and email sent.` });

        } catch (emailErr) {
            console.error("Email sending failed:", emailErr);
            res.status(500).json({ error: `${message}, but failed to send email`, emailError: emailErr.message });
        }

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: "Database error", details: err.message });
    } finally {
        conn.release();
    }
});

const approveServiceType = asyncHandler(async (req, res) => {
    const { service_type_id } = req.params;
    const { is_approved } = req.body;

    if (!service_type_id || isNaN(service_type_id)) {
        return res.status(400).json({ message: "Invalid or missing service type ID." });
    }

    if (![1, 2].includes(Number(is_approved))) {
        return res.status(400).json({ error: "Use 1 for approve, 2 for reject." });
    }

    try {
        const [[typeRow]] = await db.query(verificationQueries.getServiceTypeDetails, [service_type_id]);
        if (!typeRow) {
            return res.status(404).json({ error: "Service type not found" });
        }
        const vendor_id = typeRow.vendor_id;
        const vendor_type = typeRow.vendorType;

        await db.query(verificationQueries.updateServiceTypeStatus, [is_approved, service_type_id]);

        let email;
        if (vendor_type === "company") {
            const [rows] = await db.query(verificationQueries.getCompanyEmail, [vendor_id]);
            email = rows?.[0]?.companyEmail;
        } else if (vendor_type === "individual") {
            const [rows] = await db.query(verificationQueries.getIndividualEmail, [vendor_id]);
            email = rows?.[0]?.email;
        }

        if (!email) {
            return res.status(400).json({ error: "Vendor email not found" });
        }

        // ✅ Compose email
        const subject = is_approved == 1
            ? "Your Service is Approved"
            : "Your Service is Rejected";

        const text = is_approved == 1
            ? `Your submitted service type "${typeRow.serviceTypeName}" has been approved. You can now offer this service to clients.`
            : `Your submitted service type "${typeRow.serviceTypeName}" has been rejected. Please contact support if needed.`;

        await transport.sendMail({
            from: `"Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            text,
        });

        res.status(200).json({ message: `Service type ${is_approved == 1 ? "approved" : "rejected"} successfully.` });
    } catch (err) {
        console.error("Error approving service type:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
});


module.exports = { approveVendor, approveServiceType };