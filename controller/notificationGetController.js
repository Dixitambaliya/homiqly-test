// controllers/notifications.get.controller.js
const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const getNotifications = asyncHandler(async (req, res) => {
    const { userType } = req.params;

    if (!userType || !["users", "vendors", "admin"].includes(userType)) {
        return res.status(400).json({ message: "Invalid or missing 'userType' parameter" });
    }

    const [notification] = await db.query(
        `SELECT notification_id, user_id, title, body, is_read, sent_at
     FROM notifications
     WHERE user_type = ?
     ORDER BY sent_at DESC`,
        [userType]
    );

    // // Convert `data` (JSON string) -> real JSON
    // const notifications = rows.map(r => ({
    //     ...r,
    // }));

    return res.status(200).json({
        count: notification.length,
        notification, // <-- proper JSON array with parsed `data`
    });
});

module.exports = { getNotifications };