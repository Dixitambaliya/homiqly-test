const nodemailer = require("nodemailer");
const { db } = require('../../db');
const path = require('path')
const { sendMail } = require('../email/templates/nodemailer');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

//done
const sendUserWelcomeMail = async ({ userEmail, firstName }) => {
  if (!userEmail) return console.warn("⚠️ No email provided for welcome mail");

  const subject = "Welcome to the Homiqly community";

  const bodyHtml = `
  <div style="padding: 35px 30px; font-size: 15px; color: #333; max-width: 480px;">
    <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 10px;">
      Welcome to Homiqly, ${firstName || "there"}!
    </h2>

    <p style="font-size: 15px; line-height: 1.6; color: #444;">
      We’re thrilled to have you join our community. Discover trusted vendors, explore personalized services, and make your life easier — all from one platform.
    </p>

    <p style="font-size: 14px; color: #555; margin-top: 15px;">
      Start exploring now and enjoy exclusive offers curated just for you.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="https://www.homiqly.com" style="background:#000000;color:white;padding:12px 24px;border-radius:5px;text-decoration:none;font-weight:600;display:inline-block;">
        Explore Homiqly
      </a>
    </div>

    <p style="font-size: 14px; color: #555; margin-top: 20px;">
      Thanks for joining us,<br/>
      <strong>The Homiqly Team</strong>
    </p>
    </div>
  `;

  await sendMail({
    to: userEmail,
    subject,
    bodyHtml,
  });
};

//done
const sendAdminVendorRegistrationMail = async ({ vendorType, vendorName, vendorEmail, vendorCity, vendorService }) => {
  try {
    // 📬 1. Fetch admin emails
    const [adminEmails] = await db.query("SELECT email FROM admin WHERE email IS NOT NULL");
    if (!adminEmails.length) return console.warn("⚠️ No admin emails found.");

    const emailAddresses = adminEmails.map((row) => row.email);

    // 🧩 2. Build email content (body only, header/footer added by sendMail)
    const bodyHtml = `
      <div style="padding: 35px 30px; font-size: 15px; color: #333; max-width: 480px">
        <h2 style="font-size: 20px; color: #222; text-align: o; margin-bottom: 20px;">
          New Vendor Registration
        </h2>

        <p style="margin-bottom: 15px;">
          Hello <strong>Homiqly Admin Team</strong>,
        </p>

        <p style="margin-bottom: 15px;">
          A new service provider has just registered on <strong>Homiqly</strong>!
        </p>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 15px 20px; margin: 20px 0;">
          <p style="font-weight: 600; margin-bottom: 8px;">Vendor Details:</p>
          <ul style="line-height: 1.8; padding-left: 20px; margin: 0;">
            <li><strong>Type:</strong> ${vendorType}</li>
            <li><strong>Name:</strong> ${vendorName}</li>
            <li><strong>Email:</strong> ${vendorEmail}</li>
            <li><strong>City:</strong> ${vendorCity || "N/A"}</li>
            <li><strong>Service Category:</strong> ${vendorService || "N/A"}</li>
          </ul>
        </div>

        <p style="margin-top: 20px;">
          Please review their profile and documentation to proceed with verification.
        </p>

        <p style="margin-top: 25px;">
          Best regards,<br/>
          <strong>The Homiqly Team</strong>
        </p>
      </div>
    `;

    // ✉️ 3. Send mail through common utility (adds header/footer + logo automatically)
    await sendMail({
      to: emailAddresses,
      subject: "New Service Provider Registred on Homiqly",
      bodyHtml,
    });

    console.log(`📧 Admin notified about new vendor: ${vendorName}`);
  } catch (error) {
    console.error("❌ Failed to send admin vendor registration email:", error.message);
  }
};


const sendBookingEmail = async ({ user_id, bookingDetails }) => {
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

    // ✅ Use reusable header/footer
    const { html: headerHtml, logoPath, cidName } = emailHeader();
    const { html: footerHtml, footerLogoPath, cidFooterLogo } = emailFooter();

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

    // 📄 Combine all HTML sections
    const htmlBody = `
      <div style="font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
          
          ${headerHtml}

          <div style="padding:25px 30px;">
            <h2 style="color:#4CAF50; text-align:center;">Booking Confirmed!</h2>
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

          ${footerHtml}
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `<${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Booking Confirmation #${booking_id}`,
      html: htmlBody,
      attachments: [
        { filename: "homiqly.png", path: logoPath, cid: cidName, contentDisposition: "inline" },
        { filename: "Homiqly_Transparent_White.png", path: footerLogoPath, cid: cidFooterLogo, contentDisposition: "inline" },
      ]
    });

    console.log(`📧 Booking confirmation email sent to ${user.email}`);
  } catch (err) {
    console.error("❌ Failed to send booking email:", err);
  }
};


const sendVendorBookingEmail = async ({ vendor_id, bookingDetails }) => {
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
      from: `<${process.env.EMAIL_USER}>`,
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

const sendVendorApprovalMail = async ({ vendorName, vendorEmail, plainPassword }) => {
  try {
    // 🧩 Conditionally include login credentials (for company vendors)
    const passwordSection = plainPassword
      ? `
        <div style="background:#f9f9f9; border-radius:8px; padding:15px 20px; margin:20px 0;">
          <p style="margin:0 0 10px 0; font-weight:600;">Your Login Credentials:</p>
          <ul style="line-height:1.8; padding-left:20px; margin:0;">
            <li><strong>Email:</strong> ${vendorEmail}</li>
            <li><strong>Password:</strong> ${plainPassword}</li>
          </ul>
        </div>
        <p style="color:#555; margin-top:10px;">Please reset your password after your first login for security.</p>
      `
      : `
        <p>You can now log in using your existing credentials and start accepting bookings.</p>
      `;

    // 🧠 Build email body (header/footer are automatically added by sendMail)
    const bodyHtml = `
      <div style="padding: 35px 30px; font-size: 15px; color: #333;">
        <h2 style="font-size: 20px; font-weight: 600; color: #222; text-align: center; margin-bottom: 20px;">
          🎉 Congratulations, ${vendorName}!
        </h2>

        <p style="margin-bottom: 15px;">
          We’re excited to welcome you to <strong>Homiqly</strong> — where beauty and convenience meet!
        </p>

        <p>Your registration has been <strong>approved</strong>, and you’re now part of our trusted network of service providers.</p>

        ${passwordSection}

        <p style="margin:20px 0;">
          <a href="https://glistening-marigold-c9df83.netlify.app/vendor/login"
            style="background:#4CAF50; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:600;">
            Login to Dashboard
          </a>
        </p>

        <p style="margin-top:20px;">
          Before you begin, make sure your <strong>profile</strong>, <strong>service details</strong>, and <strong>availability</strong> are updated.
        </p>

        <p style="margin-top:25px;">
          Welcome aboard and we’re thrilled to have you on the Homiqly platform!<br/>
          <strong>— The Homiqly Team</strong>
        </p>
      </div>
    `;

    // ✉️ Send via global sendMail utility (adds header + footer automatically)
    await sendMail({
      to: vendorEmail,
      subject: "Welcome to Homiqly community! Your Application Has Been Approved",
      bodyHtml,
    });

    console.log(`📧 Vendor approval email sent to: ${vendorName} (${vendorEmail})`);
  } catch (error) {
    console.error("❌ Failed to send vendor approval email:", error.message);
  }
};

const sendVendorRejectionMail = async ({ vendorName, vendorEmail }) => {
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
      from: `<${process.env.EMAIL_USER}>`,
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

const sendPasswordUpdatedMail = async ({ userName, userEmail }) => {
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
      from: `<${process.env.EMAIL_USER}>`,
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

const sendPasswordResetCodeMail = async ({ userEmail, code }) => {
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
      from: `<${process.env.EMAIL_USER}>`,
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

//done
const sendUserVerificationMail = async ({ userEmail, code, subject }) => {
  try {
    const bodyHtml = `
      <div style="padding: 30px 34px; text-align:left; max-width: 480px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #000;">
          ${subject?.toLowerCase().includes("back")
        ? "Welcome back to the Homiqly community"
        : "Welcome to the Homiqly community"
      }
        </h2>

        <p style="font-size: 15px; line-height: 1.6; color: #444; text-align:left">
          We’re thrilled to have you join us! Please verify your account using the code below.
        </p>

        <!-- OTP Box -->
        <div style="text-align:left; margin: 20px 0;">
          <div style="
            display: inline-block;
            font-size: 16px;
            font-weight: 600;
            color: #000;
            letter-spacing: 3px;
            padding: 6px 14px;
            border: 1.3px dotted #000;
            border-radius: 6px;
          ">
            ${code}
          </div>
        </div>

        <p style="font-size: 14px; color: #555; margin-top: 20px;">
          This code is valid for <strong>5 minutes</strong>. If you didn’t request this, you can safely ignore this email.
        </p>

        <p style="font-size: 14px; color: #555; margin-top: 25px;">
          Thanks for being part of our community,<br/>
          <strong>The Homiqly Team</strong>
        </p>
      </div>
    `;

    // ✉️ Send the mail using your reusable wrapper
    await sendMail({
      to: userEmail,
      subject,
      bodyHtml,
    });

    console.log(`📧 Verification email sent to ${userEmail}`);
  } catch (error) {
    console.error("❌ Error sending verification mail:", error.message);
  }
};


const sendReviewRequestMail = async ({ userName, userEmail, serviceName, vendorName }) => {
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
      from: `<${process.env.EMAIL_USER}>`,
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

//done
const assignWelcomeCode = async ({ user_id, user_email }) => {
  try {
    // ✅ 1. Check if auto-assign is enabled
    const [setting] = await db.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'AUTO_ASSIGN_WELCOME_CODE'"
    );

    if (!setting[0] || setting[0].setting_value != 1) {
      console.log("⚙️ Auto-assign welcome code is disabled");
      return null;
    }

    // ✅ 2. Check if user already has a promo assigned
    const [existing] = await db.query(
      "SELECT * FROM system_promo_codes WHERE user_id = ?",
      [user_id]
    );

    if (existing.length > 0) {
      console.log("ℹ️ User already has a promo code assigned");
      return null;
    }

    // ✅ 3. Get the active welcome promo template
    const [templates] = await db.query(
      "SELECT * FROM system_promo_code_templates WHERE is_active = 1 AND source_type = 'system' LIMIT 1"
    );

    if (!templates || templates.length === 0) {
      console.log("⚠️ No active promo template found");
      return null;
    }

    const template = templates[0];
    const { system_promo_code_template_id, code, discountValue, maxUse } = template;

    console.log("Assigning template:", { user_id, system_promo_code_template_id, code });

    // ✅ 4. Assign promo to user
    await db.query(
      `INSERT INTO system_promo_codes (user_id, template_id, usage_count)
       VALUES (?, ?, 0)`,
      [user_id, system_promo_code_template_id]
    );

    console.log(`✅ Promo template '${code}' assigned to user ID: ${user_id}`);

    // ✅ 5. Send email (using sendMail helper)
    if (user_email) {
      const subject = "Welcome to Homiqly community! Your Promo Code Inside";
      const bodyHtml = `
              <div style="padding: 30px; font-size: 15px; color: #333; text-align: left;">
                <h2 style="font-weight: 600; margin-bottom: 10px; font-size: 20px; color: #111;">
                  We're excited to have you onboard!
                </h2>

                <h3 style="font-weight: 500; margin-bottom: 20px; font-size: 16px; color: #333;">
                  As a warm welcome, here’s your exclusive promo code:
                </h3>

                <div style="text-align: center; margin: 25px 0;">
                  <div style="
                  display: inline-block;
                  font-size: 16px;
                  font-weight: 600;
                  color: #000;
                  letter-spacing: 3px;
                  padding: 6px 14px;
                  border: 1.3px dotted #000;
                  border-radius: 6px;
                  ">
                   ${code}
                  </div>
                </div>

                <p style="font-size: 15px; color: #555; margin-top: 10px; line-height: 1.6;">
                  <strong>Discount:</strong> ${discountValue}%<br/>
                  <strong>Max Use:</strong> ${maxUse}
                </p>

                <p style="font-size: 14px; color: #555; margin-top: 15px; line-height: 1.6;">
                  Use this code on your next booking and enjoy great savings on our platform.
                </p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://www.homiqly.com"
                    style="background: #000; color: #fff; padding: 12px 28px; border-radius: 5px;
                          text-decoration: none; font-weight: 600; display: inline-block;">
                    Explore Homiqly
                  </a>
                </div>

                <p style="font-size: 14px; color: #555; margin-top: 25px; line-height: 1.6;">
                  Thanks for being part of the Homiqly community,<br/>
                  <strong>The Homiqly Team</strong>
                </p>
              </div>
`;


      await sendMail({
        to: user_email,
        subject,
        bodyHtml,
      });

      console.log(`📧 Welcome promo email sent to ${user_email}`);
    }

    return code;
  } catch (err) {
    console.error("❌ Error assigning welcome promo code:", err.message);
    return null;
  }
};

const sendVendorAssignedPackagesEmail = async ({ vendorData, newlyAssigned }) => {
  if (!vendorData?.vendorEmail) {
    console.warn("⚠️ No vendor email found, skipping email notification.");
    return;
  }

  try {

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
      from: `<${process.env.EMAIL_USER}>`,
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
  assignWelcomeCode,
  sendVendorAssignedPackagesEmail,
  sendUserWelcomeMail

};