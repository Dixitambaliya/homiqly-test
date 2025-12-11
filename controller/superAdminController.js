const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { encryptResponse, decryptRequest } = require("../config/utils/email/encryption");

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
        admin_code: admin.admin_code
    };

    const encrypted = encryptResponse(responseData);

    res.status(200).json(encrypted);
});

const editAdminCode = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;

    // 1️⃣ Extract encrypted payload
    const { iv, payload } = req.body;

    if (!iv || !payload) {
        return res.status(400).json(encryptResponse({
            error: "Encrypted data missing"
        }));
    }

    // 2️⃣ Decrypt request
    let decryptedData;
    try {
        decryptedData = decryptRequest(payload, iv);
    } catch (err) {
        return res.status(400).json(encryptResponse({
            error: "Invalid encrypted data",
            details: err.message
        }));
    }

    let { admin_code } = decryptedData;

    // 3️⃣ Validate new admin code
    if (!admin_code) {
        return res.status(400).json(encryptResponse({
            error: "New code is required"
        }));
    }

    admin_code = String(admin_code).trim();

    if (!/^\d{6}$/.test(admin_code)) {
        return res.status(400).json(encryptResponse({
            error: "code must be exactly 6 digits"
        }));
    }

    // 4️⃣ Hash new code
    const hashedCode = await bcrypt.hash(admin_code, 10);

    // 5️⃣ Update DB
    await db.query(
        "UPDATE admin SET admin_code = ? WHERE admin_id = ?",
        [hashedCode, admin_id]
    );

    // 6️⃣ Return encrypted response
    const encrypted = encryptResponse({
        message: "code updated successfully"
    });

    res.status(200).json(encrypted);
});

module.exports = { setAdminCode, getAdminCode, editAdminCode }