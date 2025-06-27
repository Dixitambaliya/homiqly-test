const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const admin = require('../config/firebaseConfig');

const sendNotification = asyncHandler(async (req, res) => {
    const { user_type, user_ids, title, body, data } = req.body;

    if (!user_type || !title || !body) {
        return res.status(400).json({ message: "User type, title, and body are required" });
    }

    try {
        let tokenQuery;
        let queryParams = [];

        // Determine which table to query based on user type
        switch (user_type) {
            case 'users':
                tokenQuery = user_ids 
                    ? `SELECT fcmToken FROM users WHERE user_id IN (${user_ids.map(() => '?').join(',')}) AND fcmToken IS NOT NULL`
                    : `SELECT fcmToken FROM users WHERE fcmToken IS NOT NULL`;
                queryParams = user_ids || [];
                break;
            case 'vendors':
                tokenQuery = user_ids 
                    ? `SELECT fcmToken FROM vendors WHERE vendor_id IN (${user_ids.map(() => '?').join(',')}) AND fcmToken IS NOT NULL`
                    : `SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL`;
                queryParams = user_ids || [];
                break;
            case 'admin':
                tokenQuery = `SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL`;
                break;
            default:
                return res.status(400).json({ message: "Invalid user type" });
        }

        const [tokenRows] = await db.query(tokenQuery, queryParams);
        const tokens = tokenRows.map(row => row.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            return res.status(404).json({ message: "No FCM tokens found for specified users" });
        }

        // Send notification
        const message = {
            notification: { title, body },
            data: data || {},
            tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Store notification in database
        for (const user_id of (user_ids || [])) {
            await db.query(`
                INSERT INTO notifications (user_type, user_id, title, body, data, sent_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [user_type, user_id, title, body, JSON.stringify(data || {})]);
        }

        res.status(200).json({
            message: "Notifications sent successfully",
            success_count: response.successCount,
            failure_count: response.failureCount
        });

    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getUserNotifications = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id || req.user.vendor_id || req.user.admin_id;
    const user_type = req.user.role === 'admin' ? 'admin' : 
                     req.user.vendor_id ? 'vendors' : 'users';

    try {
        const [notifications] = await db.query(`
            SELECT * FROM notifications 
            WHERE user_type = ? AND (user_id = ? OR user_id IS NULL)
            ORDER BY sent_at DESC
            LIMIT 50
        `, [user_type, user_id]);

        res.status(200).json({
            message: "Notifications fetched successfully",
            notifications
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { notification_id } = req.params;

    try {
        await db.query(`
            UPDATE notifications 
            SET is_read = 1, read_at = NOW() 
            WHERE notification_id = ?
        `, [notification_id]);

        res.status(200).json({
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead
};