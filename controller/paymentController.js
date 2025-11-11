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
    const { payout_id } = req.params; // direct payout reference
    const { status, admin_notes } = req.body;
    const payoutMedia = req.uploadedFiles?.payoutMedia?.[0]?.url || null;

    if (!payout_id || !status) {
        return res.status(400).json({ message: "payout_id and status are required" });
    }

    const connection = await db.getConnection(); // transaction-safe

    try {
        await connection.beginTransaction();

        // ✅ 1. Fetch the payout record with vendor details
        const [[existingPayout]] = await connection.query(
            `SELECT vp.*
             FROM vendor_payouts vp
             WHERE vp.payout_id = ? LIMIT 1`,
            [payout_id]
        );

        if (!existingPayout) {
            await connection.rollback();
            return res.status(404).json({ message: "Payout record not found" });
        }

        const { vendor_id, payout_amount, currency } = existingPayout;

        // ✅ 2. Insert a new record in vendor_payout_requests (admin’s transaction log)
        const [insertResult] = await connection.query(
            `INSERT INTO vendor_payout_requests
             (vendor_id, requested_amount, status, admin_notes, payout_media, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [vendor_id, payout_amount, status, admin_notes || null, payoutMedia]
        );

        const payout_request_id = insertResult.insertId;

        // ✅ 3. Update vendor_payouts to mark as paid and link the payout_request_id
        await connection.query(
            `UPDATE vendor_payouts
             SET payout_status = ?,
                 payout_request_id = ?,
                 admin_notes = ?,
                 payout_media = ?,
                 updated_at = NOW()
             WHERE payout_id = ?`,
            [status, payout_request_id, admin_notes || null, payoutMedia, payout_id]
        );

        // ✅ 4. Commit transaction
        await connection.commit();

        // ✅ 5. Notify vendor
        await db.query(
            `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
             VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            [
                'vendors',
                vendor_id,
                'Payout Released 🎉',
                `Your payout of ${payout_amount} ${currency} has been marked as paid by admin.`,
            ]
        );

        // ✅ 6. Respond
        res.status(200).json({
            message: `Payout marked as ${status} successfully`,
            payout_id,
            payout_request_id,
            vendor: {
                vendor_id
            },
            amount: payout_amount,
            currency,
            payout_media: payoutMedia,
            admin_notes,
            paid_at: new Date()
        });

    } catch (err) {
        console.error("❌ Error updating payout status:", err);
        if (connection) await connection.rollback();
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    } finally {
        if (connection) connection.release();
    }
});



const getAdminPayoutHistory = asyncHandler(async (req, res) => {
    const { vendor_id, startDate, endDate, payout_status } = req.query;

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // 🧭 Dynamic filters
        let filterCondition = "WHERE 1=1";
        const filterParams = [];

        if (vendor_id) {
            filterCondition += " AND vp.vendor_id = ?";
            filterParams.push(vendor_id);
        }

        if (startDate && endDate) {
            filterCondition += " AND DATE(sb.bookingDate) BETWEEN ? AND ?";
            filterParams.push(startDate, endDate);
        } else if (startDate) {
            filterCondition += " AND DATE(sb.bookingDate) >= ?";
            filterParams.push(startDate);
        } else if (endDate) {
            filterCondition += " AND DATE(sb.bookingDate) <= ?";
            filterParams.push(endDate);
        }

        if (payout_status) {
            filterCondition += " AND vp.payout_status = ?";
            filterParams.push(payout_status);
        }

        // 🔢 Count total records
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM vendor_payouts vp ${filterCondition}`,
            filterParams
        );

        // 🧾 Fetch payout data
        const finalQuery = `
            ${vendorGetQueries.getAdminPayoutHistory.replace(
            "WHERE vp.vendor_id = ?",
            filterCondition
        )}
        `;

        const [rows] = await db.query(finalQuery, [...filterParams, limit, offset]);

        if (!rows.length) {
            return res.status(200).json({
                totalRecords: 0,
                totalPayout: 0,
                pendingPayout: 0,
                paidPayout: 0,
                allPayouts: [],
                pagination: {
                    page,
                    limit,
                    totalPages: 0,
                },
            });
        }

        // ✅ Group by vendor + booking
        const grouped = new Map();

        for (const row of rows) {
            const key = `${row.vendor_id}_${row.booking_id}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    payout_id: row.payout_id,
                    booking_id: row.booking_id,
                    vendor_id: row.vendor_id,
                    vendor_name: row.vendor_name,
                    vendor_email: row.vendor_email,
                    vendor_phone: row.vendor_phone,
                    user_id: row.user_id,
                    user_name: row.user_name,
                    user_email: row.user_email,
                    user_phone: row.user_phone,
                    platform_fee_percentage: parseFloat(row.platform_fee_percentage || 0),
                    payout_amount: parseFloat(row.payout_amount || 0),
                    currency: row.currency,
                    payout_status: String(row.payout_status || "").toLowerCase(),
                    created_at: row.created_at,
                    bookingDate: row.bookingDate,
                    bookingTime: row.bookingTime,
                    admin_notes: row.admin_notes || null,
                    payout_media: row.payout_media || null,
                    packages: []
                });
            }

            if (row.package_id && row.sub_package_id) {
                const payout = grouped.get(key);
                const pkgIndex = payout.packages.findIndex(p => p.package_id === row.package_id);
                if (pkgIndex === -1) {
                    payout.packages.push({
                        package_id: row.package_id,
                        packageName: row.packageName,
                        packageMedia: row.packageMedia,
                        sub_packages: [{
                            sub_package_id: row.sub_package_id,
                            sub_package_name: row.sub_package_name,
                            sub_package_media: row.sub_package_media,
                            sub_package_description: row.sub_package_description
                        }]
                    });
                } else {
                    payout.packages[pkgIndex].sub_packages.push({
                        sub_package_id: row.sub_package_id,
                        sub_package_name: row.sub_package_name,
                        sub_package_media: row.sub_package_media,
                        sub_package_description: row.sub_package_description
                    });
                }
            }
        }

        const allPayouts = Array.from(grouped.values());

        // 💰 Totals (directly from DB values)
        const totalPayout = parseFloat(
            allPayouts.reduce((sum, p) => sum + p.payout_amount, 0).toFixed(2)
        );

        const pendingPayout = parseFloat(
            allPayouts
                .filter(p => ["pending", "0"].includes(String(p.payout_status)))
                .reduce((sum, p) => sum + p.payout_amount, 0)
                .toFixed(2)
        );

        const paidPayout = parseFloat(
            allPayouts
                .filter(p => ["paid", "approved"].includes(String(p.payout_status)))
                .reduce((sum, p) => sum + p.payout_amount, 0)
                .toFixed(2)
        );

        // ✅ Pagination slice
        const paginatedPayouts = allPayouts.slice(offset, offset + limit);

        res.status(200).json({
            totalRecords: allPayouts.length,
            totalPayout,
            pendingPayout,
            paidPayout,
            allPayouts: paginatedPayouts,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (err) {
        console.error("❌ Error fetching admin payout history:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message,
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
    getAdminPayoutHistory,
    getAdminPaidPayoutHistory
};
