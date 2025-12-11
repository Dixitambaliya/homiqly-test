const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { encryptResponse, decryptRequest } = require("../config/utils/email/encryption");

const setAdminCode = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;

    // 🔐 1️⃣ Decrypt incoming payload
    const { iv, payload } = req.body;

    if (!iv || !payload) {
        return res.status(400).json({
            error: "data missing"
        });
    }

    let decryptedData;
    try {
        decryptedData = decryptRequest(payload, iv);
    } catch (err) {
        return res.status(400).json({
            error: "Invalid encrypted data",
            details: err.message
        });
    }

    let { admin_code } = decryptedData;

    // 2️⃣ Convert ANY input to string safely
    admin_code = String(admin_code).trim();

    // 3️⃣ Validate: exactly 6 digits
    if (!/^\d{6}$/.test(admin_code)) {
        return res.status(400).json(
            encryptResponse({
                error: "Admin code must be exactly 6 digits"
            })
        );
    }

    // 4️⃣ Hash and store
    const hashedCode = await bcrypt.hash(admin_code, 10);

    await db.query(
        `UPDATE admin SET admin_code = ? WHERE admin_id = ?`,
        [hashedCode, admin_id]
    );

    // 5️⃣ Encrypted response
    const encrypted = encryptResponse({
        message: "Admin verification code created successfully"
    });

    res.status(200).json(encrypted);
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

module.exports = { setAdminCode, getAdminCode };