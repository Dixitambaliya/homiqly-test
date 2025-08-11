const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const getPlatformSettings = asyncHandler(async (req, res) => {
    const { vendor_type } = req.params;

    if (!vendor_type || !['individual', 'company'].includes(vendor_type)) {
        return res.status(400).json({ message: "Invalid or missing vendor_type" });
    }

    const [settings] = await db.query(
        "SELECT * FROM platform_settings WHERE vendor_type = ? LIMIT 1",
        [vendor_type]
    );

    if (!settings.length) {
        return res.status(404).json({ message: `No platform settings found for ${vendor_type}` });
    }

    res.status(200).json(settings[0]);
});

const setPlatformSettings = asyncHandler(async (req, res) => {
    const { vendor_type, platform_fee_percentage } = req.body;

    if (!['individual', 'company'].includes(vendor_type)) {
        return res.status(400).json({ message: "Invalid vendor type" });
    }

    if (platform_fee_percentage == null || platform_fee_percentage < 0 || platform_fee_percentage > 100) {
        return res.status(400).json({ message: "Invalid platform fee percentage" });
    }

    const [existing] = await db.query(
        "SELECT * FROM platform_settings WHERE vendor_type = ? LIMIT 1",
        [vendor_type]
    );

    if (existing.length > 0) {
        await db.query(
            "UPDATE platform_settings SET platform_fee_percentage = ?, updated_at = NOW() WHERE id = ?",
            [platform_fee_percentage, existing[0].id]
        );
    } else {
        await db.query(
            "INSERT INTO platform_settings (vendor_type, platform_fee_percentage, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
            [vendor_type, platform_fee_percentage]
        );
    }

    res.status(200).json({
        message: `${vendor_type} platform fee updated successfully`
    });
});


module.exports = {
    getPlatformSettings,
    setPlatformSettings,
};
