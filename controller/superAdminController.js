const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const { encryptResponse, decryptRequest } = require("../config/utils/email/encryption");

const setAdminCode = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;

    const { iv, payload } = req.body;

    // 🛑 If body missing — only case where plain JSON is acceptable
    if (!iv || !payload) {
        return res.status(400).json(
            encryptResponse({
                error: "data missing"
            })
        );
    }

    let decryptedData;
    try {
        decryptedData = decryptRequest(payload, iv);
    } catch (err) {
        return res.status(400).json(
            encryptResponse({
                error: "Invalid encrypted data"
            })
        );
    }

    let { admin_code } = decryptedData;

    admin_code = String(admin_code).trim();

    if (!/^\d{6}$/.test(admin_code)) {
        return res.status(400).json(
            encryptResponse({
                error: "Admin code must be exactly 6 digits"
            })
        );
    }

    const hashedCode = await bcrypt.hash(admin_code, 10);

    await db.query(
        `UPDATE admin SET admin_code = ? WHERE admin_id = ?`,
        [hashedCode, admin_id]
    );

    return res.status(200).json(
        encryptResponse({
            message: "Admin verification code created successfully"
        })
    );
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