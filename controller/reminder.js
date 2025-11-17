const cron = require("node-cron");
const { db } = require("../config/db"); // Update with your actual DB path
const { sendMail } = require('../config/utils/email/templates/nodemailer');
const moment = require("moment");
const CRON_EVERY_5_MIN = "*/10 * * * *"; // run every 10 minutes (change as needed)
const SERVICE_START_REMINDER_MINUTES = 60; // send reminder 60 minutes before service start


cron.schedule(CRON_EVERY_5_MIN, async () => {
    console.log("⏰ Combined reminder cron running...");

    try {
        console.log("🔍 Checking for service start reminders...");

        const [serviceRows] = await db.query(
            `
            SELECT
                sb.booking_id,
                sb.user_id,
                sb.vendor_id,
                v.vendorType,
                sb.bookingDate,
                sb.bookingTime,
                CONCAT(u.firstName, ' ', u.lastName) AS user_name,
                u.email AS user_email,
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
              AND TIMESTAMP(CONCAT(sb.bookingDate, ' ', sb.bookingTime))
                    BETWEEN NOW() AND NOW() + INTERVAL 10 MINUTE
              AND NOT EXISTS (
                  SELECT 1
                  FROM notifications n
                  WHERE n.title = 'Service starting soon'
                    AND JSON_EXTRACT(n.data, '$.booking_id') = sb.booking_id
                    AND n.sent_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
              )
            `,
            [SERVICE_START_REMINDER_MINUTES]
        );

        for (const b of serviceRows) {
            const startMoment = moment(`${b.bookingDate} ${b.bookingTime}`, "YYYY-MM-DD HH:mm:ss");
            const notifData = { booking_id: b.booking_id, user_id: b.user_id, vendor_id: b.vendor_id };

            // ---------------- EMAIL TEMPLATES ----------------
            const emailBodies = {
                // user: {
                //     subject: "Your service starts soon!",
                //     html: `
                //         <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd;">
                //             <h2>Hello ${b.user_name || `User #${b.user_id}`},</h2>
                //             <p>Your booking <strong>#${b.booking_id}</strong> starts soon — <strong>${startMoment}</strong>.</p>
                //         </div>
                //     `
                // },
                vendor: {
                    subject: "Upcoming booking to serve",
                    html: `
                        <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd;">
                            Hi ${b.vendor_name || `Vendor #${b.vendor_id}`},<br/><br/>
                            Booking <strong>#${b.booking_id}</strong> starts soon — <strong>${startMoment}</strong>.
                        </div>
                    `
                },
                employee: {
                    subject: "Assigned booking starts soon",
                    html: `
                        <div style="font-family: Arial; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd;">
                            Hi ${b.employee_name || `Employee #${b.employee_id}`},<br/><br/>
                            You are assigned to booking <strong>#${b.booking_id}</strong> starting — <strong>${startMoment}</strong>.
                        </div>
                    `
                }
            };

            // ---------------- USER EMAIL ----------------
            // try {
            //     await sendMail({
            //         to: b.user_email,
            //         subject: emailBodies.user.subject,
            //         bodyHtml: emailBodies.user.html,
            //         layout: "vendorNotificationMail"
            //     });

            //     await db.query(
            //         `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
            //          VALUES ('users', ?, 'Service starting soon', ?, ?, 0, NOW())`,
            //         [b.user_id, `Your booking starts soon — ${startTime}`, JSON.stringify(notifData)]
            //     );

            //     console.log(`✅ User reminder sent for booking ${b.booking_id}`);
            // } catch (e) {
            //     console.log(`❌ User email error for booking ${b.booking_id}:`, e.message);
            // }

            // ---------------- VENDOR EMAIL ----------------
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
                console.log(`❌ Vendor email error for booking ${b.booking_id}:`, e.message);
            }

            // ---------------- EMPLOYEE EMAIL ----------------
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
                    console.log(`❌ Employee email error for booking ${b.booking_id}:`, e.message);
                }
            }
        }

    } catch (err) {
        console.error("❌ Error in combined reminder cron:", err.message);
    }
});

// Email function (non-blocking)
const sendPromoEmail = async (userEmail, promoCode) => {
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
                sendPromoEmail(user.email, promo.code, promo.discountValue);
            }
        }
    } catch (err) {
        console.error("❌ Error in promo cron job:", err.message);
    }
});
