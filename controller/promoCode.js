const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");


const createPromoCode = asyncHandler(async (req, res) => {
    const { code, discount_value, minSpend, maxUse, start_date, end_date, description } = req.body;

    if (!code || !discount_value) {
        return res.status(400).json({ message: "code, and discount_value are required" });
    }

    try {
        await db.query(
            `INSERT INTO promo_codes (code, discountValue, minSpend, maxUse, start_date, end_date, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                code,
                discount_value,
                minSpend || null,
                maxUse || 1,
                start_date || new Date(),
                end_date || null,
                description || null
            ]
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
    const { code, discount_value, description, minSpend, maxUse, start_date, end_date } = req.body;

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
            description: description ?? existing.description,
            minSpend: minSpend ?? existing.minSpend,
            maxUse: maxUse ?? existing.maxUse,
            start_date: start_date ?? existing.start_date,
            end_date: end_date ?? existing.end_date,
        };

        // 3️⃣ Update with merged data
        const [result] = await db.query(
            `UPDATE promo_codes
             SET code = ?, discountValue = ?, description = ?, minSpend = ?, maxUse = ?, start_date = ?, end_date = ?
             WHERE promo_id = ?`,
            [
                updatedData.code,
                updatedData.discountValue,
                updatedData.description,
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

const getUserPromoUsage = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id; // from auth

    try {
        // 1️⃣ Fetch all promo codes
        const [promos] = await db.query(`
      SELECT promo_id, code, maxUse, discountValue, minSpend, start_date, end_date
      FROM promo_codes
      ORDER BY start_date DESC
    `);

        if (!promos.length) {
            return res.status(404).json({ message: "No promo codes found" });
        }

        // 2️⃣ Get all usage for this user
        const [usages] = await db.query(
            `SELECT promo_id, usage_count
       FROM user_promo_usage
       WHERE user_id = ?`,
            [user_id]
        );

        // Map usage counts by promo_id for quick lookup
        const usageMap = {};
        usages.forEach(u => {
            usageMap[u.promo_id] = u.usage_count;
        });

        // 3️⃣ Attach usage info to each promo
        const result = promos.map(promo => {
            const used = usageMap[promo.promo_id] || 0;
            const remaining = Math.max(promo.maxUse - used, 0); // subtract used from maxUse

            return {
                ...promo,
                used,        // how many times the user already used it
                remaining    // how many uses are left
            };
        });

        res.status(200).json({
            message: "Promo codes with usage fetched successfully",
            promos: result
        });

    } catch (err) {
        console.error("Get user promo usage error:", err);
        res.status(500).json({ message: "Failed to fetch promo usage", error: err.message });
    }
});





module.exports = {
    createPromoCode,
    getAllPromoCodes,
    updatePromoCode,
    deletePromoCode,
    getUserPromoUsage
}
