// utils/mailer.js
const nodemailer = require("nodemailer");
const { db } = require('../config/db');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

async function sendBookingEmail(user_id, bookingDetails) {
    try {
        // 🔎 Get user email & name
        const [[user]] = await db.query(
            `SELECT 
            CONCAT(firstName, ' ' ,lastName) AS name, 
            email 
            FROM users 
            WHERE user_id = ? LIMIT 1`,
            [user_id]
        );

        if (!user) {
            console.warn(`⚠️ No user found for user_id ${user_id}, skipping email.`);
            return;
        }

        const {
            booking_id,
            bookingDate,
            bookingTime,
            packageName,
            sub_packages,
            addons,
            preferences,
            consents,
            promo_code,
        } = bookingDetails;

        // 🔹 Build HTML email body
        const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #333;">Booking Confirmation</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Your booking <strong>#${booking_id}</strong> has been confirmed!</p>

        <h3>Booking Details</h3>
        <ul>
          <li><strong>Date:</strong> ${bookingDate}</li>
          <li><strong>Time:</strong> ${bookingTime}</li>
          <li><strong>Package:</strong> ${packageName || "N/A"}</li>
          <li><strong>Sub-Packages:</strong> ${sub_packages || "None"}</li>
          <li><strong>Addons:</strong> ${addons || "None"}</li>
          <li><strong>Preferences:</strong> ${preferences || "None"}</li>
          <li><strong>Consents:</strong> ${consents || "None"}</li>
          <li><strong>Promo Code:</strong> ${promo_code || "None"}</li>
        </ul>

        <p>We look forward to serving you. Thank you for choosing us!</p>
        <br/>
        <p>— The Homiqly Team</p>
      </div>
    `;

        // 🔹 Send email
        await transporter.sendMail({
            from: `"Homiqly" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Booking Confirmation #${booking_id}`,
            html: htmlBody,
        });

        console.log(`📧 Booking confirmation email sent to ${user.email}`);
    } catch (err) {
        console.error("❌ Failed to send booking email:", err.message);
    }
}

module.exports = { sendBookingEmail };