const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const verifyAdminCode = asyncHandler(async (req, res, next) => {
    const admin_id = req.user?.admin_id;
    let { admin_code } = req.body;

    // Check admin identity
    if (!admin_id) {
        return res.status(403).json({ error: "Not Authorized" });
    }

    // Ensure admin_code provided
    if (!admin_code) {
        return res.status(400).json({ error: "verification code is required" });
    }

    // Convert to string and trim
    admin_code = String(admin_code).trim();

    // Ensure 6 digits
    if (!/^\d{6}$/.test(admin_code)) {
        return res.status(400).json({ error: "code must be specified length" });
    }

    // Fetch raw admin code from DB
    const [[admin]] = await db.query(
        "SELECT admin_code FROM admin WHERE admin_id = ?",
        [admin_id]
    );

    if (!admin || admin.admin_code == null) {
        return res.status(400).json({ error: "code not set" });
    }

    // Convert DB value to string to avoid type mismatch
    const storedCode = String(admin.admin_code).trim();

    // Plain comparison (NO bcrypt)
    if (admin_code !== storedCode) {
        return res.status(403).json({ error: "Invalid code" });
    }

    // Pass control to the actual API
    next();
});

module.exports = { verifyAdminCode };
