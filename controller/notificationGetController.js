// controllers/notifications.get.controller.js
const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const safeParse = (str) => {
    if (str == null) return null;
    try { return JSON.parse(str); } catch { return null; }
};

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


/**
 * (Optional) GET /api/notifications/unread-count
 * Query: user_type, user_id (user_id optional for admin)
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const { user_type, user_id } = req.query;

    if (!user_type || !["users", "vendors", "admin"].includes(user_type)) {
        return res.status(400).json({ message: "Invalid or missing 'user_type'." });
    }
    if (user_type !== "admin" && !user_id) {
        return res.status(400).json({ message: "'user_id' is required for users/vendors." });
    }

    const params = [user_type];
    let where = `WHERE user_type = ? AND is_read = 0`;

    if (user_type !== "admin") {
        where += ` AND (user_id = ? OR user_id IS NULL)`;
        params.push(Number(user_id));
    }
    if (user_type === "admin" && user_id) {
        where += ` AND (user_id = ? OR user_id IS NULL)`;
        params.push(Number(user_id));
    }

    const [rows] = await db.query(`SELECT COUNT(*) AS unread FROM notifications ${where}`, params);
    res.json({ unread: rows?.[0]?.unread || 0 });
});

