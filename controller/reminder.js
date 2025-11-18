const cron = require("node-cron");
const { db } = require("../config/db"); // Update with your actual DB path
const { sendMail } = require('../config/utils/email/templates/nodemailer');
const moment = require("moment");
const CRON_EVERY_5_MIN = "*/10 * * * *"; // run every 10 minutes (change as needed)
const SERVICE_START_REMINDER_MINUTES = 60; // send reminder 60 minutes before service start


cron.schedule(CRON_EVERY_5_MIN, async () => {
    const mountainNow = moment.tz("America/Edmonton");
    const hour = mountainNow.hour();

    // Skip cron if time is between 00:00 and 08:00 Mountain Time
    if (hour >= 23 || hour < 8) {
        console.log("Cron skipped — Mountain Time outside booking window (00:00–08:00).");
        return;
    }
    console.log(`🕒 Mountain Time Now: ${mountainNow.format("YYYY-MM-DD HH:mm:ss")}`);
    console.log("Combined reminder cron running...");

    try {

        // REMOVE all timezone logic from SQL (too risky)
        const [serviceRows] = await db.query(`
            SELECT
                sb.booking_id,
                sb.user_id,
                sb.vendor_id,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,
                u.email AS user_email,
                u.address AS bookingAddress,
                v.vendorType,
                sb.bookingDate,
                sb.bookingTime,
                CASE WHEN v.vendorType = 'company' THEN comp.companyName ELSE ind.name END AS vendor_name,
                CASE WHEN v.vendorType = 'company' THEN comp.companyEmail ELSE ind.email END AS vendor_email,
                e.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.email AS employee_email
            FROM service_booking sb
            JOIN users u ON u.user_id = sb.user_id
            JOIN vendors v ON v.vendor_id = sb.vendor_id
            LEFT JOIN company_details comp ON comp.vendor_id = v.vendor_id
            LEFT JOIN individual_details ind ON ind.vendor_id = v.vendor_id
            LEFT JOIN company_employees e ON e.employee_id = sb.assigned_employee_id
            WHERE sb.bookingStatus = 1
        `);

        for (const b of serviceRows) {
            // Defensive: ensure values exist
            if (!b.bookingDate || !b.bookingTime) {
                console.log(`⚠️ Skipping booking ${b.booking_id} — missing date/time`, b.bookingDate, b.bookingTime);
                continue;
            }

            // Normalize date (strip any time or timezone that may be in bookingDate)
            const dateStr = moment(b.bookingDate).isValid()
                ? moment(b.bookingDate).format("YYYY-MM-DD")
                : null;

            // Normalize time (ensure HH:mm:ss)
            // If bookingTime might include timezone or extra chars, parse then format.
            const timeStr = moment(b.bookingTime, ["HH:mm:ss", "HH:mm", moment.ISO_8601], true).isValid()
                ? moment(b.bookingTime, ["HH:mm:ss", "HH:mm", moment.ISO_8601]).format("HH:mm:ss")
                : null;

            if (!dateStr || !timeStr) {
                console.log(`Invalid date/time for booking ${b.booking_id}, skipping.`);
                continue;
            }

            // Build a strict datetime string and parse in Mountain Time
            const combined = `${dateStr} ${timeStr}`; // e.g. "2025-08-01 11:30:00"
            const bookingStartMT = moment.tz(combined, "YYYY-MM-DD HH:mm:ss", "America/Edmonton");

            if (!bookingStartMT.isValid()) {
                console.log(`bookingStartMT invalid for booking ${b.booking_id}:`, combined);
                continue;
            }

            const diffMinutes = bookingStartMT.diff(mountainNow, "minutes");

            // Trigger window: 60–55 minutes before start
            if (diffMinutes > 60 || diffMinutes <= 50) {
                continue; // skip, not in trigger window
            }
            console.log(`Booking #${b.booking_id} starts in ${diffMinutes} minutes → REMINDER WILL BE SENT`);

            // Format start time for email
            const startTime = bookingStartMT.format("DD MMM YYYY [at] hh:mm A");

            const notifData = {
                booking_id: b.booking_id,
                user_id: b.user_id,
                vendor_id: b.vendor_id
            };

            // Check for duplicate notifications (within 2 hours)
            const [existing] = await db.query(
                `
                SELECT notification_id FROM notifications 
                WHERE title='Service starting soon'
                AND JSON_EXTRACT(data, '$.booking_id')=?
                AND sent_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
                `,
                [b.booking_id]
            );

            if (existing.length > 0) {
                console.log(`Already sent reminder for booking ${b.booking_id}, skipping.`);
                continue;
            }

            // --- EMAIL BODY ---
            const emailBodies = {
                vendor: {
                    subject: "Upcoming Booking Reminder",
                    html: `
                        <div style="font-family: Arial; max-width: 650px; margin:auto; padding:20px; border:1px solid #e6e6e6; border-radius:8px;">
                            <p>Hi <strong>${b.vendor_name}</strong>,</p>
                            <p>This is a reminder that a booking will start soon.</p>
                            <p>
                                <strong>Booking Details:</strong><br/>
                                • Booking ID: #${b.booking_id}<br/>
                                • Customer: ${b.userName}<br/>
                                • Start Time: ${startTime}<br/>
                                • Location: ${b.bookingAddress}
                            </p>
                            <p>Please be prepared and reach on time.</p>
                            <p>- Homiqly Team</p>
                        </div>
                    `
                },
                employee: {
                    subject: "Assigned booking starts soon",
                    html: `
                        <div style="font-family: Arial; max-width: 650px; margin:auto; padding:20px; border:1px solid #e6e6e6; border-radius:8px;">
                            <p>Hi ${b.employee_name},</p>
                            <p>You are assigned to booking <strong>#${b.booking_id}</strong> starting at <strong>${startTime}</strong>.</p>
                        </div>
                    `
                }
            };

            // Send VENDOR EMAIL
            try {
                await sendMail({
                    to: b.vendor_email,
                    subject: emailBodies.vendor.subject,
                    bodyHtml: emailBodies.vendor.html,
                    layout: "vendorNotificationMail"
                });

                await db.query(
                    `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
                     VALUES ('vendors', ?, 'Service starting soon', ?, ?, 0, NOW())`,
                    [b.vendor_id, `Booking starts soon — ${startTime}`, JSON.stringify(notifData)]
                );

                console.log(`✅ Vendor reminder sent for booking ${b.booking_id}`);
            } catch (e) {
                console.log(`❌ Vendor email error:`, e.message);
            }

            // COMPANY EMPLOYEE EMAIL
            if (b.vendorType === "company" && b.employee_id) {
                try {
                    await sendMail({
                        to: b.employee_email,
                        subject: emailBodies.employee.subject,
                        bodyHtml: emailBodies.employee.html,
                        layout: "vendorNotificationMail"
                    });

                    await db.query(
                        `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
                         VALUES ('employees', ?, 'Service starting soon', ?, ?, 0, NOW())`,
                        [b.employee_id, `Assigned booking starts soon — ${startTime}`, JSON.stringify(notifData)]
                    );

                    console.log(`✅ Employee reminder sent for booking ${b.booking_id}`);
                } catch (e) {
                    console.log(`❌ Employee email error:`, e.message);
                }
            }
        }

    } catch (err) {
        console.error("❌ Error in combined reminder cron:", err.message);
    }
});



// Email function (non-blocking)
const sendPromoEmail = async (userEmail, user_name, promoCode) => {
    try {
        const subject = `You've received a new promo code!`

        const bodyHtml = `
   <div style="padding: 5px 30px 30px; font-size: 15px; color: #ffffff; text-align: left;
            font-family: Arial, sans-serif; background-color: #000;">


            <p style="font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                <strong>Hi ${user_name || "there"},</strong><br><br>
                Great news! You’ve just completed the minimum number of bookings required to unlock your special reward on Homiqly.
                We appreciate your trust in our at-home beauty services.
            </p>

            <p style="margin-bottom: 10px; font-size: 15px;">
                As a thank-you for reaching this milestone, your reward is now active on your account.
                You can apply it automatically on your next eligible booking—no extra steps needed.
            </p>

            <h3 style="font-weight: 500; margin-bottom: 20px; font-size: 16px;">
                Keep exploring, keep glowing. More perks await as you continue booking with Homiqly!
            </h3>

            <p style="font-size: 14px; margin-top: 15px; line-height: 1.6;">
                This reward is available only to users who have completed the required number of bookings.
                It applies to eligible at-home beauty services booked through the Homiqly website.
                Rewards are non-transferable and cannot be combined with other promotions.
                Terms may change without prior notice.
            </p>

        </div>
 `;

        await sendMail({
            to: userEmail,
            subject,
            bodyHtml,
            layout: "adminCode",
            extraData: { promoCode }, // ✅ Add this line
        })

        console.log(`📧 Promo email sent to ${userEmail}`);
    } catch (err) {
        console.error(`❌ Error sending promo email to ${userEmail}:`, err.message);
    }
};

// Cron job at midnight daily
cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running promo assignment cron job at midnight...");

    try {
        const [promos] = await db.query(
            "SELECT * FROM promo_codes WHERE requiredBookings IS NOT NULL"
        );

        for (const promo of promos) {
            const [eligibleUsers] = await db.query(
                `SELECT
                 service_booking.user_id,
                 email,
                 CONCAT(firstName, ' ', lastName) AS user_name,
                 COUNT(*) as completed_count
                 FROM service_booking
                 JOIN users ON users.user_id = service_booking.user_id
                 WHERE payment_status = 'completed'
                 GROUP BY user_id
                 HAVING completed_count >= ?`,
                [promo.requiredBookings]
            );

            for (const user of eligibleUsers) {
                const [exists] = await db.query(
                    "SELECT * FROM user_promo_codes WHERE user_id = ? AND code = ?",
                    [user.user_id, promo.code]
                );

                if (exists.length > 0) continue;

                await db.query(
                    `INSERT INTO user_promo_codes (user_id, code, assigned_at, maxUse, promo_id, source_type)
                     VALUES (?, ?, NOW(), ?, ?, 'admin')`,
                    [user.user_id, promo.code, promo.maxUse, promo.promo_id]
                );

                console.log(`✅ Assigned promo ${promo.code} to user ${user.user_id}`);

                // Send email asynchronously without waiting
                sendPromoEmail(user.email, user.user_name, promo.code, promo.discountValue);
            }
        }
    } catch (err) {
        console.error("❌ Error in promo cron job:", err.message);
    }
});
