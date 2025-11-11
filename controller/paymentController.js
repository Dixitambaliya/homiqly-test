const asyncHandler = require("express-async-handler");
const { db } = require("../config/db")
const vendorGetQueries = require("../config/vendorQueries/vendorGetQueries");

const registerBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    let {
        account_holder_name,
        bank_name,
        institution_number,
        transit_number,
        account_number,
        bank_address = null,
        email = null,
        legal_name = null,
        dob = null, // for individual
        business_name = null, // for business
        preferred_transfer_type = "bank_transfer",
        interac_email,
        interac_phone
    } = req.body;

    const government_id = req.uploadedFiles?.government_id?.[0]?.url || null;

    // 🧹 Trim inputs
    account_holder_name = account_holder_name?.trim();
    bank_name = bank_name?.trim();
    institution_number = institution_number?.trim();
    transit_number = transit_number?.trim();
    account_number = account_number?.trim();

    // 🧩 Validation
    if (
        !account_holder_name ||
        !bank_name ||
        !institution_number ||
        !transit_number ||
        !account_number ||
        !preferred_transfer_type
    ) {
        return res.status(400).json({ message: "All required fields must be provided." });
    }

    const digitOnly = /^\d+$/;

    if (!digitOnly.test(institution_number) || institution_number.length !== 3) {
        return res.status(400).json({ message: "Institution Number must be a 3-digit numeric code." });
    }

    if (!digitOnly.test(transit_number) || transit_number.length !== 5) {
        return res.status(400).json({ message: "Transit Number must be a 5-digit numeric code." });
    }

    if (!digitOnly.test(account_number) || account_number.length < 7 || account_number.length > 12) {
        return res.status(400).json({ message: "Account Number must be between 7 and 12 digits." });
    }

    // 🧩 Insert new record
    try {
        await db.query(
            `INSERT INTO vendor_bank_accounts
             (vendor_id, account_holder_name, bank_name, institution_number, transit_number, account_number,
              bank_address, email, legal_name, dob, business_name, government_id, preferred_transfer_type,interac_email, interac_phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? , ?)`,
            [
                vendor_id,
                account_holder_name,
                bank_name,
                institution_number,
                transit_number,
                account_number,
                bank_address,
                email,
                legal_name,
                dob,
                business_name,
                government_id,
                preferred_transfer_type,
                interac_email,
                interac_phone
            ]
        );

        res.json({ message: "Bank account registered successfully." });
    } catch (err) {
        console.error("❌ Error registering bank account:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    const [rows] = await db.query(
        `SELECT
            account_holder_name,
            bank_name,
            institution_number,
            transit_number,
            account_number,
            bank_address,
            email,
            legal_name,
            dob,
            business_name,
            government_id,
            preferred_transfer_type,
            interac_email,
            interac_phone
         FROM vendor_bank_accounts
         WHERE vendor_id = ?`,
        [vendor_id]
    );

    if (rows.length === 0) {
        return res.status(400).json({ message: "No bank account found" });
    }

    res.json(rows[0]);
});

const editBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    let {
        account_holder_name,
        bank_name,
        institution_number,
        transit_number,
        account_number,
        bank_address = null,
        email = null,
        legal_name,
        dob,
        business_name = null, // for business
        preferred_transfer_type = "bank_transfer",
        interac_email,
        interac_phone
    } = req.body;

    // ✅ Check all required fields
    const requiredFields = {
        account_holder_name,
        bank_name,
        institution_number,
        transit_number,
        account_number,
        bank_address,
        email,
        legal_name,
        dob,
        preferred_transfer_type,
        interac_email,
        interac_phone
    };

    for (const [key, value] of Object.entries(requiredFields)) {
        if (value === undefined || value === null || value === "") {
            return res.status(400).json({
                message: `Field '${key}' is required.`
            });
        }
    }


    // 🔍 Check if account exists
    const [rows] = await db.query(
        "SELECT vendor_bank_account_id, government_id FROM vendor_bank_accounts WHERE vendor_id = ?",
        [vendor_id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Bank account not found" });
    }

    // ✅ Preserve government_id if not re-uploaded
    const existingAccount = rows[0];
    const government_id =
        req.uploadedFiles?.government_id?.[0]?.url || existingAccount.government_id || null;

    // 🛠️ Perform update
    const [result] = await db.query(
        `UPDATE vendor_bank_accounts
         SET
            account_holder_name=?,
            bank_name=?,
            institution_number=?,
            transit_number=?,
            account_number=?,
            bank_address=?,
            email=?,
            legal_name=?,
            dob=?,
            business_name=?,
            government_id=?,
            preferred_transfer_type=?,
            interac_email=?,
            interac_phone=?
         WHERE vendor_id=?`,
        [
            account_holder_name,
            bank_name,
            institution_number,
            transit_number,
            account_number,
            bank_address,
            email,
            legal_name,
            dob,
            business_name,
            government_id,
            preferred_transfer_type,
            interac_email,
            interac_phone,
            vendor_id,
        ]
    );

    if (result.affectedRows === 0) {
        return res.status(400).json({ message: "No changes were made to the bank account." });
    }

    res.json({ message: "Bank account edited successfully." });
});

const getAllVendorsBankAccounts = asyncHandler(async (req, res) => {
    const [rows] = await db.query(
        `SELECT v.vendor_id,
                b.account_holder_name, b.bank_name, b.institution_number,
                b.transit_number, b.account_number, b.bank_address, b.email,
                b.legal_name, b.dob, b.business_name, b.government_id, b.preferred_transfer_type
         FROM vendors v
          JOIN vendor_bank_accounts b ON v.vendor_id = b.vendor_id`
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "No vendor bank accounts found" });
    }

    res.json(rows);
});

const applyForPayout = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { requested_amount } = req.body;

    if (!requested_amount || requested_amount <= 0) {
        return res.status(400).json({ message: "Invalid payout amount" });
    }

    const connection = await db.getConnection(); // start a dedicated connection
    try {
        await connection.beginTransaction();

        // 1️⃣ Ensure vendor bank exists
        const [bankDetails] = await connection.query(
            `SELECT * FROM vendor_bank_accounts WHERE vendor_id = ? LIMIT 1`,
            [vendor_id]
        );

        if (!bankDetails.length) {
            await connection.rollback();
            return res.status(400).json({
                message: "Please add your bank details before requesting a payout.",
            });
        }

        // 2️⃣ Ensure no active payout request
        const [existingRequest] = await connection.query(
            `SELECT * FROM vendor_payout_requests WHERE vendor_id = ? AND status = '0'`,
            [vendor_id]
        );

        if (existingRequest.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                message: "You already have a payout request in progress.",
            });
        }

        // 3️⃣ Fetch pending payouts (FOR UPDATE locks them safely)
        const [pendingPayouts] = await connection.query(
            `SELECT * FROM vendor_payouts WHERE vendor_id = ? AND payout_status = 'pending' FOR UPDATE`,
            [vendor_id]
        );

        if (!pendingPayouts.length) {
            await connection.rollback();
            return res.status(400).json({
                message: "No pending booking payouts available for request.",
            });
        }

        // 4️⃣ Total available
        const totalAvailable = pendingPayouts.reduce(
            (sum, p) => sum + parseFloat(p.payout_amount),
            0
        );

        if (requested_amount > totalAvailable) {
            await connection.rollback();
            return res.status(400).json({
                message: `Requested amount (${requested_amount}) exceeds available (${totalAvailable.toFixed(2)}).`,
            });
        }

        // 5️⃣ Insert payout request
        const [insertResult] = await connection.query(
            `INSERT INTO vendor_payout_requests (vendor_id, requested_amount)
       VALUES (?, ?)`,
            [vendor_id, requested_amount]
        );

        const payout_request_id = insertResult.insertId;

        // 6️⃣ Update all related payouts in one go
        const payoutIds = pendingPayouts.map(p => p.payout_id);

        await connection.query(
            `UPDATE vendor_payouts
       SET payout_request_id = ?, payout_status = 'hold'
       WHERE payout_id IN (?)`,
            [payout_request_id, payoutIds]
        );

        await connection.commit();

        res.status(200).json({
            message: "✅ Payout request submitted successfully.",
            payout_request_id,
            requested_amount,
            totalAvailable,
        });
    } catch (err) {
        await connection.rollback();
        console.error("❌ Error submitting payout request:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    } finally {
        connection.release();
    }
});

const getVendorPayoutStatus = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(400).json({ message: "Vendor ID is required" });
    }

    try {
        const [rows] = await db.query(
            `SELECT
                payout_request_id,
                vendor_id,
                requested_amount,
                status,
                admin_notes,
                payout_media,
                created_at,
                updated_at
             FROM vendor_payout_requests
             WHERE vendor_id = ?
             ORDER BY created_at DESC`,
            [vendor_id]
        );

        if (rows.length === 0) {
            return res.status(200).json({
                message: "No payout requests found",
                requests: []
            });
        }


        res.status(200).json({
            rows
        });
    } catch (err) {
        console.error("❌ Error fetching payout status:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getAllPayoutRequests = asyncHandler(async (req, res) => {
    const [requests] = await db.query(`
        SELECT r.*,
               COALESCE(idet.name, cdet.companyName) AS vendor_name,
               v.vendorType,
               b.*
        FROM vendor_payout_requests r
        JOIN vendors v ON r.vendor_id = v.vendor_id
        LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
        LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
        LEFT JOIN vendor_bank_accounts b ON r.vendor_id = b.vendor_id
        ORDER BY r.created_at DESC
    `);

    if (requests.length === 0) {
        return res.status(204).json({ message: "No payout requests found" });
    }

    res.status(200).json(requests);
});

const updatePayoutStatus = asyncHandler(async (req, res) => {
    const { payout_ids } = req.body; // array of payout_ids
    const { status, admin_notes } = req.body;

    if (!Array.isArray(payout_ids) || payout_ids.length === 0) {
        return res.status(400).json({ message: "payout_ids must be a non-empty array" });
    }

    if (!status) {
        return res.status(400).json({ message: "status is required" });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // ✅ 1️⃣ Fetch all selected payout records (ensure same vendor)
        const [payoutRecords] = await connection.query(
            `SELECT * FROM vendor_payouts WHERE payout_id IN (?)`,
            [payout_ids]
        );

        if (payoutRecords.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "No matching payouts found" });
        }

        // 🧩 Ensure all payouts belong to the same vendor
        const vendorIds = [...new Set(payoutRecords.map(p => p.vendor_id))];
        if (vendorIds.length > 1) {
            await connection.rollback();
            return res.status(400).json({
                message: "All selected payouts must belong to the same vendor"
            });
        }

        const vendor_id = vendorIds[0];
        const currency = payoutRecords[0].currency;
        const totalPayoutAmount = payoutRecords.reduce(
            (sum, p) => sum + Number(p.payout_amount || 0),
            0
        );

        // ✅ 2️⃣ Create a single vendor_payout_request record (batch log)
        const [insertResult] = await connection.query(
            `INSERT INTO vendor_payout_requests
             (vendor_id, requested_amount, status, admin_notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [vendor_id, totalPayoutAmount, status, admin_notes || null]
        );

        const payout_request_id = insertResult.insertId;

        // ✅ 3️⃣ Update all selected vendor_payouts at once
        await connection.query(
            `UPDATE vendor_payouts
             SET payout_status = ?,
                 payout_request_id = ?,
                 admin_notes = ?,
                 updated_at = NOW()
             WHERE payout_id IN (?)`,
            [status, payout_request_id, admin_notes || null, payout_ids]
        );

        // ✅ 4️⃣ Commit the transaction
        await connection.commit();

        // ✅ 5️⃣ Notify the vendor
        await db.query(
            `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
             VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            [
                'vendors',
                vendor_id,
                'Payout Released 🎉',
                `Your total payout of ${totalPayoutAmount.toFixed(2)} ${currency} covering ${payout_ids.length} bookings has been marked as paid by admin.`
            ]
        );

        // ✅ 6️⃣ Respond with success summary
        res.status(200).json({
            message: `Payouts (${payout_ids.length}) marked as ${status} successfully`
        });

    } catch (err) {
        console.error("❌ Error updating multiple payouts:", err);
        if (connection) await connection.rollback();
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

const getVendorPayoutOverview = asyncHandler(async (req, res) => {
    const { vendor_id, startDate, endDate } = req.query;

    try {
        // 🧭 Dynamic filters
        let filterCondition = "WHERE 1=1";
        const filterParams = [];

        if (vendor_id) {
            filterCondition += " AND vp.vendor_id = ?";
            filterParams.push(vendor_id);
        }

        if (startDate && endDate) {
            filterCondition += " AND DATE(vp.created_at) BETWEEN ? AND ?";
            filterParams.push(startDate, endDate);
        } else if (startDate) {
            filterCondition += " AND DATE(vp.created_at) >= ?";
            filterParams.push(startDate);
        } else if (endDate) {
            filterCondition += " AND DATE(vp.created_at) <= ?";
            filterParams.push(endDate);
        }

        // 🧾 Fetch aggregate payouts by vendor
        const [vendorStats] = await db.query(`
            SELECT
                v.vendor_id,
                id.name AS vendor_name,
                id.email AS vendor_email,
                id.phone AS vendor_phone,
                COALESCE(SUM(vp.payout_amount), 0) AS totalPayout,
                COALESCE(SUM(CASE WHEN vp.payout_status = 'pending' THEN vp.payout_amount ELSE 0 END), 0) AS pendingPayout,
                COALESCE(SUM(CASE WHEN vp.payout_status IN ('paid', 'approved') THEN vp.payout_amount ELSE 0 END), 0) AS paidPayout,
                COUNT(vp.payout_id) AS totalTransactions,
                COUNT(CASE WHEN vp.payout_status = 'pending' THEN 1 END) AS pendingCount
            FROM vendor_payouts vp
            JOIN vendors v ON v.vendor_id = vp.vendor_id
            LEFT JOIN individual_details id ON id.vendor_id = v.vendor_id
            ${filterCondition}
            GROUP BY v.vendor_id
            ORDER BY pendingPayout DESC;
        `, filterParams);

        if (!vendorStats.length) {
            return res.status(200).json({
                message: "No vendor payout data found",
                totalVendors: 0,
                totalPayout: 0,
                totalPending: 0,
                totalPaid: 0,
                totalPendingCount: 0,
                vendorPayouts: []
            });
        }

        // 🧮 Convert string values to numbers safely
        const parsedVendors = vendorStats.map(v => ({
            ...v,
            totalPayout: Number(v.totalPayout) || 0,
            pendingPayout: Number(v.pendingPayout) || 0,
            paidPayout: Number(v.paidPayout) || 0,
            pendingCount: Number(v.pendingCount) || 0
        }));

        // 🧮 Calculate global totals
        const totalPayout = parsedVendors.reduce((sum, v) => sum + v.totalPayout, 0);
        const totalPending = parsedVendors.reduce((sum, v) => sum + v.pendingPayout, 0);
        const totalPaid = parsedVendors.reduce((sum, v) => sum + v.paidPayout, 0);
        const totalPendingCount = parsedVendors.reduce((sum, v) => sum + v.pendingCount, 0);

        // ✅ Final response
        res.status(200).json({
            message: "Vendor payout overview fetched successfully",
            totalVendors: parsedVendors.length,
            totalPayout: parseFloat(totalPayout.toFixed(2)),
            totalPending: parseFloat(totalPending.toFixed(2)),
            totalPaid: parseFloat(totalPaid.toFixed(2)),
            totalPendingCount,
            vendorPayouts: parsedVendors
        });

    } catch (err) {
        console.error("❌ Error fetching vendor payout overview:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});

const getVendorPendingPayouts = asyncHandler(async (req, res) => {
    const { vendor_id, startDate, endDate } = req.query;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    try {
        // 🧭 Dynamic filters
        let filterCondition = "WHERE vp.vendor_id = ? AND vp.payout_status = 'pending'";
        const filterParams = [vendor_id];

        if (startDate && endDate) {
            filterCondition += " AND DATE(vp.created_at) BETWEEN ? AND ?";
            filterParams.push(startDate, endDate);
        } else if (startDate) {
            filterCondition += " AND DATE(vp.created_at) >= ?";
            filterParams.push(startDate);
        } else if (endDate) {
            filterCondition += " AND DATE(vp.created_at) <= ?";
            filterParams.push(endDate);
        }

        // 🧾 Query full payout + booking + package data
        const [rows] = await db.query(`
            SELECT
                vp.payout_id,
                vp.booking_id,
                vp.vendor_id,
                vp.platform_fee_percentage,
                vp.payout_amount,
                vp.currency,
                vp.payout_status,
                vp.created_at,

                id.name AS vendor_name,
                id.email AS vendor_email,
                id.phone AS vendor_phone,

                sb.bookingDate,
                sb.bookingTime,
                CONCAT(u.firstName, ' ', u.lastName) AS user_name,

                sbs.sub_package_id,
                pkg.package_id,
                pkg.packageName,
                pkg.packageMedia,
                spi.itemName AS sub_package_name,
                spi.itemMedia AS sub_package_media,
                spi.description AS sub_package_description

            FROM vendor_payouts vp
            LEFT JOIN service_booking sb ON vp.booking_id = sb.booking_id
            LEFT JOIN users u ON vp.user_id = u.user_id
            LEFT JOIN service_booking_sub_packages sbs ON sbs.booking_id = sb.booking_id
            LEFT JOIN package_items spi ON spi.item_id = sbs.sub_package_id
            LEFT JOIN packages pkg ON pkg.package_id = spi.package_id
            LEFT JOIN individual_details id ON vp.vendor_id = id.vendor_id
            ${filterCondition}
            ORDER BY sb.bookingDate DESC;
        `, filterParams);

        if (!rows.length) {
            return res.status(200).json({
                message: "No pending payouts found for this vendor",
                totalPending: 0,
                count: 0,
                pendingPayouts: []
            });
        }

        // 🧩 Group results by payout → package → subpackage
        const grouped = new Map();

        for (const row of rows) {
            const payoutKey = row.payout_id;
            if (!grouped.has(payoutKey)) {
                grouped.set(payoutKey, {
                    payout_id: row.payout_id,
                    booking_id: row.booking_id,
                    vendor_id: row.vendor_id,
                    vendor_name: row.vendor_name,
                    vendor_email: row.vendor_email,
                    vendor_phone: row.vendor_phone,
                    user_name: row.user_name,
                    payout_amount: Number(row.payout_amount) || 0,
                    currency: row.currency,
                    platform_fee_percentage: row.platform_fee_percentage,
                    bookingDate: row.bookingDate,
                    bookingTime: row.bookingTime,
                    created_at: row.created_at,
                    packages: []
                });
            }

            // Group sub-packages under packages
            const payout = grouped.get(payoutKey);

            if (row.package_id) {
                let pkg = payout.packages.find(p => p.package_id === row.package_id);
                if (!pkg) {
                    pkg = {
                        package_id: row.package_id,
                        packageName: row.packageName,
                        packageMedia: row.packageMedia,
                        sub_packages: []
                    };
                    payout.packages.push(pkg);
                }

                if (row.sub_package_id) {
                    pkg.sub_packages.push({
                        sub_package_id: row.sub_package_id,
                        sub_package_name: row.sub_package_name,
                        sub_package_media: row.sub_package_media,
                        sub_package_description: row.sub_package_description
                    });
                }
            }
        }

        const pendingPayouts = Array.from(grouped.values());

        // 🧮 Total pending amount
        const totalPending = pendingPayouts.reduce(
            (sum, p) => sum + Number(p.payout_amount || 0),
            0
        );

        res.status(200).json({
            message: "Vendor pending payouts fetched successfully",
            vendor_id,
            totalPending: parseFloat(totalPending.toFixed(2)),
            count: pendingPayouts.length,
            pendingPayouts
        });

    } catch (err) {
        console.error("❌ Error fetching vendor pending payouts:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});

const getAdminPaidPayoutHistory = asyncHandler(async (req, res) => {
    const { vendor_id, startDate, endDate, status } = req.query;

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // 🔍 Dynamic filters
        let filterCondition = "WHERE 1=1";
        const filterParams = [];

        if (vendor_id) {
            filterCondition += " AND vp.vendor_id = ?";
            filterParams.push(vendor_id);
        }

        if (status) {
            filterCondition += " AND vpr.status = ?";
            filterParams.push(status);
        } else {
            filterCondition += " AND vpr.status IN ('paid', 'approved')";
        }

        if (startDate && endDate) {
            filterCondition += " AND DATE(vpr.created_at) BETWEEN ? AND ?";
            filterParams.push(startDate, endDate);
        } else if (startDate) {
            filterCondition += " AND DATE(vpr.created_at) >= ?";
            filterParams.push(startDate);
        } else if (endDate) {
            filterCondition += " AND DATE(vpr.created_at) <= ?";
            filterParams.push(endDate);
        }

        // 🧾 Count total
        const [[{ totalRecords }]] = await db.query(`
            SELECT COUNT(*) AS totalRecords
            FROM vendor_payouts vp
            JOIN vendor_payout_requests vpr ON vp.payout_request_id = vpr.payout_request_id
            ${filterCondition}
        `, filterParams);

        // 🧭 Query main data
        const [rows] = await db.query(`
            SELECT
                vpr.payout_request_id,
                vp.payout_id,
                vp.booking_id,
                vp.vendor_id,
                id.name AS vendor_name,
                id.phone AS vendor_phone,
                id.email AS vendor_email,
                vpr.requested_amount,
                vp.payout_amount,
                vp.currency,
                vpr.status,
                vpr.admin_notes,
                vpr.payout_media,
                vpr.created_at,
                vpr.updated_at
            FROM vendor_payouts vp
            JOIN vendor_payout_requests vpr ON vp.payout_request_id = vpr.payout_request_id
            JOIN vendors v ON v.vendor_id = vp.vendor_id
            LEFT JOIN individual_details id ON id.vendor_id = v.vendor_id
            ${filterCondition}
            ORDER BY vpr.created_at DESC
            LIMIT ? OFFSET ?
        `, [...filterParams, limit, offset]);

        if (!rows.length) {
            return res.status(200).json({
                message: "No payout history found",
                totalRecords: 0,
                data: [],
                pagination: { page, limit, totalPages: 0 }
            });
        }

        // 🧩 Format results
        const formatted = rows.map(r => ({
            payout_request_id: r.payout_request_id,
            payout_id: r.payout_id,
            booking_id: r.booking_id,
            vendor_id: r.vendor_id,
            vendor_name: `${r.vendor_first_name || ""} ${r.vendor_last_name || ""}`.trim() || null,
            vendor_phone: r.vendor_phone || null,
            vendor_email: r.vendor_email || null,
            requested_amount: Number(r.requested_amount || 0),
            payout_amount: Number(r.payout_amount || 0),
            currency: r.currency,
            status: r.status,
            admin_notes: r.admin_notes,
            payout_media: r.payout_media,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));

        res.status(200).json({
            message: "Admin payout history fetched successfully",
            totalRecords,
            data: formatted,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalRecords / limit)
            }
        });

    } catch (err) {
        console.error("❌ Error fetching admin payout history:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});



module.exports = {
    registerBankAccount,
    getBankAccount,
    editBankAccount,
    getAllVendorsBankAccounts,
    applyForPayout,
    getAllPayoutRequests,
    updatePayoutStatus,
    getVendorPayoutStatus,
    getVendorPendingPayouts,
    getAdminPaidPayoutHistory,
    getVendorPayoutOverview
};
