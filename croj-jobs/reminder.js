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


