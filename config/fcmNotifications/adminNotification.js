const { db } = require("../db");
const admin = require("../../config/firebaseConfig");

const sendVendorRegistrationNotification = async (vendorType, nameOrCompany) => {
    try {
        const [admins] = await db.query(`SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL`);
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            console.warn("⚠️ No admin FCM tokens found");
            return;
        }

        const message = {
            notification: {
                title: "🆕 New Vendor Registered",
                body: `${vendorType === 'individual' ? 'Individual' : 'Company'} vendor "${nameOrCompany}" has registered.`,
            },
            data: {
                type: "new_vendor",
                vendorType,
                name: nameOrCompany,
            },
            tokens, // this replaces sendToDevice
        };

        const res = await admin.messaging().sendEachForMulticast(message);

        console.log("✅ Notification sent:", res.successCount, "successful,", res.failureCount, "failed");
        if (res.responses) {
            res.responses.forEach((resp, i) => {
                if (!resp.success) {
                    console.warn(`⚠️ Token [${tokens[i]}] failed:`, resp.error?.message);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error sending FCM notification:", error.message);
    }
};

module.exports = { sendVendorRegistrationNotification };
