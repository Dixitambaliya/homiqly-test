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



async function sendAdminVendorRegistrationMail({ vendorType, vendorName, vendorEmail, vendorCity, vendorService }) {
  try {
    // Fetch admin emails
    const [adminEmails] = await db.query("SELECT email FROM admin WHERE email IS NOT NULL");
    if (!adminEmails.length) return console.warn("⚠️ No admin emails found.");

    const emailAddresses = adminEmails.map(row => row.email);

    // Logo file path and CID
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header with logo -->
          <div style="background:#4CAF50; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">New Vendor Registration</h1>
          </div>

          <!-- Body content -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello Homiqly Team,</p>
            <p>A new service provider has just registered on Homiqly!</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Name:</strong> ${vendorName}</li>
                <li><strong>Email:</strong> ${vendorEmail}</li>
                <li><strong>City:</strong> ${vendorCity || "N/A"}</li>
                <li><strong>Service Category:</strong> ${vendorService || "N/A"}</li>
            </ul>
            <p>Please review their profile and documentation to proceed with verification.</p>
          </div>

          <!-- Footer -->
          <div style="background:#f8f8f8; text-align:center; font-size:13px; color:#777; padding:15px;">
            <p style="margin:4px 0;">Best regards,</p>
            <p style="margin:4px 0;">Homiqly Team</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly" <${process.env.EMAIL_USER}>`,
      to: emailAddresses,
      subject: "New Service Provider Registration on Homiqly",
      html: htmlBody,
      attachments: [
        { filename: 'homiqly.webp', path: logoPath, cid: cidName, contentDisposition: "inline" }
      ]
    });

    console.log(`📧 Admin notified about new vendor: ${vendorName}`);
  } catch (error) {
    console.error("❌ Failed to send admin vendor registration email:", error.message);
  }
}

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
      packages = [],
      promo_code,
      promo_discount,
      receiptUrl
    } = bookingDetails;

    const pngPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";

    // 🧾 Create dynamic HTML for all packages
    const packagesHtml = packages.map(pkg => {
      const subPackagesHtml = pkg.sub_packages.map(sub => {
        const addonsHtml = sub.addons?.length
          ? sub.addons.map(a => `<li>${a.addonName} <span style="color:#555;">(₹${a.price})</span></li>`).join("")
          : "<li>None</li>";

        const prefsHtml = sub.preferences?.length
          ? sub.preferences.map(p => `<li>${p.preferenceValue} <span style="color:#555;">(₹${p.preferencePrice})</span></li>`).join("")
          : "<li>None</li>";

        const consentsHtml = sub.consents?.length
          ? sub.consents.map(c => `<li>${c.question}: <strong>${c.answer}</strong></li>`).join("")
          : "<li>None</li>";

        return `
          <div style="padding:12px 15px; margin:10px 0; background:#fafafa; border-radius:8px; border:1px solid #eee;">
            <p style="margin:0 0 8px;"><strong>${sub.itemName}</strong> (${sub.timeRequired})</p>
            <table style="width:100%; font-size:14px; color:#333;">
              <tr><td style="width:150px;"><strong>Price:</strong></td><td>₹${sub.price}</td></tr>
              <tr><td><strong>Addons:</strong></td><td><ul>${addonsHtml}</ul></td></tr>
              <tr><td><strong>Preferences:</strong></td><td><ul>${prefsHtml}</ul></td></tr>
              <tr><td><strong>Consents:</strong></td><td><ul>${consentsHtml}</ul></td></tr>
            </table>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-bottom:25px;">
          <h3 style="color:#2c3e50; border-bottom:2px solid #4CAF50; padding-bottom:5px;">${pkg.packageName}</h3>
          ${subPackagesHtml}
        </div>
      `;
    }).join("");

    // 📄 Build the full email HTML
    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
          
          <div style="background:#4CAF50; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">Booking Confirmed!</h1>
          </div>

          <div style="padding:25px 30px;">
            <p style="font-size:16px; color:#333;">Hi <strong>${user.name}</strong>,</p>
            <p style="font-size:15px; color:#555;">Your booking <strong>#${booking_id}</strong> has been successfully confirmed. Below are your details:</p>

            <table style="width:100%; margin-top:15px; border-collapse:collapse; font-size:15px;">
              <tr><td style="padding:5px 0;"><strong>Date:</strong></td><td>${new Date(bookingDate).toLocaleDateString()}</td></tr>
              <tr><td style="padding:5px 0;"><strong>Time:</strong></td><td>${bookingTime}</td></tr>
              <tr><td style="padding:5px 0;"><strong>Promo Code:</strong></td><td>${promo_code || "None"}</td></tr>
              <tr><td style="padding:5px 0;"><strong>Promo Discount:</strong></td><td>₹${promo_discount || 0}</td></tr>
            </table>

            <h2 style="margin-top:25px; font-size:18px; color:#2c3e50;">Your Packages</h2>
            ${packagesHtml || "<p>No packages found.</p>"}

            ${receiptUrl ? `
              <div style="text-align:center; margin:30px 0 10px;">
                <a href="${receiptUrl}" style="background:#4CAF50; color:#fff; text-decoration:none; padding:12px 24px; font-size:16px; font-weight:600; border-radius:8px;">View Payment Receipt</a>
              </div>` : ""}
          </div>

          <div style="background:#f8f8f8; text-align:center; font-size:13px; color:#777; padding:15px;">
            <p style="margin:4px 0;">Thank you for choosing Homiqly!</p>
            <p style="margin:4px 0;">— The Homiqly Team</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Booking Confirmation #${booking_id}`,
      html: htmlBody,
      attachments: [
        { filename: 'homiqly.webp', path: pngPath, cid: cidName, contentDisposition: "inline" }
      ]
    });

    console.log(`📧 Booking confirmation email sent to ${user.email}`);
  } catch (err) {
    console.error("❌ Failed to send booking email:", err);
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

async function sendVendorApprovalMail({ vendorName, vendorEmail, plainPassword }) {
  try {
    // Logo path and CID
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";

    // Dynamically include password only if it exists (company vendors)
    const passwordSection = plainPassword
      ? `
        <ul style="margin:10px 0 20px 15px;">
          <li><strong>Vendor Email:</strong> ${vendorEmail}</li>
          <li><strong>Password:</strong> ${plainPassword}</li>
        </ul>
        <p style="color:#555;">Please reset your password after you log in to your profile.</p>
      `
      : `
        <p>You can now log in using your existing credentials and start accepting bookings.</p>
      `;

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header with logo -->
          <div style="background:#4CAF50; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">Welcome to Homiqly!</h1>
          </div>

          <!-- Body content -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello <strong>${vendorName}</strong>,</p>
            <p>We’re excited to welcome you to Homiqly, where beauty and convenience meet!</p>
            <p>Your registration has been approved, and you’re now part of our trusted network of service providers.</p>
            <p>You can now log in to your dashboard:</p>
            ${passwordSection}
            <p><a href="https://glistening-marigold-c9df83.netlify.app/vendor/login" style="color:#4CAF50; text-decoration:none;">Login to Dashboard</a></p>
            <p>Before you begin, make sure your profile, service details, and availability are updated.</p>
            <p>Welcome aboard!</p>
          </div>

          <!-- Footer -->
          <div style="background:#f8f8f8; text-align:center; font-size:13px; color:#777; padding:15px;">
            <p style="margin:4px 0;">Team Homiqly</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly" <${process.env.EMAIL_USER}>`,
      to: vendorEmail,
      subject: "Welcome to Homiqly! Your Application Has Been Approved",
      html: htmlBody,
      attachments: [
        {
          filename: "homiqly.webp",
          path: logoPath,
          cid: cidName,
          contentDisposition: "inline",
        },
      ],
    });

    console.log(`📧 Vendor approval email sent to: ${vendorName} (${vendorEmail})`);
  } catch (error) {
    console.error("❌ Failed to send vendor approval email:", error.message);
  }
}

async function sendVendorRejectionMail({ vendorName, vendorEmail }) {
  try {
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header with logo -->
          <div style="background:#f44336; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">Application Rejected</h1>
          </div>

          <!-- Body content -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello ${vendorName},</p>
            <p>We regret to inform you that your application to join Homiqly has been rejected.</p>
            <p>If you believe this is a mistake or would like more information, please contact our support team.</p>
          </div>

          <!-- Footer -->
          <div style="background:#f8f8f8; text-align:center; font-size:13px; color:#777; padding:15px;">
            <p style="margin:4px 0;">Best regards,</p>
            <p style="margin:4px 0;">Homiqly Team</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly Support" <${process.env.EMAIL_USER}>`,
      to: vendorEmail,
      subject: "Your Homiqly Application Has Been Rejected",
      html: htmlBody,
      attachments: [
        { filename: 'homiqly.webp', path: logoPath, cid: cidName, contentDisposition: "inline" }
      ]
    });

    console.log(`📧 Rejection email sent to ${vendorName} (${vendorEmail})`);
  } catch (err) {
    console.error("❌ Failed to send vendor rejection email:", err.message);
  }
}

async function sendPasswordUpdatedMail({ userName, userEmail }) {
  try {
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";
    const resetLink = "https://ts-homiqly-adminpanel.vercel.app/forgotpassword"; // update if needed

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background:#007BFF; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">Password Updated Successfully</h1>
          </div>

          <!-- Body -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>This is to confirm that your <strong>Homiqly</strong> account password has been successfully updated.</p>
            <p>If you did not make this change, please reset your password immediately using the link below:</p>
            <p>
              <a href="${resetLink}" 
                 style="display:inline-block; background:#007BFF; color:#fff; text-decoration:none; 
                        padding:10px 20px; border-radius:6px; font-weight:bold;">
                 Reset Password
              </a>
            </p>
            <p>Stay safe,</p>
            <p><strong>Homiqly Team</strong></p>
          </div>

          <!-- Footer -->
          <div style="background:#f0f3f8; text-align:center; font-size:13px; color:#555; padding:15px;">
            <p style="margin:4px 0;">If you have any questions, please contact <a href="mailto:support@homiqly.com" style="color:#007BFF; text-decoration:none;">support@homiqly.com</a></p>
            <p style="margin:4px 0;">&copy; ${new Date().getFullYear()} Homiqly. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly Security" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Password Updated Successfully",
      html: htmlBody,
      attachments: [
        {
          filename: "homiqly.webp",
          path: logoPath,
          cid: cidName,
          contentDisposition: "inline",
        },
      ],
    });

    console.log(`📧 Password update email sent to: ${userName} (${userEmail})`);
  } catch (error) {
    console.error("❌ Failed to send password update email:", error.message);
  }
}

async function sendPasswordResetCodeMail({ userEmail, code }) {
  try {
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background:#007BFF; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">Password Reset Request</h1>
          </div>

          <!-- Body -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello,</p>
            <p>We received a request to reset your <strong>Homiqly</strong> account password.</p>
            <p>Your password reset code is:</p>

            <div style="background:#f0f3ff; border:1px dashed #007BFF; border-radius:8px; 
                        text-align:center; padding:15px; font-size:24px; font-weight:bold; color:#007BFF; letter-spacing:3px;">
              ${code}
            </div>

            <p style="margin-top:15px;">⚠️ This code will expire in <strong>5 minutes</strong>. 
               If you didn’t request a password reset, you can safely ignore this email.</p>

            <p style="margin-top:20px;">Thanks,<br><strong>Homiqly Support Team</strong></p>
          </div>

          <!-- Footer -->
          <div style="background:#f0f3f8; text-align:center; font-size:13px; color:#555; padding:15px;">
            <p style="margin:4px 0;">Need help? Contact <a href="mailto:support@homiqly.com" style="color:#007BFF; text-decoration:none;">support@homiqly.com</a></p>
            <p style="margin:4px 0;">&copy; ${new Date().getFullYear()} Homiqly. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly Support" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Your Homiqly Password Reset Code",
      html: htmlBody,
      attachments: [
        {
          filename: "homiqly.webp",
          path: logoPath,
          cid: cidName,
          contentDisposition: "inline",
        },
      ],
    });

    console.log(`📧 Password reset code sent to: ${userEmail}`);
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error.message);
  }
}

async function sendUserVerificationMail({ firstname, userEmail, code }) {
  try {
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background:#007BFF; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">Verify Your Email</h1>
          </div>

          <!-- Body -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello <strong>${firstname}</strong>,</p>
            <p>Welcome to <strong>Homiqly!</strong> We’re thrilled to have you join our community.</p>
            <p>Before we get started, please verify your email address using the code below:</p>

            <div style="background:#f0f3ff; border:1px dashed #007BFF; border-radius:8px;
                        text-align:center; padding:15px; font-size:24px; font-weight:bold; color:#007BFF; letter-spacing:3px;">
              ${code}
            </div>

            <p style="margin-top:15px;">⚠️ This code is valid for <strong>5 minutes</strong>. If you didn’t request this verification, you can ignore this email.</p>
            <p style="margin-top:20px;">Once verified, you’ll be ready to explore personalized beauty and lifestyle services on Homiqly.</p>

            <p style="margin-top:20px;">Cheers,<br><strong>Team Homiqly</strong></p>
          </div>

          <!-- Footer -->
          <div style="background:#f0f3f8; text-align:center; font-size:13px; color:#555; padding:15px;">
            <p style="margin:4px 0;">Need help? Contact <a href="mailto:support@homiqly.com" style="color:#007BFF; text-decoration:none;">support@homiqly.com</a></p>
            <p style="margin:4px 0;">&copy; ${new Date().getFullYear()} Homiqly. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: `"Homiqly" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Verify Your Email - Homiqly Registration",
      html: htmlBody,
      attachments: [
        {
          filename: "homiqly.webp",
          path: logoPath,
          cid: cidName,
          contentDisposition: "inline",
        },
      ],
    });

    console.log(`📧 Verification email sent to: ${userEmail}`);
  } catch (error) {
    console.error("❌ Failed to send verification email:", error.message);
  }
}

async function sendReviewRequestMail({ userName, userEmail, serviceName, vendorName }) {
  try {
    const logoPath = path.resolve("config/media/homiqly.webp");
    const cidName = "homiqlyLogo";
    const reviewLink = `https://homiqly-h81s.vercel.app/Profile/history`;

    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background:#FF6F61; padding:20px; text-align:center;">
            <img src="cid:${cidName}" alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
            <h1 style="color:#fff; font-size:22px; margin:10px 0 0;">How Was Your Homiqly Experience?</h1>
          </div>

          <!-- Body -->
          <div style="padding:25px 30px; font-size:15px; color:#333;">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We hope you loved your recent <strong>${serviceName}</strong> service with <strong>${vendorName}</strong>!</p>
            <p>Your feedback helps us improve and recognize our top professionals.</p>

            <div style="text-align:center; margin:30px 0;">
              <a href="${reviewLink}" 
                 style="background:#FF6F61; color:#fff; padding:12px 28px; border-radius:30px; 
                 font-size:16px; text-decoration:none; font-weight:bold;">
                 👉 Leave a Review
              </a>
            </div>

            <p>Thank you for choosing Homiqly — beauty, comfort, and care at your doorstep.</p>
            <p>Warm regards,<br><strong>Team Homiqly</strong></p>
          </div>

          <!-- Footer -->
          <div style="background:#f0f3f8; text-align:center; font-size:13px; color:#555; padding:15px;">
            <p>&copy; ${new Date().getFullYear()} Homiqly. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Homiqly" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "How Was Your Homiqly Experience? 👉",
      html: htmlBody,
      attachments: [
        {
          filename: "homiqly.webp",
          path: logoPath,
          cid: cidName,
          contentDisposition: "inline",
        },
      ],
    });

    console.log(`📧 Review request sent to: ${userName} (${userEmail})`);
  } catch (error) {
    console.error("❌ Failed to send review request email:", error.message);
  }
}


async function sendVendorAssignedPackagesEmail({ vendorData, newlyAssigned }) {
  if (!vendorData?.vendorEmail) {
    console.warn("⚠️ No vendor email found, skipping email notification.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const emailHtml = `
            <p>Dear ${vendorData.vendorName},</p>
            <p>The following packages have been <strong>assigned to you</strong> by the admin:</p>
            <ul>
                ${newlyAssigned
        .map(
          (p) => `
                        <li>
                            <strong>Package:</strong> ${p.packageName} (ID: ${p.package_id}) <br/>
                            <strong>Sub-Packages:</strong> 
                            ${p.selected_subpackages.length > 0
              ? p.selected_subpackages
                .map((sp) => `${sp.name} (ID: ${sp.id})`)
                .join(", ")
              : "None"
            }
                        </li>`
        )
        .join("")}
            </ul>
            <p>You can now manage and offer these packages from your dashboard.</p>
        `;

    await transporter.sendMail({
      from: `"Admin Team" <${process.env.EMAIL_USER}>`,
      to: vendorData.vendorEmail,
      subject: "New Packages Assigned to You",
      html: emailHtml
    });

    console.log(`✅ Email sent to vendor ${vendorData.vendorEmail}`);
  } catch (mailErr) {
    console.error("⚠️ Failed to send vendor email:", mailErr.message);
  }
};

module.exports = {
  sendBookingEmail,
  sendVendorBookingEmail,
  sendAdminVendorRegistrationMail,
  sendVendorApprovalMail,
  sendVendorRejectionMail,
  sendPasswordUpdatedMail,
  sendPasswordResetCodeMail,
  sendUserVerificationMail,
  sendReviewRequestMail,
  sendVendorAssignedPackagesEmail

};