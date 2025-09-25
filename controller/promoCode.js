const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");


const createPromoCode = asyncHandler(async (req, res) => {
    const { code, discount_value, minSpend, maxUse, start_date, end_date } = req.body;

    if (!code || !discount_value) {
        return res.status(400).json({ message: "code, and discount_value are required" });
    }

    try {
        await db.query(
            `INSERT INTO promo_codes (code, discountValue, minSpend, maxUse, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [code, discount_value, minSpend || null, maxUse || 1, start_date || new Date(), end_date || null]
        );

        res.status(201).json({ message: `Promo code '${code}' created successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create promo code", error: err.message });
    }
});

// ✅ READ ALL
const getAllPromoCodes = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM promo_codes ORDER BY start_date DESC`);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch promo codes", error: err.message });
    }
});

// ✅ UPDATE
const updatePromoCode = asyncHandler(async (req, res) => {
    const { promo_id } = req.params;
    const { code, discount_value, minSpend, maxUse, start_date, end_date } = req.body;

    try {
        // 1️⃣ Fetch current record
        const [rows] = await db.query(`SELECT * FROM promo_codes WHERE promo_id = ?`, [promo_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Promo code not found" });
        }

        const existing = rows[0];

        // 2️⃣ Merge old + new (keep old if new not provided)
        const updatedData = {
            code: code ?? existing.code,
            discountValue: discount_value ?? existing.discountValue,
            minSpend: minSpend ?? existing.minSpend,
            maxUse: maxUse ?? existing.maxUse,
            start_date: start_date ?? existing.start_date,
            end_date: end_date ?? existing.end_date,
        };

        // 3️⃣ Update with merged data
        const [result] = await db.query(
            `UPDATE promo_codes 
             SET code = ?, discountValue = ?, minSpend = ?, maxUse = ?, start_date = ?, end_date = ?
             WHERE promo_id = ?`,
            [
                updatedData.code,
                updatedData.discountValue,
                updatedData.minSpend,
                updatedData.maxUse,
                updatedData.start_date,
                updatedData.end_date,
                promo_id,
            ]
        );

        res.json({ message: `Promo code '${updatedData.code}' updated successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update promo code", error: err.message });
    }
});


const deletePromoCode = asyncHandler(async (req, res) => {
    const { promo_id } = req.params;

    try {
        const [result] = await db.query(`DELETE FROM promo_codes WHERE promo_id = ?`, [promo_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Promo code not found" });
        }

        res.json({ message: `Promo code deleted successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete promo code", error: err.message });
    }
});

module.exports = { createPromoCode, getAllPromoCodes, updatePromoCode, deletePromoCode }