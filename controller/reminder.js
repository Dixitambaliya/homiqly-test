const cron = require("node-cron");
const nodemailer = require("nodemailer");
const { db } = require("../config/db"); // Update with your actual DB path
const { sendMail } = require('../config/utils/email/templates/nodemailer');

const CRON_EVERY_5_MIN = "*/10 * * * *"; // run every 10 minutes (change as needed)
const SERVICE_START_REMINDER_MINUTES = 60; // send reminder 60 minutes before service start


cron.schedule(CRON_EVERY_5_MIN, async () => {
    console.log("⏰ Combined reminder cron running...");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // =============================
    // 2️⃣ SERVICE START REMINDER
    // =============================
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
                CASE
                    WHEN v.vendorType = 'company' THEN comp.companyName
                    ELSE ind.name
                END AS vendor_name,
                CASE
                    WHEN v.vendorType = 'company' THEN comp.companyEmail
                    ELSE ind.email
                END AS vendor_email,
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
                  BETWEEN NOW() AND NOW() + INTERVAL 5 MINUTE
              AND NOT EXISTS (
                  SELECT 1
                  FROM notifications n
                  WHERE n.title = 'Service starting soon'
                    AND COALESCE(JSON_EXTRACT(n.data, '$.booking_id'), 0) = sb.booking_id
                    AND n.sent_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
              )
            `,
            [SERVICE_START_REMINDER_MINUTES]
        );

        for (const b of serviceRows) {
            const startTime = `${b.bookingDate} at ${b.bookingTime}`;
            const notifData = { booking_id: b.booking_id, user_id: b.user_id, vendor_id: b.vendor_id };

            // ---- User ----
            try {
                await transporter.sendMail({
                    from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                    to: b.user_email,
                    subject: "Your service starts soon!",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd;">
                            <div style="text-align: center;">
                                <img src="https://www.homiqly.codegrin.com/public/assets/headerlogoblack.png" alt="Homiqly Logo" style="width: 150px; margin-bottom: 20px;" />
                            </div>
                            <h2 style="color: #333;">Hello ${b.user_name || `User #${b.user_id}`},</h2>
                            <p style="font-size: 16px; color: #555;">
                                Your booking <strong>#${b.booking_id}</strong> is starting soon —
                                <strong>${startTime}</strong>.
                            </p>
                            <p style="font-size: 16px; color: #555;">
                                Please make sure to be at the service location on time.
                            </p>
                            <p style="margin-top: 30px; color: #777;">Thanks,<br/>Homiqly Team</p>
                        </div>
                    `
                });

                await db.query(
                    `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
                     VALUES ('users', ?, 'Service starting soon', ?, ?, 0, CURRENT_TIMESTAMP)`,
                    [b.user_id, `Your booking starts soon — ${startTime}`, JSON.stringify(notifData)]
                );
                console.log(`✅ Start reminder sent to user ${b.user_email} for booking ${b.booking_id}`);
            } catch (e) {
                console.error(`❌ User email failed for booking ${b.booking_id}:`, e.message);
            }

            // ---- Vendor ----
            try {
                await transporter.sendMail({
                    from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                    to: b.vendor_email,
                    subject: "Upcoming booking to serve",
                    text: `Hi ${b.vendor_name || `Vendor #${b.vendor_id}`},\n\nYou have a booking (#${b.booking_id}) starting soon — ${startTime}.\nPlease prepare to serve the customer.\n\nThanks,\nHomiqly Team`,
                    html: `Hi ${b.vendor_name || `Vendor #${b.vendor_id}`},<br/><br/>You have a booking (#${b.booking_id}) starting soon — ${startTime}.<br/>Please prepare to serve the customer.<br/><br/>Thanks,<br/>Homiqly Team`,
                });
                await db.query(
                    `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
                     VALUES ('vendors', ?, 'Service starting soon', ?, ?, 0, CURRENT_TIMESTAMP)`,
                    [b.vendor_id, `You have a booking starting soon — ${startTime}`, JSON.stringify(notifData)]
                );
                console.log(`✅ Start reminder sent to vendor ${b.vendor_email} for booking ${b.booking_id}`);
            } catch (e) {
                console.error(`❌ Vendor email failed for booking ${b.booking_id}:`, e.message);
            }

            // ---- Employee ----
            if (b.vendorType === 'company' && b.employee_id) {
                try {
                    await transporter.sendMail({
                        from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                        to: b.employee_email,
                        subject: "Assigned booking starts soon",
                        text: `Hi ${b.employee_name || `Employee #${b.employee_id}`},\n\nYou are assigned to a booking (#${b.booking_id}) starting soon — ${startTime}.\nPlease prepare to serve the customer.\n\nThanks,\nHomiqly Team`,
                        html: `Hi ${b.employee_name || `Employee #${b.employee_id}`},<br/><br/>You are assigned to a booking (#${b.booking_id}) starting soon — ${startTime}.<br/>Please prepare to serve the customer.<br/><br/>Thanks,<br/>Homiqly Team`,
                    });
                    await db.query(
                        `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
                         VALUES ('employees', ?, 'Service starting soon', ?, ?, 0, CURRENT_TIMESTAMP)`,
                        [b.employee_id, `Your assigned booking starts soon — ${startTime}`, JSON.stringify(notifData)]
                    );
                    console.log(`✅ Start reminder sent to employee ${b.employee_email} for booking ${b.booking_id}`);
                } catch (e) {
                    console.error(`❌ Employee email failed for booking ${b.booking_id}:`, e.message);
                }
            }
        }
    } catch (err) {
        console.error("❌ Service start reminder cron error:", err.message);
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
