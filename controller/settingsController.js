const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');

// Request body: { platform_fee_percentage: 12.5 }
const updatePlatformFee = asyncHandler(async (req, res) => {
    const { platform_fee_percentage } = req.body;
    if (!platform_fee_percentage || isNaN(platform_fee_percentage)) {
        return res.status(400).json({ message: "Invalid percentage" });
    }

    await db.query(`UPDATE platform_settings SET platform_fee_percentage = ? WHERE id = 1`, [platform_fee_percentage]);
    return res.status(200).json({ message: "Platform fee updated" });
})


module.exports = { updatePlatformFee }