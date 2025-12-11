const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { encryptResponse } = require("../config/utils/email/encryption");

const setAdminCode = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;
    let { admin_code } = req.body;

    // 1️⃣ Convert ANY input to string safely
    admin_code = String(admin_code).trim();

    // 2️⃣ Validate 6 digits ONLY
    if (!/^\d{6}$/.test(admin_code)) {
        return res.status(400).json({ error: "code must be exactly 6 digits" });
    }

    // 3️⃣ Hash and store
    const hashedCode = await bcrypt.hash(admin_code, 10);

    await db.query(
        `UPDATE admin SET admin_code = ? WHERE admin_id = ?`,
        [hashedCode, admin_id]
    );

    res.status(200).json({
        message: "verification code created successfully"
    });
});

const getAdminCode = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;

    // Fetch hashed admin code
    const [[admin]] = await db.query(
        "SELECT admin_code FROM admin WHERE admin_id = ?",
        [admin_id]
    );

    if (!admin) {
        return res.status(404).json(encryptResponse({
            error: "Admin not found"
        }));
    }

    // Do NOT return the hashed code for security
    const responseData = {
        hasCode: admin.admin_code ? true : false
    };

    const encrypted = encryptResponse(responseData);

    res.status(200).json(encrypted);
});

module.exports = { setAdminCode, getAdminCode }