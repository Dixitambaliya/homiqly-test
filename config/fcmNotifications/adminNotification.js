const axios = require("axios");
const { db } = require("../db");

const sendVendorRegistrationNotification = async (vendorType, nameOrCompany) => {
    try {
        // Fetch admin tokens
        const [admins] = await db.query(`
            SELECT fcmToken
            FROM admin
            WHERE fcmToken IS NOT NULL
        `);

        const tokens = admins.map(a => a.fcmToken).filter(Boolean);
        if (tokens.length === 0) {
            console.warn("⚠️ No admin FCM tokens found");
            return;
        }

        // FCM payload
        const notificationPayload = {
            registration_ids: tokens,
            notification: {
                title: "🆕 New Vendor Registered",
                body: `${vendorType === 'individual' ? 'Individual' : 'Company'} vendor "${nameOrCompany}" has registered.`,
                click_action: "https://your-admin-panel-url.com/vendors", // Customize if needed
            },
            data: {
                type: "new_vendor",
                vendorType,
                name: nameOrCompany,
            }
        };

        // Send notification
        const response = await axios.post(
            "https://fcm.googleapis.com/fcm/send",
            notificationPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `key=${process.env.FCM_SERVER_KEY}`, // Add this to .env
                },
            }
        );

        console.log("📲 FCM Notification Sent:", response.data);

    } catch (error) {
        console.error("❌ Error sending FCM notification:", error.message);
    }
};

module.exports = { sendVendorRegistrationNotification }
