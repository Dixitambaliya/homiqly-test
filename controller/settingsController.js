const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const getPlatformSettings = asyncHandler(async (req, res) => {
    const [settings] = await db.query("SELECT * FROM platform_settings ORDER BY id DESC LIMIT 1");
    if (!settings.length) {
        return res.status(404).json({ message: "No platform settings found" });
    }
    res.status(200).json(settings[0]);
});

const setPlatformSettings = asyncHandler(async (req, res) => {
    const { platform_fee_percentage } = req.body;

    if (platform_fee_percentage == null || platform_fee_percentage < 0 || platform_fee_percentage > 100) {
        return res.status(400).json({ message: "Invalid platform fee percentage" });
    }

    // Optional: check if already exists
    const [existing] = await db.query("SELECT * FROM platform_settings ORDER BY id DESC LIMIT 1");

    if (existing.length > 0) {
        await db.query(
            "UPDATE platform_settings SET platform_fee_percentage = ?, updated_at = NOW() WHERE id = ?",
            [platform_fee_percentage, existing[0].id]
        );
    } else {
        await db.query(
            "INSERT INTO platform_settings (platform_fee_percentage, created_at, updated_at) VALUES (?, NOW(), NOW())",
            [platform_fee_percentage]
        );
    }

    res.status(200).json({ message: "Platform fee settings updated successfully", platform_fee_percentage });
});

module.exports = {
    getPlatformSettings,
    setPlatformSettings,
};
