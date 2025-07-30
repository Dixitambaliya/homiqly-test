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

        console.log("✅Registration Notification sent:", res.successCount, "successful,", res.failureCount, "failed");
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

const sendServiceBookingNotification = async (booking_id, service_type_id, user_id) => {
    try {
        // ✅ Fetch user name
        const [[userRow]] = await db.query(
            "SELECT firstName, lastName FROM users WHERE user_id = ?",
            [user_id]
        );
        const userName = userRow ? `${userRow.firstName} ${userRow.lastName}`.trim() : "Unknown";

        // ✅ Fetch service type name
        const [[serviceTypeRow]] = await db.query(
            "SELECT serviceTypeName FROM service_type WHERE service_type_id = ?",
            [service_type_id]
        );
        const service_type_name = serviceTypeRow?.serviceTypeName || "a service";

        // ✅ Get admin FCM tokens
        const [admins] = await db.query(`SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL`);
        const tokens = admins.map(a => a.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            console.warn("⚠️ No admin FCM tokens found");
            return;
        }

        // ✅ Send notification
        const message = {
            notification: {
                title: "📦 New Service Booking",
                body: `User "${userName}" booked "${service_type_name}" (Booking ID: ${booking_id})`,
            },
            data: {
                type: "new_booking",
                bookingId: booking_id.toString(),
                serviceTypeName: service_type_name + "",
                userName: userName + "",
            },
            tokens,
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
        console.error("❌ Error sending booking FCM notification:", error.message);
    }
};



module.exports = { sendVendorRegistrationNotification, sendServiceBookingNotification };
