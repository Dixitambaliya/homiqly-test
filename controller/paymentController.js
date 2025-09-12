const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")

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



module.exports = { registerBankAccount, getBankAccount, editBankAccount, getAllVendorsBankAccounts };