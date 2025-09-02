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
        currency = "CAD",
    } = req.body;

    if (
        !account_holder_name ||
        !bank_name ||
        !institution_number ||
        !transit_number ||
        !account_number
    ) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Check if vendor already has a bank account
    const [rows] = await db.query(
        "SELECT id FROM vendor_bank_accounts WHERE vendor_id = ?",
        [vendor_id]
    );

    if (rows.length > 0) {
        // Update
        await db.query(
            `UPDATE vendor_bank_accounts 
       SET account_holder_name=?, bank_name=?, institution_number=?, transit_number=?, account_number=?, currency=? 
       WHERE vendor_id=?`,
            [
                account_holder_name,
                bank_name,
                institution_number,
                transit_number,
                account_number,
                currency,
                vendor_id,
            ]
        );
        res.json({ message: "Bank account updated successfully" });
    } else {
        // Insert
        await db.query(
            `INSERT INTO vendor_bank_accounts 
       (vendor_id, account_holder_name, bank_name, institution_number, transit_number, account_number, currency) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                vendor_id,
                account_holder_name,
                bank_name,
                institution_number,
                transit_number,
                account_number,
                currency,
            ]
        );
        res.json({ message: "Bank account saved successfully" });
    }
});

const getBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user

    const [rows] = await db.query(
        "SELECT account_holder_name, bank_name, institution_number, transit_number, account_number, currency FROM vendor_bank_accounts WHERE vendor_id = ?",
        [vendor_id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "No bank account found" });
    }

    res.json(rows[0]);
});

module.exports = { registerBankAccount, getBankAccount };