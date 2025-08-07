const { db } = require("../config/db"); // adjust path to your DB connection
const nodemailer = require("nodemailer");
const moment = require("moment-timezone");
const cron = require("node-cron");

// 📦 Cron Job: Runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ Running vendor booking reminder job...");

    try {
        const now = moment().tz("Asia/Kolkata");

        // 🗂️ Get all bookings scheduled in exactly 1 hour
        const [rows] = await db.query(
            `
            SELECT
                sb.booking_id,
                sb.bookingDate,
                sb.bookingTime,
                sb.vendor_id,
                v.vendorType,
                v.vendor_email,
                idet.name AS individualName,
                cdet.contactPerson AS companyName,
                s.serviceName
            FROM service_booking sb
            JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type s ON sbt.service_type_id = s.service_type_id
            WHERE sb.bookingDate = CURDATE()`
        );

        for (const booking of rows) {
            const bookingDateTime = moment
                .tz(`${booking.bookingDate} ${booking.bookingTime}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata");

            const diffInMinutes = bookingDateTime.diff(now, "minutes");

            if (diffInMinutes === 60) {
                // Send reminder email
                const vendorEmail = booking.vendor_email;
                const vendorName =
                    booking.vendorType === "individual"
                        ? booking.individualName
                        : booking.companyName;

                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                const mailOptions = {
                    from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                    to: vendorEmail,
                    subject: `📅 Reminder: Booking in 1 hour`,
                    html: `
            <h2>Hello ${vendorName},</h2>
            <p>This is a reminder that you have a service booking scheduled in <strong>1 hour</strong>.</p>
            <ul>
              <li><strong>Service:</strong> ${booking.serviceName}</li>
              <li><strong>Date:</strong> ${booking.bookingDate}</li>
              <li><strong>Time:</strong> ${booking.bookingTime}</li>
            </ul>
            <p>Please be ready on time.</p>
            <br/>
            <p>Regards,<br/>Homiqly Team</p>
          `,
                };

                await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent to vendor: ${vendorEmail}`);
            }
        }
    } catch (error) {
        console.error("❌ Error in vendor reminder cron job:", error.message);
    }
});
