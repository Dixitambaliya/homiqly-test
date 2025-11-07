const asyncHandler = require("express-async-handler");
const { db } = require("../config/db")

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
    const { payout_request_id } = req.params;
    const { status, admin_notes } = req.body;

    const payoutMedia = req.uploadedFiles?.payoutMedia?.[0]?.url || null;

    if (!payout_request_id || !status) {
        return res.status(400).json({ message: "payout_request_id and status required" });
    }

    try {
        // 1️⃣ Update the payout request status
        await db.query(
            `UPDATE vendor_payout_requests
             SET status = ?, admin_notes = ?, payout_media = ?
             WHERE payout_request_id = ?`,
            [status, admin_notes, payoutMedia, payout_request_id]
        );

        // 2️⃣ If admin approves, mark corresponding vendor_payouts as paid
        if (status === '1' || status === 'paid') {
            // Get all locked payouts associated with this request
            const [lockedPayouts] = await db.query(
                `SELECT
                 vp.payout_id
                 FROM vendor_payouts vp
                 JOIN vendor_payout_requests vpr ON vpr.vendor_id = vp.vendor_id
                 WHERE vp.payout_status = 'hold' AND vpr.payout_request_id = ?`,
                [payout_request_id]
            );

            if (lockedPayouts.length > 0) {
                const payoutIds = lockedPayouts.map(p => p.payout_id);
                await db.query(
                    `UPDATE vendor_payouts
                     SET payout_status = 'paid'
                     WHERE payout_id IN (?)`,
                    [payoutIds]
                );
            }
        }

        res.status(200).json({ message: `Payout request marked as ${status}` });

    } catch (err) {
        console.error("❌ Error updating payout status:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
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
    getVendorPayoutStatus
};
