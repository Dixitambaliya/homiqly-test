const nodemailer = require("nodemailer");
const { db } = require('../../db');
const path = require('path')
const { sendMail } = require('../email/templates/nodemailer');
const moment = require('moment-timezone');


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

//done
const sendBookingEmail = async (user_id, { booking_id, receiptUrl }) => {
  try {
    // 🧩 Fetch user
    const [[user]] = await db.query(
      `SELECT CONCAT(firstName, ' ', lastName) AS name, email FROM users WHERE user_id = ? LIMIT 1`,
      [user_id]
    );
    if (!user) return console.warn(`⚠️ No user found for user_id ${user_id}`);

    // 🧩 Fetch booking + vendor + service details
    const [[booking]] = await db.query(
      `
      SELECT 
        sb.booking_id, sb.bookingDate, sb.bookingTime, sb.totalTime, sb.payment_status,
        sb.notes, sb.created_at, p.amount AS totalAmount,
        v.vendor_id,
        CASE WHEN v.vendorType = 'individual' THEN i.name ELSE c.companyName END AS vendorName,
        CASE WHEN v.vendorType = 'individual' THEN i.email ELSE c.companyEmail END AS vendorEmail,
        CASE WHEN v.vendorType = 'individual' THEN i.phone ELSE c.companyPhone END AS vendorPhone,
        s.serviceName, sc.serviceCategory
      FROM service_booking sb 
      LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
      LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
      LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
      LEFT JOIN services s ON sb.service_id = s.service_id
      LEFT JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
      LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
      WHERE sb.booking_id = ?
      LIMIT 1
      `,
      [booking_id]
    );
    if (!booking) return console.warn(`⚠️ No booking found for booking_id ${booking_id}`);

    // 🧾 Items, Addons, Preferences, and Concerns
    const [items] = await db.query(
      `SELECT pi.itemName, sbs.price, sbs.quantity
       FROM service_booking_sub_packages sbs
       JOIN package_items pi ON sbs.sub_package_id = pi.item_id
       WHERE sbs.booking_id = ?`,
      [booking_id]
    );

    const [addons] = await db.query(
      `SELECT pa.addonName, sba.price
       FROM service_booking_addons sba
       JOIN package_addons pa ON sba.addon_id = pa.addon_id
       WHERE sba.booking_id = ?`,
      [booking_id]
    );

    const [preferences] = await db.query(
      `SELECT pp.preferenceValue , pp.preferencePrice
       FROM service_booking_preferences sbp
       JOIN booking_preferences pp ON sbp.preference_id = pp.preference_id
       WHERE sbp.booking_id = ?`,
      [booking_id]
    );

    // Optional: only if you have a "concerns" table
    const [concerns] = await db.query(
      `SELECT pc.question , sbc.answer
       FROM service_booking_consents sbc
       JOIN package_consent_forms pc ON sbc.consent_id = pc.consent_id
       WHERE sbc.booking_id = ?`,
      [booking_id]
    );

    // 🧩 Build rows
    const buildRows = (data, rowFn, emptyText) =>
      data.length
        ? data.map(rowFn).join("")
        : `<tr><td colspan="3" style="padding:10px; text-align:center; border:1px solid #ddd;">${emptyText}</td></tr>`;

    const itemRows = buildRows(items, (i) => `
      <tr>
        <td style="padding:10px; border:1px solid #ddd;">${i.itemName}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${i.quantity}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:right;">₹${i.price}</td>
      </tr>`, "No items found");

    const addonRows = buildRows(addons, (a) => `
      <tr>
        <td style="padding:10px; border:1px solid #ddd;" colspan="2">${a.addonName}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:right;">₹${a.price}</td>
      </tr>`, "No addons selected");

    const preferenceRows = buildRows(preferences, (p) => `
      <tr>
        <td style="padding:10px; border:1px solid #ddd;">${p.preferenceValue}</td>
        <td style="padding:10px; border:1px solid #ddd; text-align:right;">${p.preferencePrice}</td>
      </tr>`, "No preferences set");

    const concernRows = buildRows(concerns, (c) => `
      <tr>
      <td style="padding:10px; border:1px solid #ddd;">${c.question}
      <td style="padding:10px; border:1px solid #ddd; text-align:right;">${c.answer}
      </td>
      </tr>`, "No concerns listed");

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #ffffff; padding: 35px 40px;">
        <h2 style="text-align:center; color:#333;">Booking Confirmed</h2>
        <p style="font-size:15px; color:#555;">Hi <strong>${user.name}</strong>, your booking has been confirmed!</p>

        <h3 style="margin-top:30px;">Booking Details</h3>
        <table style="width:100%; border-collapse: collapse; font-size:14px;">
          <tr><td><strong>Service:</strong></td><td>${booking.serviceName}</td></tr>
          <tr><td><strong>Category:</strong></td><td>${booking.serviceCategory}</td></tr>
          <tr><td><strong>Date:</strong></td><td>${moment(booking.bookingDate).format("MMM DD, YYYY")}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A")}</td></tr>
          <tr><td><strong>Total Duration:</strong></td><td>${booking.totalTime || 0} mins</td></tr>
        </table>

        <h3 style="margin-top:25px;">Vendor Details</h3>
        <table style="width:100%; border-collapse: collapse; border:1px solid #ddd;">
          <tr><td><strong>Name:</strong></td><td>${booking.vendorName || "N/A"}</td></tr>
          <tr><td><strong>Email:</strong></td><td>${booking.vendorEmail || "N/A"}</td></tr>
          <tr><td><strong>Phone:</strong></td><td>${booking.vendorPhone || "N/A"}</td></tr>
        </table>

        <h3 style="margin-top:25px;">Selected Packages</h3>
        <table style="width:100%; border-collapse: collapse; border:1px solid #ddd;">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>

        <h3 style="margin-top:25px;">Addons</h3>
        <table style="width:100%; border-collapse: collapse; border:1px solid #ddd;">
          <thead><tr><th colspan="2">Addon</th><th>Price</th></tr></thead>
          <tbody>${addonRows}</tbody>
        </table>

        <h3 style="margin-top:25px;">Preferences</h3>
        <table style="width:100%; border-collapse: collapse; border:1px solid #ddd;">
          <thead><tr><th>Preference</th><th>Selected</th></tr></thead>
          <tbody>${preferenceRows}</tbody>
        </table>

        <!-- Uncomment if concerns exist -->
        <!-- <h3 style="margin-top:25px;">Concerns</h3>
        <table style="width:100%; border-collapse: collapse; border:1px solid #ddd;">
          <tbody>${concernRows}</tbody>
        </table> -->

        <p style="margin-top:25px; text-align:right; font-size:16px;">
          <strong>Total:</strong> ₹${booking.totalAmount || "N/A"}
        </p>

        ${receiptUrl
        ? `<p style="text-align:center; margin-top:20px;">
               <a href="${receiptUrl}" style="background:#000; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none;">View Receipt</a>
             </p>` : ""
      }
      </div>
    `;

    await sendMail({
      to: user.email,
      subject: "Your Booking is Confirmed",
      bodyHtml,
    });

    console.log(`📧 Booking email sent to ${user.email} for booking #${booking_id}`);
  } catch (err) {
    console.error("⚠️ Failed to send booking email:", err.message);
  }
};

//done
const sendVendorBookingEmail = async (vendor_id, { booking_id, receiptUrl }) => {
  try {
    // 🔹 Get vendor email/name from individual or company table
    const [[vendor]] = await db.query(
      `SELECT 
        CASE WHEN v.vendorType = 'individual' THEN i.email ELSE c.companyEmail END AS email,
        CASE WHEN v.vendorType = 'individual' THEN i.name ELSE c.companyName END AS name
       FROM vendors v
       LEFT JOIN individual_details i ON v.vendor_id = i.id
       LEFT JOIN company_details c ON v.vendor_id = c.id
       WHERE v.vendor_id = ? LIMIT 1`,
      [vendor_id]
    );

    if (!vendor) return console.warn(`⚠️ No vendor found for vendor_id ${vendor_id}`);

    // 🔹 Booking + user info
    const [[booking]] = await db.query(
      `SELECT 
        sb.booking_id, sb.bookingDate, sb.bookingTime, sb.totalTime, sb.notes,
        u.firstName AS userFirstName, u.lastName AS userLastName, u.email AS userEmail,
        s.serviceName, sc.serviceCategory, p.amount AS totalAmount
      FROM service_booking sb
      LEFT JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN services s ON sb.service_id = s.service_id
      LEFT JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
      LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
      WHERE sb.booking_id = ? LIMIT 1`,
      [booking_id]
    );

    if (!booking) return console.warn(`⚠️ No booking found for booking_id ${booking_id}`);

    // 🔹 Package items
    const [items] = await db.query(
      `SELECT pi.itemName, sbs.price, sbs.quantity
       FROM service_booking_sub_packages sbs
       JOIN package_items pi ON sbs.sub_package_id = pi.item_id
       WHERE sbs.booking_id = ?`,
      [booking_id]
    );

    // 🔹 Addons
    const [addons] = await db.query(
      `SELECT pa.addonName, sba.price
       FROM service_booking_addons sba
       JOIN package_addons pa ON sba.addon_id = pa.addon_id
       WHERE sba.booking_id = ?`,
      [booking_id]
    );

    // 🔹 Preferences
    const [preferences] = await db.query(
      `SELECT pp.preferencePrice, pp.preferenceValue
       FROM service_booking_preferences sbp
       JOIN booking_preferences pp ON sbp.preference_id = pp.preference_id
       WHERE sbp.booking_id = ?`,
      [booking_id]
    );

    // 🔹 Concerns (concepts)
    const [concerns] = await db.query(
      `SELECT pc.question , sbc.answer
       FROM service_booking_consents sbc
       JOIN package_consent_forms pc ON sbc.consent_id = pc.consent_id
       WHERE sbc.booking_id = ?`,
      [booking_id]
    );

    // 🔹 Helper to build rows
    const buildRows = (data, rowFn, emptyText) =>
      data.length
        ? data.map(rowFn).join("")
        : `<tr><td colspan="3" style="padding:10px; text-align:center; border:1px solid #ddd;">${emptyText}</td></tr>`;

    const itemRows = buildRows(
      items,
      (i) => `
        <tr>
          <td style="padding:10px; border:1px solid #ddd;">${i.itemName}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${i.quantity}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">₹${i.price}</td>
        </tr>`,
      "No items"
    );

    const addonRows = buildRows(
      addons,
      (a) => `
        <tr>
          <td colspan="2" style="padding:10px; border:1px solid #ddd;">${a.addonName}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">₹${a.price}</td>
        </tr>`,
      "No addons"
    );

    const preferenceRows = buildRows(
      preferences,
      (p) => `
        <tr>
          <td style="padding:10px; border:1px solid #ddd;">${p.preferenceValue}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">${p.preferencePrice}</td>
        </tr>`,
      "No preferences"
    );

    const concernRows = buildRows(
      concerns,
      (c) => `
        <tr>
          <td style="padding:10px; border:1px solid #ddd;">${c.question}</td>
          <td style="padding:10px; border:1px solid #ddd;text-align:right;">${c.answer}</td>
        </tr>`,
      "No concerns"
    );

    // 🔹 Email HTML content
    const bodyHtml = `
      <div style="font-family:Arial, sans-serif; background:#fff; padding:30px;">
        <h2 style="text-align:center;">New Booking Received</h2>
        <p>Hi <strong>${vendor.name}</strong>, you’ve received a new booking from 
        <strong>${booking.userFirstName} ${booking.userLastName}</strong> (${booking.userEmail}).</p>

        <h3>Booking Details</h3>
        <table style="font-size:14px; border-collapse:collapse;">
          <tr><td><strong>Service:</strong></td><td>${booking.serviceName}</td></tr>
          <tr><td><strong>Category:</strong></td><td>${booking.serviceCategory}</td></tr>
          <tr><td><strong>Date:</strong></td><td>${moment(booking.bookingDate).format("MMM DD, YYYY")}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A")}</td></tr>
        </table>

        <h3 style="margin-top:20px;">Selected Packages</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>

        <h3 style="margin-top:20px;">Addons</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
          <thead><tr><th colspan="2">Addon</th><th>Price</th></tr></thead>
          <tbody>${addonRows}</tbody>
        </table>

        <h3 style="margin-top:20px;">Preferences</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
          <thead><tr><th>Preference</th><th>Selected</th></tr></thead>
          <tbody>${preferenceRows}</tbody>
        </table>

        <h3 style="margin-top:20px;">Concerns</h3>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
          <thead><tr><th>Concern</th></tr></thead>
          <tbody>${concernRows}</tbody>
        </table>

        <p style="margin-top:25px; text-align:right; font-size:16px;">
          <strong>Total:</strong> ₹${booking.totalAmount || "N/A"}
        </p>
        ${receiptUrl
        ? `<p style="text-align:center; margin-top:20px;">
                <a href="${receiptUrl}" style="background:#000; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none;">View Receipt</a>
              </p>` : ""
      }
      </div>

    `;

    // 🔹 Send mail
    await sendMail({
      to: vendor.email,
      subject: "New Booking Received",
      bodyHtml,
    });

    console.log(`📧 Vendor email sent to ${vendor.email} for booking #${booking_id}`);
  } catch (err) {
    console.error("⚠️ Failed to send vendor booking email:", err.message);
  }
};


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