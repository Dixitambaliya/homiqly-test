const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");


const createPromoCode = asyncHandler(async (req, res) => {
    const {
        code,
        discount_value,
        minSpend,
        maxUse,
        start_date,
        end_date,
        description,
        requiredBookings // 👈 new field (number of successful bookings required)
    } = req.body;

    if (!code || !discount_value) {
        return res.status(400).json({ message: "code and discount_value are required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1️⃣ Insert promo into promo_codes
        const [result] = await connection.query(
            `INSERT INTO promo_codes 
             (code, discountValue, minSpend, maxUse, start_date, end_date, description, requiredBookings)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                code,
                discount_value,
                minSpend || null,
                maxUse || 1,
                start_date || new Date(),
                end_date || null,
                description || null,
                requiredBookings || 0
            ]
        );

        const promo_id = result.insertId;

        // 2️⃣ If requiredBookings = 0 → assign to all users immediately
        if (!requiredBookings || requiredBookings === 0) {
            const [users] = await connection.query(`SELECT user_id FROM users`);
            for (const user of users) {
                await connection.query(
                    `INSERT IGNORE INTO user_promo_codes (user_id, promo_id) VALUES (?, ?)`,
                    [user.user_id, promo_id]
                );
            }
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            message: `Promo code '${code}' created successfully`,
            promo_id
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Create promo code error:", err);
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

// Get User Promo Code(s)
const getUserPromoCodes = asyncHandler(async (req, res) => {
    const { user_id } = req.user;

    if (!user_id) {
        return res.status(400).json({ message: "user_id is required" });
    }

    try {
        // Fetch user promo codes with admin details if available
        const [promoCodes] = await db.query(
            `SELECT 
                upc.user_promo_code_id,
                upc.assigned_at,
                upc.maxUse AS userMaxUse,
                upc.code AS userCode,
                upc.source_type,
                pc.promo_id,
                pc.code AS promoCode,
                pc.discountValue,
                pc.minSpend,
                pc.description,
                pc.maxUse AS promoMaxUse,
                pc.start_date,
                pc.end_date
            FROM user_promo_codes upc
            LEFT JOIN promo_codes pc 
                ON upc.promo_id = pc.promo_id
            WHERE upc.user_id = ?`,
            [user_id]
        );

        if (promoCodes.length === 0) {
            return res.status(404).json({ message: "No promo codes assigned to this user" });
        }

        // Hide fields for system-generated codes
        const result = promoCodes.map(p => {
            if (p.source_type === 'system') {
                return {
                    user_promo_code_id: p.user_promo_code_id,
                    assigned_at: p.assigned_at,
                    userMaxUse: p.userMaxUse,
                    userCode: p.userCode,
                    source_type: p.source_type,
                    promoMaxUse: p.userMaxUse
                };
            } else {
                return {
                    user_promo_code_id: p.user_promo_code_id,
                    assigned_at: p.assigned_at,
                    userMaxUse: p.userMaxUse,
                    userCode: p.userCode,
                    source_type: p.source_type,
                    promo_id: p.promo_id,
                    promoCode: p.promoCode,
                    discountValue: p.discountValue,
                    minSpend: p.minSpend,
                    description: p.description,
                    promoMaxUse: p.promoMaxUse,
                    start_date: p.start_date,
                    end_date: p.end_date
                };
            }
        });

        res.status(200).json({
            message: "Promo codes fetched successfully",
            promoCodes: result
        });

    } catch (err) {
        console.error("Error fetching user promo codes:", err.message);
        res.status(500).json({ message: "Server error", details: err.message });
    }
});

const assignWelcomeCode = async (user_id) => {
    try {
        // Check if auto-assign is enabled
        const [setting] = await db.query(
            "SELECT setting_value FROM settings WHERE setting_key = 'AUTO_ASSIGN_WELCOME_CODE'"
        );

        if (!setting[0] || setting[0].setting_value !== 1) {
            console.error("Auto-assign welcome code is disabled");
            return null;
        }

        // Check if user already has a system promo code
        const [existing] = await db.query(
            "SELECT * FROM user_promo_codes WHERE user_id = ? AND source_type = 'system'",
            [user_id]
        );
        if (existing.length > 0) {
            console.log("User already has a system promo code assigned");
            return null;
        }

        // Generate random 5-character uppercase code
        const generateRandomCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 5; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        const code = generateRandomCode();
        const defaultMaxUse = 1;

        // Assign code to user (no promo_id needed for system code)
        await db.query(
            `INSERT INTO user_promo_codes (user_id, code, assigned_at, maxUse, source_type)
             VALUES (?, ?, NOW(), ?, 'system')`,
            [user_id, code, defaultMaxUse]
        );

        console.log(`Promo code ${code} (maxUse=${defaultMaxUse}) assigned to user ${user_id}`);
        return code;

    } catch (err) {
        console.error("Error assigning welcome promo code:", err.message);
        return null;
    }
};

// Toggle Auto-Assign Welcome Code
const toggleAutoAssignWelcomeCode = asyncHandler(async (req, res) => {
    const { enable } = req.body; // expect true/false or 1/0

    if (enable === undefined) {
        return res.status(400).json({ message: "Please provide 'enable' (true/false)" });
    }

    try {
        // Convert boolean to '1' or '0'
        const value = enable ? '1' : '0';

        // Check if the setting already exists
        const [existing] = await db.query(
            "SELECT * FROM settings WHERE setting_key = 'AUTO_ASSIGN_WELCOME_CODE'"
        );

        if (existing.length > 0) {
            // Update existing setting
            await db.query(
                "UPDATE settings SET setting_value = ? WHERE setting_key = 'AUTO_ASSIGN_WELCOME_CODE'",
                [value]
            );
        } else {
            // Insert if not exists
            await db.query(
                "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)",
                ['AUTO_ASSIGN_WELCOME_CODE', value]
            );
        }

        res.status(200).json({
            message: `Auto-assign welcome code has been ${enable ? 'enabled' : 'disabled'}`
        });

    } catch (err) {
        console.error("Error toggling auto-assign welcome code:", err.message);
        res.status(500).json({ message: "Server error", details: err.message });
    }
});

const getAutoAssignWelcomeCodeStatus = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT setting_value FROM settings WHERE setting_key = 'AUTO_ASSIGN_WELCOME_CODE'"
        );

        res.status(200).json({enable: rows[0].setting_value}); // directly return 0 or 1
    } catch (err) {
        console.error("Error fetching auto-assign welcome code status:", err.message);
        res.status(500).json({ message: "Server error", details: err.message });
    }
});


module.exports = {
    createPromoCode,
    getAllPromoCodes,
    updatePromoCode,
    deletePromoCode,
    getUserPromoCodes,
    assignWelcomeCode,
    toggleAutoAssignWelcomeCode,
    getAutoAssignWelcomeCodeStatus
}
