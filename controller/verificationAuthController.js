const { db } = require("../config/db");
const verificationQueries = require("../config/adminQueries/verificationQueries");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer")
const bcrypt = require("bcryptjs");
const generator = require('generate-password');
const { sendVendorApprovalMail, sendVendorRejectionMail } = require("../config/utils/email/mailer");

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
        return res.status(400).json({ error: "Invalid status, use 1 for approve or 2 for reject." });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        // ✅ Fetch vendor info
        const [vendorRows] = await conn.query(`
            SELECT v.vendor_id, v.vendorType, 
                   i.name AS individual_name, c.companyName, 
                   i.email AS individual_email, c.companyEmail 
            FROM vendors v
            LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
            LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
            WHERE v.vendor_id = ?
            LIMIT 1
        `, [vendor_id]);

        if (!vendorRows.length) {
            return res.status(404).json({ error: "Vendor not found" });
        }

        const vendor = vendorRows[0];
        const vendor_type = vendor.vendorType;

        let email, vendorName, plainPassword = null;

        // Individual or company logic
        if (vendor_type === "company") {
            vendorName = vendor.companyName;
            email = vendor.companyEmail;

            // Give password to company vendor
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
        } else {
            vendorName = vendor.individual_name;
            email = vendor.individual_email;
        }

        // ✅ Update vendor approval status
        await conn.query(verificationQueries.vendorApprove, [is_authenticated, vendor_id]);

        // ------------------------------------------------------------
        // ⚡ APPROVAL LOGIC - using NEW TABLES
        // ------------------------------------------------------------
        if (is_authenticated === 1) {

            // Get pending package applications from NEW TABLE
            const [applications] = await conn.query(`
                SELECT applied_id AS application_id, vendor_id, package_id
                FROM vendor_applied_packages
                WHERE vendor_id = ? AND status = 0
            `, [vendor_id]);

            for (const app of applications) {

                // Get sub-items from NEW TABLE vendor_applied_package_items
                const [subItems] = await conn.query(`
                    SELECT package_item_id
                    FROM vendor_applied_package_items
                    WHERE applied_id = ?
                `, [app.application_id]);

                // Insert into final flattened table
                if (subItems.length === 0) {
                    // → No subpackages
                    await conn.query(`
                        INSERT INTO vendor_package_items_flat (vendor_id, package_id, package_item_id)
                        VALUES (?, ?, 0)
                    `, [vendor_id, app.package_id]);
                } else {
                    // → Insert selected subpackages
                    for (const sub of subItems) {
                        await conn.query(`
                            INSERT INTO vendor_package_items_flat (vendor_id, package_id, package_item_id)
                            VALUES (?, ?, ?)
                        `, [vendor_id, app.package_id, sub.package_item_id]);
                    }
                }

                // Cleanup new application tables
                await conn.query(`
                    DELETE FROM vendor_applied_package_items WHERE applied_id = ?
                `, [app.application_id]);

                await conn.query(`
                    DELETE FROM vendor_applied_packages WHERE applied_id = ?
                `, [app.application_id]);
            }

            // Ensure vendor settings exist
            await conn.query(`
                INSERT INTO vendor_settings (vendor_id, manual_assignment_enabled)
                VALUES (?, 1)
                ON DUPLICATE KEY UPDATE manual_assignment_enabled = 1
            `, [vendor_id]);
        }

        // Commit transaction
        await conn.commit();

        // Emails
        if (is_authenticated === 1) {
            sendVendorApprovalMail({
                vendorName,
                vendorEmail: email,
                plainPassword
            }).catch(() => { });
        } else {
            sendVendorRejectionMail({
                vendorName,
                vendorEmail: email
            }).catch(() => { });
        }

        return res.status(200).json({
            message: is_authenticated === 1 ? "Vendor approved" : "Vendor rejected",
            vendorName
        });

    } catch (err) {
        await conn.rollback();
        console.error("❌ Database error in approveVendor:", err);
        return res.status(500).json({ error: "Database error", details: err.message });
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