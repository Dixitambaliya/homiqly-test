const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const admin = require('../config/firebaseConfig');
const notificationGetQueries = require('../config/notificationQueries/notificationGetQueries');
const nodemailer = require("nodemailer");

 
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendNotification = asyncHandler(async (req, res) => {
    const { user_type, user_ids, vendor_type, title, body, data, channel } = req.body;
    // channel can be: "notification" | "mail"

    if (!user_type || !title || !body || !channel) {
        return res.status(400).json({ message: "User type, title, body, and channel are required" });
    }

    try {
        let tokenQuery, emailQuery;
        let queryParams = [];

        switch (user_type) {
            case 'users':
                tokenQuery = user_ids
                    ? `SELECT user_id AS id, fcmToken, email FROM users WHERE user_id IN (${user_ids.map(() => '?').join(',')})`
                    : `SELECT user_id AS id, fcmToken, email FROM users`;
                queryParams = user_ids || [];
                break;

            case 'vendor':
                if (!vendor_type || !['individual', 'company'].includes(vendor_type)) {
                    return res.status(400).json({ message: "Vendor type must be 'individual' or 'company'" });
                }
                tokenQuery = user_ids
                    ? `SELECT vendor_id AS id, fcmToken, email FROM vendors WHERE vendorType = ? AND vendor_id IN (${user_ids.map(() => '?').join(',')})`
                    : `SELECT vendor_id AS id, fcmToken, email FROM vendors WHERE vendorType = ?`;
                queryParams = vendor_type ? [vendor_type, ...(user_ids || [])] : [];
                break;

            case 'employees':
                tokenQuery = user_ids
                    ? `SELECT employee_id AS id, fcmToken, email FROM company_employees WHERE employee_id IN (${user_ids.map(() => '?').join(',')})`
                    : `SELECT employee_id AS id, fcmToken, email FROM company_employees`;
                queryParams = user_ids || [];
                break;

            case 'admin':
                tokenQuery = `SELECT id, fcmToken, email FROM admin`;
                break;

            default:
                return res.status(400).json({ message: "Invalid user type" });
        }

        const [rows] = await db.query(tokenQuery, queryParams);

        if (rows.length === 0) {
            return res.status(404).json({ message: "No users found for the specified filter" });
        }

        let successCount = 0, failureCount = 0, dbFailureCount = 0;

        if (channel === "notification") {
            // Push Notifications (FCM)
            const tokens = rows.map(r => r.fcmToken).filter(Boolean);
            if (tokens.length === 0) {
                return res.status(404).json({ message: "No FCM tokens available" });
            }

            const message = {
                notification: { title, body },
                data: data || {},
                tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const sendSuccess = response.responses[i]?.success;
                if (sendSuccess) {
                    successCount++;
                    try {
                        await db.query(
                            `INSERT INTO notifications (user_type, user_id, title, body, data, sent_at)
                             VALUES (?, ?, ?, ?, ?, NOW())`,
                            [user_type, row.id, title, body, JSON.stringify(data || {})]
                        );
                    } catch (dbErr) {
                        dbFailureCount++;
                        console.error(`DB insert failed for user_id ${row.id}:`, dbErr.message);
                    }
                } else {
                    failureCount++;
                    console.error(`FCM failed for token: ${row.fcmToken}`, response.responses[i]?.error);
                }
            }

        } else if (channel === "mail") {
            // Send Email
            for (const row of rows) {
                if (!row.email) continue;
                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER || "noreply@homiqly.com",
                        to: row.email,
                        subject: title,
                        html: `
                            <h2>${title}</h2>
                            <p>${body}</p>
                            <pre>${JSON.stringify(data || {}, null, 2)}</pre>
                        `
                    });

                    successCount++;
                    try {
                        await db.query(
                            `INSERT INTO notifications (user_type, user_id, title, body, data, sent_at)
                             VALUES (?, ?, ?, ?, ?, NOW())`,
                            [user_type, row.id, title, body, JSON.stringify(data || {})]
                        );
                    } catch (dbErr) {
                        dbFailureCount++;
                        console.error(`DB insert failed for user_id ${row.id}:`, dbErr.message);
                    }
                } catch (mailErr) {
                    failureCount++;
                    console.error(`Email failed for ${row.email}:`, mailErr.message);
                }
            }
        } else {
            return res.status(400).json({ message: "Invalid channel. Must be 'notification' or 'mail'" });
        }

        res.status(200).json({
            message: `Notifications processed via ${channel}`,
            success_count: successCount,
            failure_count: failureCount,
            db_failure_count: dbFailureCount,
        });

    } catch (error) {
        console.error("Error sending notifications:", error);
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

const getAllVendorsDetails = asyncHandler(async (req, res) => {
    try {
        const [vendors] = await db.query(notificationGetQueries.getAllVendors);

        res.status(200).json({
            message: "All vendors fetched successfully",
            vendors,
        });
    } catch (error) {
        console.error("Error fetching vendors:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const [users] = await db.query(notificationGetQueries.getAllUsers);

        res.status(200).json({
            message: "Users fetched successfully",
            users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllEmployeeNames = asyncHandler(async (req, res) => {
    const vendor_id = req.params.vendor_id;

    try {
        const [employees] = await db.query(notificationGetQueries.getAllEmployee,
            [vendor_id]
        );

        res.status(200).json({
            message: "Employee names fetched successfully",
            employees,
        });

    } catch (error) {
        console.error("Error fetching employee names:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getEmployeeNames = asyncHandler(async (req, res) => {
    try {
        const [employees] = await db.query(
            `SELECT 
                employee_id, 
                TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS fullName 
             FROM company_employees 
             ORDER BY created_at DESC`
        );

        res.status(200).json({
            message: "All employee names fetched successfully",
            employees,
        });

    } catch (error) {
        console.error("Error fetching employee names:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const deleteRatingByAdmin = asyncHandler(async (req, res) => {
    const { rating_id } = req.params;

    if (!rating_id) {
        return res.status(400).json({ message: "Rating ID is required" });
    }

    try {
        const [existing] = await db.query(`SELECT * FROM ratings WHERE rating_id = ?`, [rating_id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: "Rating not found" });
        }

        await db.query(`DELETE FROM ratings WHERE rating_id = ?`, [rating_id]);

        res.status(200).json({ message: "Rating deleted successfully" });
    } catch (error) {
        console.error("Error deleting rating:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const deleteVendorsRatingByAdmin = asyncHandler(async (req, res) => {
    const { rating_id } = req.params;

    if (!rating_id) {
        return res.status(400).json({ message: "Rating ID is required" });
    }

    try {
        const [existing] = await db.query(`SELECT * FROM vendor_service_ratings WHERE rating_id = ?`, [rating_id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: "Rating not found" });
        }

        await db.query(`DELETE FROM vendor_service_ratings WHERE rating_id = ?`, [rating_id]);

        res.status(200).json({ message: "Rating deleted successfully" });
    } catch (error) {
        console.error("Error deleting rating:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead,
    getAllVendorsDetails,
    getAllUsers,
    getAllEmployeeNames,
    getEmployeeNames,
    deleteRatingByAdmin,
    deleteVendorsRatingByAdmin
};
