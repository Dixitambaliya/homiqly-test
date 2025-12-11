const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
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

    // Fetch hashed admin code
    const [[admin]] = await db.query(
        "SELECT admin_code FROM admin WHERE admin_id = ?",
        [admin_id]
    );

    if (!admin || !admin.admin_code) {
        return res.status(400).json({ error: "code not set" });
    }

    // Compare input code with hashed code
    const isValid = await bcrypt.compare(admin_code, admin.admin_code);
    
    if (!isValid) {
        return res.status(403).json({ error: "Invalid code" });
    }

    // Pass control to the actual API
    next();
});

module.exports = { verifyAdminCode };