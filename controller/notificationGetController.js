// controllers/notifications.get.controller.js
const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const getAdminNotifications = asyncHandler(async (req, res) => {
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

const getUserNotifications = asyncHandler(async (req, res) => {
    const { user_id } = req.user;

    if (!user_id) {
        return res.status(400).json({ message: "Missing 'user_id' parameter" });
    }

    const [notifications] = await db.query(
        `SELECT notification_id, user_id, title, body, is_read, sent_at
         FROM notifications
         WHERE user_type = 'users' AND user_id = ?
         ORDER BY sent_at DESC`,
        [user_id]
    );

    return res.status(200).json({
        count: notifications.length,
        notifications,
    });
});


module.exports = { getAdminNotifications, getUserNotifications };