const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const createPromoCode = asyncHandler(async (req, res) => {
    const {
        code,
        discount_value,
        discount_type, // 'percentage' or 'fixed'
        minSpend,
        maxUse,
        start_date,
        end_date,
        description,
        requiredBookings,
        source_type // 'admin' or 'system'
    } = req.body;

    if (!code || !discount_value || !source_type || !discount_type) {
        return res.status(400).json({ message: "code, discount_value, discount_type, and source_type are required" });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
        return res.status(400).json({ message: "discount_type must be 'percentage' or 'fixed'" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        let query = '';
        let params = [];

        if (source_type === 'system') {
            query = `INSERT INTO system_promo_code_templates 
               (code, discountValue, discount_type, minSpend, maxUse, description, source_type)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
            params = [
                code,
                discount_value,
                discount_type,
                minSpend || null,
                maxUse || 1,
                description || null,
                source_type
            ];
        } else if (source_type === 'admin') {
            query = `INSERT INTO promo_codes 
               (code, discountValue, discount_type, minSpend, maxUse, description, requiredBookings, source_type, start_date, end_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [
                code,
                discount_value,
                discount_type,
                minSpend || null,
                maxUse || 1,
                description || null,
                requiredBookings || 0,
                source_type,
                start_date || null,
                end_date || null
            ];
        } else {
            throw new Error("Invalid source_type. Must be 'admin' or 'system'");
        }

        const [result] = await connection.query(query, params);
        const promo_id = result.insertId;

        // Auto-assign admin promos with requiredBookings = 0
        if (source_type === 'admin' && (!requiredBookings || requiredBookings === 0)) {
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
        // 1️⃣ Fetch admin promo codes
        const [adminPromos] = await db.query(
            `SELECT promo_id AS id, code, discountValue, discount_type, minSpend, maxUse, start_date, end_date, description, requiredBookings, source_type
             FROM promo_codes`
        );

        // 2️⃣ Fetch system promo templates
        const [systemPromos] = await db.query(
            `SELECT system_promo_code_template_id AS id, code, discountValue, discount_type, minSpend, maxUse, description, source_type
             FROM system_promo_code_templates`
        );

        if (adminPromos.length === 0 && systemPromos.length === 0) {
            return res.status(200).json({ message: "No promo codes found" });
        }

        // 3️⃣ Combine both arrays
        const allPromos = [...adminPromos, ...systemPromos];

        // 4️⃣ Sort by start_date descending
        allPromos.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        res.json(allPromos);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch promo codes", error: err.message });
    }
});

// ✅ UPDATE
const updatePromoCode = asyncHandler(async (req, res) => {
    const { id } = req.params; // generic id
    const {
        code,
        discount_value,
        discount_type, // 'percentage' or 'fixed'
        minSpend,
        maxUse,
        start_date,
        end_date,
        description,
        requiredBookings,
        source_type // 'admin' or 'system'
    } = req.body;

    if (discount_type && !['percentage', 'fixed'].includes(discount_type)) {
        return res.status(400).json({ message: "discount_type must be 'percentage' or 'fixed'" });
    }

    try {
        // 1️⃣ Determine table and ID column
        let table = '';
        let idColumn = '';
        if (source_type === 'system') {
            table = 'system_promo_code_templates';
            idColumn = 'system_promo_code_template_id';
        } else if (source_type === 'admin') {
            table = 'promo_codes';
            idColumn = 'promo_id';
        } else {
            return res.status(400).json({ message: "Invalid source_type. Must be 'admin' or 'system'" });
        }

        // 2️⃣ Fetch current record
        const [rows] = await db.query(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Promo code not found" });

        const existing = rows[0];

        // 3️⃣ Merge old + new (only update fields provided)
        const updatedData = {
            code: code ?? existing.code,
            discountValue: discount_value ?? existing.discountValue,
            discount_type: discount_type ?? existing.discount_type,
            description: description ?? existing.description,
            minSpend: minSpend ?? existing.minSpend,
            maxUse: maxUse ?? existing.maxUse,
            requiredBookings: requiredBookings ?? existing.requiredBookings,
            start_date: start_date ?? existing.start_date,
            end_date: end_date ?? existing.end_date,
        };

        // 4️⃣ Build dynamic query
        let query = '';
        let params = [];

        if (source_type === 'system') {
            query = `UPDATE ${table}
                     SET code = ?, discountValue = ?, discount_type = ?, minSpend = ?, maxUse = ?, description = ?
                     WHERE ${idColumn} = ?`;
            params = [
                updatedData.code,
                updatedData.discountValue,
                updatedData.discount_type,
                updatedData.minSpend,
                updatedData.maxUse,
                updatedData.description,
                id
            ];
        } else {
            query = `UPDATE ${table}
                     SET code = ?, discountValue = ?, discount_type = ?, minSpend = ?, maxUse = ?, description = ?, requiredBookings = ?, start_date = ?, end_date = ?
                     WHERE ${idColumn} = ?`;
            params = [
                updatedData.code,
                updatedData.discountValue,
                updatedData.discount_type,
                updatedData.minSpend,
                updatedData.maxUse,
                updatedData.description,
                updatedData.requiredBookings,
                updatedData.start_date,
                updatedData.end_date,
                id
            ];
        }

        await db.query(query, params);

        res.json({ message: `Promo code '${updatedData.code}' updated successfully`, updatedData });
    } catch (err) {
        console.error("Update promo code error:", err);
        res.status(500).json({ message: "Failed to update promo code", error: err.message });
    }
});

const deletePromoCode = asyncHandler(async (req, res) => {
    const { id } = req.params; // generic id
    const { source_type } = req.body; // 'admin' or 'system'

    if (!source_type || !['admin', 'system'].includes(source_type)) {
        return res.status(400).json({ message: "source_type is required and must be 'admin' or 'system'" });
    }

    try {
        let table = '';
        let idColumn = '';

        if (source_type === 'admin') {
            table = 'promo_codes';
            idColumn = 'promo_id';
        } else {
            table = 'system_promo_code_templates';
            idColumn = 'system_promo_code_template_id';
        }

        const [result] = await db.query(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Promo code not found" });
        }

        res.json({ message: `Promo code deleted successfully` });
    } catch (err) {
        console.error("Delete promo code error:", err);
        res.status(500).json({ message: "Failed to delete promo code", error: err.message });
    }
});

// Get User Promo Code(s) from both user and system tables
const getUserPromoCodes = asyncHandler(async (req, res) => {
    const { user_id } = req.user;

    if (!user_id) {
        return res.status(400).json({ message: "user_id is required" });
    }

    try {
        // 1️⃣ Fetch user promo codes (assigned/approved by admin)
        const [userPromos] = await db.query(
            `SELECT 
                upc.user_promo_code_id,
                upc.code AS userCode,
                upc.source_type,
                upc.usedCount,
                pc.promo_id,
                pc.code AS promoCode,
                pc.discount_type,
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

        // 2️⃣ Fetch system promo codes (auto-generated)
        const [systemPromos] = await db.query(
            `SELECT 
                spc.system_promo_code_id,
                spc.user_id,
                spc.source_type,
                spct.minSpend,
                spct.code AS userCode,
                spct.discount_type,
                spct.maxUse AS promoMaxUse,
                spc.usage_count AS usedCount,
                spct.discountValue AS userDiscountValue
            FROM system_promo_codes spc
            LEFT JOIN system_promo_code_templates spct ON spc.template_id = spct.system_promo_code_template_id 
            WHERE user_id = ?`,
            [user_id]
        );

        // Normalize user promo codes
        const normalizedUserPromos = userPromos.map(p => ({
            promo_id: p.promo_id,
            user_promo_code_id: p.user_promo_code_id,
            source_type: p.source_type,
            usedCount: p.usedCount,
            promoCode: p.promoCode,
            promoMaxUse: p.promoMaxUse,
            discountType: p.discount_type,
            discountValue: p.discountValue,
            minSpend: p.minSpend,
            description: p.description,
            start_date: p.start_date,
            end_date: p.end_date,
            promoUsed: p.usedCount >= p.promoMaxUse ? 1 : 0  // ✅ new column
        }));

        // Normalize system promo codes
        const normalizedSystemPromos = systemPromos.map(p => ({
            source_type: p.source_type,
            system_promo_code_id: p.system_promo_code_id,
            promoCode: p.userCode,
            promoMaxUse: p.promoMaxUse,
            usedCount: p.usedCount,
            discountType: p.discount_type,
            userDiscountValue: p.userDiscountValue,
            promoUsed: p.usedCount >= p.promoMaxUse ? 1 : 0  // ✅ new column
        }));

        const allPromos = [...normalizedUserPromos, ...normalizedSystemPromos];

        if (allPromos.length === 0) {
            return res.status(200).json({ message: "No promo code available" });
        }

        res.status(200).json({
            message: "Promo codes fetched successfully",
            promoCodes: allPromos
        });

    } catch (err) {
        console.error("Error fetching user promo codes:", err.message);
        res.status(500).json({ message: "Server error", details: err.message });
    }
});


const assignWelcomeCode = async (user_id, user_email) => {
    try {
        // ✅ 1. Check if auto-assign is enabled
        const [setting] = await db.query(
            "SELECT setting_value FROM settings WHERE setting_key = 'AUTO_ASSIGN_WELCOME_CODE'"
        );

        if (!setting[0] || setting[0].setting_value != 1) {
            console.log("Auto-assign welcome code is disabled");
            return null;
        }

        // ✅ 2. Check if user already has a promo assigned
        const [existing] = await db.query(
            "SELECT * FROM system_promo_codes WHERE user_id = ?",
            [user_id]
        );

        if (existing.length > 0) {
            console.log("User already has a promo code assigned");
            return null;
        }

        // ✅ 3. Get the active welcome promo template
        const [templates] = await db.query(
            "SELECT * FROM system_promo_code_templates WHERE is_active = 1 AND source_type = 'system' LIMIT 1"
        );

        if (!templates || templates.length === 0) {
            console.log("⚠️ No active promo template found");
            return null;
        }

        const template = templates[0];
        const { system_promo_code_template_id, code, discountValue, maxUse } = template;

        console.log("Assigning template:", { user_id, system_promo_code_template_id, code });

        // ✅ 4. Assign promo to user (link to template)
        await db.query(
            `INSERT INTO system_promo_codes (user_id, template_id, usage_count)
             VALUES (?, ?, 0)`,
            [user_id, system_promo_code_template_id]
        );

        console.log(`✅ Promo template ${code} (ID: ${system_promo_code_template_id}) assigned to user ${user_id}`);

        // ✅ 5. Send email to user (errors do NOT affect assignment)
        if (user_email) {
            try {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user_email,
                    subject: "Welcome! Your Promo Code Inside 🎉",
                    html: `
                        <p>Hello,</p>
                        <p>Welcome to our platform! 🎉</p>
                        <p>Your welcome promo code is: <b>${code}</b></p>
                        <p>Discount: ${discountValue}% | Max Use: ${maxUse}</p>
                        <p>Use it on your next booking!</p>
                        <br/>
                        <p>Thanks,<br/>The Team</p>
                    `,
                };

                transport.sendMail(mailOptions, (err, info) => {
                    if (err) console.error("❌ Error sending promo email:", err.message);
                    else console.log(`✅ Welcome promo email sent to ${user_email}: ${info.response}`);
                });
            } catch (emailErr) {
                console.error("❌ Unexpected email error:", emailErr.message);
            }
        }

        return code;

    } catch (err) {
        console.error("❌ Error assigning welcome promo code:", err.message);
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

        res.status(200).json({ enable: rows[0].setting_value }); // directly return 0 or 1
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
