// utils/mailer.js
const nodemailer = require("nodemailer");
const { db } = require('../config/db');
const path = require('path');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

async function sendBookingEmail(user_id, bookingDetails) {
    try {
        const [[user]] = await db.query(
            `SELECT CONCAT(firstName, ' ', lastName) AS name, email 
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
            receiptUrl
        } = bookingDetails;

        const pngPath = path.resolve("config/media/homiqly.webp");
        const cidName = "homiqlyLogo";

        const htmlBody = `
        <div style="
            font-family: 'Helvetica', Arial, sans-serif;
            background-color: #f4f6f8;
            padding: 30px 0;
        ">
            <div style="
                max-width: 700px;
                margin: auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            ">
                <!-- Header with logo -->
                <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                    <img src="cid:${cidName}" alt="Homiqly Logo" style="width: 160px; height: auto; display: block; margin: auto;" />
                    <h1 style="color: #ffffff; font-size: 24px; margin: 15px 0 0;">Booking Confirmed!</h1>
                </div>

                <!-- Greeting -->
                <div style="padding: 25px 30px; text-align: center;">
                    <p style="font-size: 16px; color: #333;">Hi <strong>${user.name}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">
                        Your booking <strong>#${booking_id}</strong> has been successfully confirmed. Here are the details:
                    </p>
                </div>

                <!-- Booking Details Card -->
                <div style="
                    background-color: #f9f9f9;
                    margin: 0 30px 30px;
                    border-radius: 10px;
                    padding: 20px;
                    border: 1px solid #e0e0e0;
                ">
                    <h2 style="font-size: 18px; color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px;">Booking Details</h2>
                    <table style="width: 100%; font-size: 15px; color: #333; line-height: 1.6; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0;"><strong>Date:</strong></td>
                            <td style="padding: 6px 0;">${bookingDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Time:</strong></td>
                            <td style="padding: 6px 0;">${bookingTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Package:</strong></td>
                            <td style="padding: 6px 0;">${packageName || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Sub-Packages:</strong></td>
                            <td style="padding: 6px 0;">${sub_packages || "None"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Addons:</strong></td>
                            <td style="padding: 6px 0;">${addons || "None"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Preferences:</strong></td>
                            <td style="padding: 6px 0;">${preferences || "None"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Consents:</strong></td>
                            <td style="padding: 6px 0;">${consents || "None"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0;"><strong>Promo Code:</strong></td>
                            <td style="padding: 6px 0;">${promo_code || "None"}</td>
                        </tr>
                    </table>
                </div>

                <!-- Receipt Button -->
                ${receiptUrl ? `
                <div style="text-align: center; padding-bottom: 30px;">
                    <a href="${receiptUrl}" style="
                        background-color: #4CAF50;
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        font-size: 16px;
                        font-weight: 600;
                        border-radius: 8px;
                        display: inline-block;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    ">View Payment Receipt</a>
                </div>` : ""}

                <!-- Footer -->
                <div style="text-align: center; font-size: 13px; color: #777; padding: 15px 30px 30px;">
                    <p>Thank you for choosing Homiqly! We look forward to serving you.</p>
                    <p>— The Homiqly Team</p>
                </div>
            </div>
        </div>
        `;

        // ---------- Send email ----------
        await transporter.sendMail({
            from: `"Homiqly" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `Booking Confirmation #${booking_id}`,
            html: htmlBody,
            attachments: [
                {
                    filename: 'homiqly.webp',
                    path: pngPath,
                    cid: cidName,
                    contentDisposition: "inline"
                }
            ]
        });

        console.log(`📧 Booking confirmation email sent to ${user.email}`);
    } catch (err) {
        console.error("❌ Failed to send booking email:", err.message);
    }
}






module.exports = { sendBookingEmail };