const cron = require("node-cron");
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
const { db } = require("../config/db"); // Update with your actual DB path

cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ Running vendor booking reminder job...");

    try {
        const now = moment().tz("Asia/Kolkata");

        // 🗂️ Get all bookings scheduled today (filter 1-hour before inside loop)
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
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type s ON sbt.service_type_id = s.service_type_id
            WHERE sb.bookingDate = CURDATE()
            `
        );

        for (const booking of rows) {
            const bookingDateTime = moment.tz(
                `${booking.bookingDate} ${booking.bookingTime}`,
                "YYYY-MM-DD HH:mm",
                "Asia/Kolkata"
            );

            const diffInMinutes = bookingDateTime.diff(now, "minutes");

            if (diffInMinutes <= 1) {
                // 🧠 Determine correct email and name based on vendor type
                const isIndividual = booking.vendorType === "individual";
                const vendorEmail = isIndividual
                    ? booking.individualEmail
                    : booking.companyEmail;

                const vendorName = isIndividual
                    ? booking.individualName
                    : booking.companyName;

                if (!vendorEmail) {
                    console.warn(`⚠️ No email found for vendor ID: ${booking.vendor_id}`);
                    continue;
                }

                // 📧 Send reminder email
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
                    <h2>Hello ${vendorName || "Vendor"},</h2>
                    <p>This is a reminder that you have a service booking scheduled in <strong>1 hour</strong>.</p>
                    <ul>
                      <li><strong>Service:</strong> ${booking.serviceTypeName || "N/A"}</li>
                      <li><strong>Date:</strong> ${booking.bookingDate}</li>
                      <li><strong>Time:</strong> ${booking.bookingTime}</li>
                    </ul>
                    <p>Please be ready on time.</p>
                    <br/>
                    <p>Regards,<br/>Homiqly Team</p>
                  `,
                };

                await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent to vendor (${vendorEmail}) for booking ID ${booking.booking_id}`);
            }
        }
    } catch (error) {
        console.error("❌ Error in vendor reminder cron job:", error.message);
    }
});
