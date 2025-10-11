const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
const vendorGetQueries = require("../config/vendorQueries/vendorGetQueries");


const registerBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const {
        account_holder_name,
        bank_name,
        institution_number,
        transit_number,
        account_number,
        bank_address = null,
        email = null,
        legal_name = null,
        dob = null, // if individual
        business_name = null, // if business
        government_id = null, // optional KYC ID
        preferred_transfer_type = 'bank_transfer',
    } = req.body;

    // Validate required fields
    if (
        !account_holder_name ||
        !bank_name ||
        !institution_number ||
        !transit_number ||
        !account_number ||
        !preferred_transfer_type
    ) {
        return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if vendor already has a bank account
    const [rows] = await db.query(
        "SELECT id FROM vendor_bank_accounts WHERE vendor_id = ?",
        [vendor_id]
    );

    if (rows.length > 0) {
        // Update existing account
        await db.query(
            `UPDATE vendor_bank_accounts 
             SET account_holder_name=?, bank_name=?, institution_number=?, transit_number=?, account_number=?, bank_address=?, email=?, legal_name=?, dob=?, business_name=?, government_id=? , preferred_transfer_type=?
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
                vendor_id,

            ]
        );
        res.json({ message: "Bank account updated successfully" });
    } else {
        // Insert new account
        await db.query(
            `INSERT INTO vendor_bank_accounts 
             (vendor_id, account_holder_name, bank_name, institution_number, transit_number, account_number, bank_address, email, legal_name, dob, business_name, government_id ,preferred_transfer_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                preferred_transfer_type
            ]
        );
        res.json({ message: "Bank account saved successfully" });
    }
});

// ----------------------------
// Get bank account details
// ----------------------------
const getBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    const [rows] = await db.query(
        `SELECT account_holder_name, bank_name, institution_number, transit_number, account_number, bank_address, email, legal_name, dob, business_name, government_id,preferred_transfer_type 
         FROM vendor_bank_accounts 
         WHERE vendor_id = ?`,
        [vendor_id]
    );

    if (rows.length === 0) {
        return res.status(400).json({ message: "No bank account found" });
    }

    res.json(rows[0]);
});

// ----------------------------
// Edit Bank Account (PATCH)
// ----------------------------
const editBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const {
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
        preferred_transfer_type
    } = req.body;

    // Get existing data
    const [rows] = await db.query(
        "SELECT * FROM vendor_bank_accounts WHERE vendor_id = ?",
        [vendor_id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Bank account not found" });
    }

    const existing = rows[0];

    // Preserve old data if new data is not provided
    const updatedData = {
        account_holder_name: account_holder_name ?? existing.account_holder_name,
        bank_name: bank_name ?? existing.bank_name,
        institution_number: institution_number ?? existing.institution_number,
        transit_number: transit_number ?? existing.transit_number,
        account_number: account_number ?? existing.account_number,
        bank_address: bank_address ?? existing.bank_address,
        email: email ?? existing.email,
        legal_name: legal_name ?? existing.legal_name,
        dob: dob ?? existing.dob,
        business_name: business_name ?? existing.business_name,
        government_id: government_id ?? existing.government_id,
        preferred_transfer_type: preferred_transfer_type ?? existing.preferred_transfer_type,

    };

    await db.query(
        `UPDATE vendor_bank_accounts
         SET account_holder_name=?, bank_name=?, institution_number=?, transit_number=?, account_number=?, bank_address=?, email=?, legal_name=?, dob=?, business_name=?, government_id=? , preferred_transfer_type=?
         WHERE vendor_id=?`,
        [
            updatedData.account_holder_name,
            updatedData.bank_name,
            updatedData.institution_number,
            updatedData.transit_number,
            updatedData.account_number,
            updatedData.bank_address,
            updatedData.email,
            updatedData.legal_name,
            updatedData.dob,
            updatedData.business_name,
            updatedData.government_id,
            updatedData.preferred_transfer_type,
            vendor_id,
        ]
    );

    res.json({ message: "Bank account edited successfully" });
});

// ----------------------------
// Edit Bank Account (PATCH)
// ----------------------------
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

    try {
        // 1️⃣ Check for existing payout requests in progress
        const [existingRequest] = await db.query(
            `SELECT * FROM vendor_payout_requests 
             WHERE vendor_id = ? AND status IN ('0')`,
            [vendor_id]
        );

        if (existingRequest.length > 0) {
            return res.status(400).json({
                message: "You already have a payout request in progress"
            });
        }

        // 2️⃣ Fetch all pending booking payouts
        const [pendingPayouts] = await db.query(
            `SELECT * 
             FROM vendor_payouts 
             WHERE vendor_id = ? AND payout_status = 'pending'`,
            [vendor_id]
        );

        if (!pendingPayouts.length) {
            return res.status(400).json({
                message: "No pending booking payouts available for request"
            });
        }

        // 3️⃣ Calculate total available payout
        const totalAvailable = pendingPayouts.reduce(
            (sum, row) => sum + parseFloat(row.payout_amount),
            0
        );

        if (requested_amount > totalAvailable) {
            return res.status(400).json({
                message: `Requested amount (${requested_amount}) exceeds your available balance (${totalAvailable.toFixed(2)})`
            });
        }

        // 4️⃣ Lock only the pending payouts
        const payoutIds = pendingPayouts.map(p => p.payout_id);
        await db.query(
            `UPDATE vendor_payouts
             SET payout_status = 'hold'
             WHERE payout_id IN (?)`,
            [payoutIds]
        );

        // 5️⃣ Insert new payout request
        const [insertResult] = await db.query(
            `INSERT INTO vendor_payout_requests (vendor_id, requested_amount)
             VALUES (?, ?)`,
            [vendor_id, requested_amount]
        );

        const payout_request_id = insertResult.insertId;

        // 6️⃣ Link all held payouts to this request
        await db.query(
            `UPDATE vendor_payouts
             SET payout_id = ?, payout_status = 'hold'
             WHERE payout_id IN (?)`,
            [payout_request_id, payoutIds]
        );

        res.status(200).json({
            message: "Payout request submitted successfully and pending admin approval",
            requested_amount,
            totalAvailable,
            payout_request_id
        });

    } catch (err) {
        console.error("❌ Error submitting payout request:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
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
        return res.status(404).json({ message: "No payout requests found" });
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