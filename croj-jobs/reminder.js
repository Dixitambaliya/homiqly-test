const cron = require("node-cron");
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
const { db } = require("../config/db"); // Update with your actual DB path

// Runs every 10 seconds for testing
cron.schedule("*/10 * * * * *", async () => {
    console.log("⏰ Running vendor booking reminder job...");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    try {
        // For testing: only bookings starting within the next 1 minute and not reminded yet
        const [rows] = await db.query(
            `
      SELECT
        sb.booking_id,
        sb.bookingDate,
        sb.bookingTime,
        sb.vendor_id,
        v.vendorType,
        idet.name AS individualName,
        idet.email AS individualEmail,
        cdet.contactPerson AS companyName,
        cdet.companyEmail AS companyEmail,
        s.serviceTypeName
      FROM service_booking sb
      JOIN vendors v ON sb.vendor_id = v.vendor_id
      LEFT JOIN individual_details idet
        ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
      LEFT JOIN company_details cdet
        ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'
      LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
      LEFT JOIN service_type s ON sbt.service_type_id = s.service_type_id
      WHERE sb.vendor_reminder_60m_sent = 0
        AND TIMESTAMP(CONCAT(sb.bookingDate, ' ', sb.bookingTime))
            BETWEEN CONVERT_TZ(NOW(), '+00:00', '+05:30')
                AND DATE_ADD(CONVERT_TZ(NOW(), '+00:00', '+05:30'), INTERVAL 1 MINUTE)
      `
        );

        for (const booking of rows) {
            const isIndividual = booking.vendorType === "individual";
            const vendorEmail = isIndividual ? booking.individualEmail : booking.companyEmail;
            const vendorName = isIndividual ? booking.individualName : booking.companyName;

            if (!vendorEmail) {
                console.warn(`⚠️ No email for vendor ${booking.vendor_id} (booking ${booking.booking_id})`);
                continue;
            }

            const mailOptions = {
                from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                to: vendorEmail,
                subject: `📅 Reminder: Booking starting soon (testing mode)`,
                html: `
          <h2>Hello ${vendorName || "Vendor"},</h2>
          <p>This is a TEST reminder that you have a service booking starting soon.</p>
          <ul>
            <li><strong>Service:</strong> ${booking.serviceTypeName || "N/A"}</li>
            <li><strong>Date:</strong> ${booking.bookingDate}</li>
            <li><strong>Time:</strong> ${booking.bookingTime}</li>
          </ul>
          <p>Please be ready on time.</p>
        `,
            };

            try {
                await transporter.sendMail(mailOptions);

                // Mark as sent so we don't send again
                await db.query(
                    `UPDATE service_booking
           SET vendor_reminder_60m_sent = 1,
               vendor_reminder_60m_sent_at = NOW()
           WHERE booking_id = ?`,
                    [booking.booking_id]
                );

                console.log(`✅ Test email sent for booking ${booking.booking_id} → ${vendorEmail}`);
            } catch (e) {
                console.error(`❌ Failed to email booking ${booking.booking_id}:`, e.message);
            }
        }
    } catch (error) {
        console.error("❌ Error in vendor reminder cron job:", error.message);
    }
});


const REMINDER_INTERVAL_MINUTES = 120; // 2 hours
const CRON_EVERY_5_MIN = "*/5 * * * *"; // run every 5 minutes (change as needed)

// For testing you can use: "*/30 * * * * *" (every 30 seconds)

cron.schedule(CRON_EVERY_5_MIN, async () => {
    console.log("⏰ Payment reminder cron running...");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        // Find approved, unpaid, future bookings with no reminder in last 2 hours
        const [rows] = await db.query(
            `
            SELECT
                sb.booking_id,
                sb.user_id,
                sb.bookingDate,
                sb.bookingTime,
                CONCAT(u.firstName, ' ', u.lastName) AS user_name,
                u.email
            FROM service_booking sb
            JOIN users u ON u.user_id = sb.user_id
            LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
            WHERE sb.bookingStatus = 1
                AND (p.status IS NULL OR p.status <> 'completed')
                AND TIMESTAMP(CONCAT(sb.bookingDate, ' ', sb.bookingTime)) > NOW()
                AND NOT EXISTS (
                SELECT 1
                FROM notifications n
                WHERE n.user_type = 'users'
                    AND n.user_id = sb.user_id
                    AND n.title = 'Payment reminder'
                    -- Only reminders for THIS booking in the last 2 hours
                    AND COALESCE(JSON_EXTRACT(n.data, '$.booking_id'), 0) = sb.booking_id
                    AND n.sent_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
                )
            `,
            [REMINDER_INTERVAL_MINUTES]
        );

        for (const b of rows) {
            const name = b.user_name || `User #${b.user_id}`;
            const subject = "Payment reminder";
            const bodyText = `
                    Hi ${name},

                    Your booking (#${b.booking_id}) is approved, but payment hasn't been completed yet.
                    Please pay before the service starts on ${b.bookingDate} at ${b.bookingTime}.

                    Thanks,
                    Homiqly Team
                    `.trim();

            // 📧 Send email (best-effort)
            try {
                await transporter.sendMail({
                    from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                    to: b.email,
                    subject,
                    text: bodyText,
                    html: bodyText.replace(/\n/g, "<br/>"),
                });
                console.log(`✅ Payment reminder sent to ${b.email} for booking ${b.booking_id}`);
            } catch (e) {
                console.error(`❌ Email failed for booking ${b.booking_id}:`, e.message);
            }

            // 🔔 Insert user notification (used to throttle future sends)
            try {
                const notifData = { booking_id: b.booking_id, user_id: b.user_id, name };
                await db.query(
                    `INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at)
           VALUES ('users', ?, 'Payment reminder', ?, ?, 0, CURRENT_TIMESTAMP)`,
                    [
                        b.user_id,
                        `Please complete payment for booking #${b.booking_id} before the service starts.`,
                        JSON.stringify(notifData),
                    ]
                );
            } catch (e) {
                console.error(`⚠️ Notification insert failed for booking ${b.booking_id}:`, e.message);
            }
        }
    } catch (err) {
        console.error("❌ Payment reminder cron error:", err.message);
    }
});
