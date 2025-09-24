// controllers/notifications.get.controller.js
const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const getAdminNotifications = asyncHandler(async (req, res) => {
    const { userType } = req.params;

    if (!userType || !["users", "vendors", "admin"].includes(userType)) {
        return res.status(400).json({ message: "Invalid or missing 'userType' parameter" });
    }

    const [notificationsRaw] = await db.query(
        `SELECT notification_id, user_id, title, body, is_read, sent_at
     FROM notifications
     WHERE user_type = ?
     ORDER BY sent_at DESC`,
        [userType]
    );

    // Map to rename user_id to vendor_id
    const notifications = notificationsRaw.map(n => ({
        ...n,
        user_id: undefined // optionally remove user_id from the object

    }));

    return res.status(200).json({
        count: notifications.length,
        notifications, // <-- proper JSON array with parsed `data`
    });
});

const getUserNotifications = asyncHandler(async (req, res) => {
    const { user_id } = req.user;

    if (!user_id) {
        return res.status(400).json({ message: "Missing 'user_id' parameter" });
    }

    const [notifications] = await db.query(
        `SELECT notification_id, user_id, title, body, is_read, sent_at, action_link
         FROM notifications
         WHERE user_type = 'users' AND user_id = ?
         ORDER BY sent_at DESC`,
        [user_id]
    );

    // 🔹 Remove `action_link` if null/empty
    const cleaned = notifications.map(n => {
        const notif = { ...n };
        if (!notif.action_link) {
            delete notif.action_link;
        }
        return notif;
    });

    return res.status(200).json({
        count: cleaned.length,
        notifications: cleaned,
    });
});

const getVendorNotifications = asyncHandler(async (req, res) => {
    const { vendor_id } = req.user;
    if (!vendor_id) {
        return res.status(400).json({ message: "Missing 'vendor_id' parameter" });
    }

    const [notificationsRaw] = await db.query(
        `SELECT notification_id, user_id, title, body, is_read, sent_at
         FROM notifications
         WHERE user_type = 'vendors' AND user_id = ?
         ORDER BY sent_at DESC`,
        [vendor_id]
    );
    // Map to rename user_id to vendor_id
    const notifications = notificationsRaw.map(n => ({
        ...n,
        vendor_id: n.user_id,
        user_id: undefined // optionally remove user_id from the object
    }));
    return res.status(200).json({
        count: notifications.length,
        notifications,
    });
}
)

const getEmployeeNotifications = asyncHandler(async (req, res) => {
    const { employee_id } = req.user;

    if (!employee_id) {
        return res.status(400).json({ message: "Missing 'employee_id' parameter" });
    }

    const [notificationsRaw] = await db.query(
        `SELECT notification_id, user_id, title, body, is_read, sent_at
         FROM notifications
         WHERE user_type = 'employee' AND user_id = ?
         ORDER BY sent_at DESC`,
        [employee_id]
    );

    // Rename user_id to employee_id for response clarity
    const notifications = notificationsRaw.map(n => ({
        ...n,
        employee_id: n.user_id,
        user_id: undefined // optionally hide user_id
    }));

    return res.status(200).json({
        count: notifications.length,
        notifications,
    });
});

const readNotification = asyncHandler(async (req, res) => {
    const { notification_id } = req.params;

    if (!notification_id) {
        return res.status(400).json({ message: "Missing 'notification_id' parameter" });
    }

    const [result] = await db.query(
        `UPDATE notifications
         SET is_read = 1
         WHERE notification_id = ?`,
        [notification_id]
    );
    if (result.affectedRows === 0) {
        return res.status(400).json({ message: "Notification not found" });
    }

    return res.status(200).json({ message: "Notification marked as read" });
});

module.exports = {
    getAdminNotifications,
    getUserNotifications,
    getVendorNotifications,
    getEmployeeNotifications,
    readNotification
};