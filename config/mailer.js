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
            promo_discount,
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
                        <tr>
                            <td style="padding: 6px 0;"><strong>Promo Code:</strong></td>
                            <td style="padding: 6px 0;">${promo_discount || "None"}</td>
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

async function sendVendorBookingEmail(vendor_id, bookingDetails) {
    try {
        // 🔍 Fetch vendor info dynamically based on type
        const [[vendor]] = await db.query(
            `
  SELECT 
        v.vendor_id,
        v.vendorType,
        CASE 
          WHEN v.vendorType = 'individual' THEN id.name
          WHEN v.vendorType = 'company' THEN cd.companyName
          ELSE 'Unknown Vendor'
        END AS name,
        CASE 
          WHEN v.vendorType = 'individual' THEN id.email
          WHEN v.vendorType = 'company' THEN cd.companyEmail
          ELSE NULL
        END AS email
    FROM vendors v
    LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
    LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
    WHERE v.vendor_id = ? 
    LIMIT 1
  `,
            [vendor_id]
        );

        if (!vendor || !vendor.email) {
            console.warn(`⚠️ No vendor found or missing email for vendor_id ${vendor_id}, skipping vendor email.`);
            return;
        }


        const {
            booking_id,
            userName,
            userEmail,
            userPhone,
            bookingDate,
            bookingTime,
            packageName,
            sub_packages,
            addons,
            preferences,
            consents
        } = bookingDetails;

        // ---------- Load logo ----------
        const logoPath = path.resolve("config/media/homiqly.webp");
        const cidLogo = "homiqlyLogo";

        // ---------- Email HTML ----------
        const htmlBody = `
        <div style="font-family:Arial,sans-serif;padding:20px;max-width:650px;margin:auto;background:#f9f9f9;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.1);color:#333;">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="cid:${cidLogo}" alt="Homiqly Logo" style="width:200px;height:auto;display:block;margin:0 auto;"/>
          </div>

          <h2 style="text-align:center;color:#2c3e50;">New Booking Assigned</h2>
          <p style="font-size:16px;text-align:center;">
            Hi <strong>${vendor.name}</strong>, you’ve received a new booking (<strong>#${booking_id}</strong>).
          </p>

          <!-- Booking Info -->
          <div style="background:#fff;padding:20px;border-radius:10px;margin:20px 0;border:1px solid #e0e0e0;">
            <h3 style="color:#2c3e50;border-bottom:1px solid #e0e0e0;padding-bottom:8px;">Booking Details</h3>
            <ul style="list-style:none;padding-left:0;line-height:1.8;font-size:15px;">
              <li><strong>Date:</strong> ${bookingDate}</li>
              <li><strong>Time:</strong> ${bookingTime}</li>
              <li><strong>Package:</strong> ${packageName || "N/A"}</li>
              <li><strong>Sub-Packages:</strong> ${sub_packages || "None"}</li>
              <li><strong>Addons:</strong> ${addons || "None"}</li>
              <li><strong>Preferences:</strong> ${preferences || "None"}</li>
              <li><strong>Consents:</strong> ${consents || "None"}</li>
            </ul>
          </div>

          <!-- Customer Info -->
          <div style="background:#fff;padding:20px;border-radius:10px;margin:20px 0;border:1px solid #e0e0e0;">
            <h3 style="color:#2c3e50;border-bottom:1px solid #e0e0e0;padding-bottom:8px;">Customer Details</h3>
            <ul style="list-style:none;padding-left:0;line-height:1.8;font-size:15px;">
              <li><strong>Name:</strong> ${userName || "N/A"}</li>
              <li><strong>Email:</strong> ${userEmail || "N/A"}</li>
              <li><strong>Phone:</strong> ${userPhone || "N/A"}</li>
            </ul>
          </div>

          <p style="text-align:center;font-size:14px;color:#555;margin-top:30px;">
            Please prepare accordingly. Thank you for partnering with <strong>Homiqly</strong>!
          </p>
        </div>
        `;

        // ---------- Send email ----------
        await transporter.sendMail({
            from: `"Homiqly" <${process.env.EMAIL_USER}>`,
            to: vendor.email,
            subject: `New Booking Assigned #${booking_id}`,
            html: htmlBody,
            attachments: [
                {
                    filename: 'homiqly.webp',
                    path: logoPath,
                    cid: cidLogo,
                    contentDisposition: "inline"
                }
            ]
        });

        console.log(`📧 Booking email sent to vendor ${vendor.email}`);
    } catch (err) {
        console.error("❌ Failed to send vendor booking email:", err.message);
    }
}



module.exports = { sendBookingEmail, sendVendorBookingEmail };