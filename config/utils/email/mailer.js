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
const sendUserWelcomeMail = async ({ userEmail, firstName, lastName, fullName }) => {
    if (!userEmail) return console.warn("⚠️ No email provided for welcome mail");

    const subject = "Welcome to the Homiqly community";

    const bodyHtml = `
    <div style="background-color: #ffffff; ">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
        <tr>
          <td style="padding:5px 40px 40px; font-family: Arial, sans-serif; text-align: left;">
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 15px; color: #222;">
             ${fullName || firstName || "Hello"},
             Welcome to the Homiqly community - we’re thrilled to have you on board!
            </h2>

            <p style="font-size: 15px; line-height: 1.6; color: #444; margin-bottom: 15px;">
              Your account is all set up and ready to go. Log in anytime to discover tailored services, connect with trusted experts, and start your journey with Homiqly.
            </p>

            <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px;">
              Got a question before you dive in? Our support team is always here to help - just visit
              <a href="https://www.homiqly.com/help" style="color: #4da3ff; text-decoration: none;">Homiqly Help</a>
              or reach out directly through the Help section in your dashboard.
            </p>

            <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px;">
              Thanks for joining us - we can’t wait for you to experience everything Homiqly has to offer.
            </p>

            <p style="font-size: 14px; color: #555; margin-bottom: 25px;">
              Here’s to your next step,
            </p>

            <p style="font-size: 16px; color: #333; margin-top: 0;">
              <strong>The Homiqly Team</strong>
            </p>
          </td>
        </tr>
      </table>
  `;


    await sendMail({
        to: userEmail,
        subject,
        bodyHtml,
        layout: "welcomeMail",
    });
};

//done
const sendAdminVendorRegistrationMail = async ({ vendorType, vendorName, vendorEmail, vendorCity, vendorService }) => {
    try {
        // 1️⃣ Fetch admin emails
        const [adminEmails] = await db.query("SELECT email FROM admin WHERE email IS NOT NULL");
        if (!adminEmails.length) return console.warn("⚠️ No admin emails found.");

        const emailAddresses = adminEmails.map((row) => row.email);
        const subject = "New Service Provider Registered on Homiqly";

        const bodyHtml = `
        <div style="padding: 35px 30px; font-size: 15px; color: #333; background-color: #ffffff; max-width: 570px; margin: 0 auto; line-height: 1.6;">
          <h2 style="font-size: 20px; color: #000; margin-bottom: 20px;">
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

        await sendMail({
            to: emailAddresses,
            subject,
            bodyHtml,
            layout: "vendorNotificationMail"
        });

        console.log(`📧 Admin notified about new vendor: ${vendorName}`);
    } catch (error) {
        console.error("❌ Failed to send admin vendor registration email:", error.message);
    }
};

//done
const sendBookingEmail = async (user_id, { booking_id, receiptUrl }) => {
    try {
        // ---------------------------
        // 1) USER
        // ---------------------------
        const [[user]] = await db.query(
            `SELECT firstName, lastName, email
             FROM users WHERE user_id = ? LIMIT 1`,
            [user_id]
        );

        if (!user) return console.warn(`⚠️ No user found for user_id ${user_id}`);

        const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Valued Customer";

        // ---------------------------
        // 2) BOOKING MAIN DETAILS
        // ---------------------------
        const [[booking]] = await db.query(
            `
            SELECT booking_id, bookingDate, bookingTime, user_promo_code_id
            FROM service_booking
            WHERE booking_id = ? LIMIT 1
            `,
            [booking_id]
        );

        if (!booking) return console.warn(`⚠️ No booking found for booking_id ${booking_id}`);

        const bookingDateFormatted = moment(booking.bookingDate).format("MMM DD, YYYY");
        const bookingTimeFormatted = moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A");

        // ---------------------------
        // 3) FINAL TOTALS
        // ---------------------------
        const [[bookingTotals]] = await db.query(
            `
            SELECT subtotal, promo_discount, tax_amount, final_total
            FROM booking_totals
            WHERE booking_id = ? LIMIT 1
            `,
            [booking_id]
        );

        if (!bookingTotals) {
            console.warn(`⚠️ No booking_totals found for booking_id ${booking_id}`);
            return;
        }

        const subtotal = Number(bookingTotals.subtotal);
        const promoDiscount = Number(bookingTotals.promo_discount);
        const taxAmount = Number(bookingTotals.tax_amount);
        const finalTotal = Number(bookingTotals.final_total);

        // ---------------------------
        // 4) CURRENCY DETECTION
        // ---------------------------
        const [[payoutRow]] = await db.query(
            `SELECT currency FROM vendor_payouts WHERE booking_id = ? LIMIT 1`,
            [booking_id]
        );

        const currency = (payoutRow?.currency || "CA$").toUpperCase();
        const currencySymbol = (cur) => {
            const map = { INR: "₹", USD: "$", CAD: "CA$", EUR: "€", GBP: "£" };
            return map[cur] || cur + " ";
        };
        const curSym = currencySymbol(currency);

        // ---------------------------
        // 5) FETCH PACKAGES + ADDONS + PREFS
        // ---------------------------

        // PACKAGES (sub-packages)
        const [packages] = await db.query(
            `
            SELECT
                sbs.sub_package_id,
                sbs.quantity,
                sbs.price,
                pi.itemName
            FROM service_booking_sub_packages sbs
            JOIN package_items pi ON sbs.sub_package_id = pi.item_id
            WHERE sbs.booking_id = ?
            `,
            [booking_id]
        );

        // ADDONS linked via sub_package_id
        const [addons] = await db.query(
            `
            SELECT
                sba.sub_package_id,
                sba.addon_id,
                sba.price,
                pa.addonName
            FROM service_booking_addons sba
            JOIN package_addons pa ON sba.addon_id = pa.addon_id
            WHERE sba.booking_id = ?
            `,
            [booking_id]
        );

        // PREFS linked via sub_package_id
        const [prefs] = await db.query(
            `
            SELECT
                bp.sub_package_id,
                pm.preferencePrice,
                pm.preferenceValue
            FROM service_booking_preferences bp
            JOIN booking_preferences pm ON bp.preference_id = pm.preference_id
            WHERE bp.booking_id = ?
            `,
            [booking_id]
        );

        // ---------------------------
        // 6) BUILD RECEIPT ROWS (MULTIPLIED)
        // ---------------------------

        let receiptRows = "";

        for (let pkg of packages) {
            const pkgQty = Number(pkg.quantity);
            const pkgTotal = pkgQty * Number(pkg.price);

            // package row
            receiptRows += `
                <tr>
                    <td width="70%" style="padding:4px 0;">${pkg.itemName} ×${pkgQty}</td>
                    <td width="30%" style="text-align:right; font-weight:600;">
                        ${curSym}${pkgTotal.toFixed(2)}
                    </td>
                </tr>
            `;

            // ADDONS under this package
            const pkgAddons = addons.filter(a => a.sub_package_id === pkg.sub_package_id);
            for (let a of pkgAddons) {
                const addonTotal = pkgQty * Number(a.price);
                receiptRows += `
                    <tr>
                        <td width="70%" style="padding:2px 0; color:#000;">• ${a.addonName}</td>
                        <td width="30%" style="text-align:right;">
                            ${curSym}${addonTotal.toFixed(2)}
                        </td>
                    </tr>
                `;
            }

            // PREFS under this package
            const pkgPrefs = prefs.filter(p => p.sub_package_id === pkg.sub_package_id);
            for (let p of pkgPrefs) {
                const prefTotal = pkgQty * Number(p.preferencePrice);
                receiptRows += `
                    <tr>
                        <td width="70%" style="padding:2px 0; color:#000;">• ${p.preferenceValue}</td>
                        <td width="30%" style="text-align:right;">
                            ${curSym}${prefTotal.toFixed(2)}
                        </td>
                    </tr>
                `;
            }
        }

        // ---------------------------
        // 7) EMAIL UI (Apple style)
        // ---------------------------
        const bodyHtml = `
<div style="background:#fff; font-family:Arial, sans-serif; padding:30px;">

   <!-- Main Heading -->
            <h1 style="font-size: 20px; font-weight: bold; color: #000000; margin: 5px 0 8px; line-height: 1.3;">
                Hello <strong> ${userName || "Valued Customer"}</strong>, your booking with Homiqly is confirmed!
            </h1>

            <p style="color: #000000; font-size: 15px; line-height: 1.6; margin: 0;">
                We are scheduled to bring the beauty studio to your home on
            </p>
            <span>${bookingDateFormatted} at ${bookingTimeFormatted}.</span>
            <p style="color: #000000; font-size: 15px; line-height: 1.6; margin-top: 20px;">
               <span>( #${booking_id || " "} )</span>
             </p>

    <!-- TOP TOTAL -->
    <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">
        <tr>
            <td style="font-size:20px; font-weight:bold;">Total</td>
            <td style="text-align:right; font-size:22px; font-weight:bold;">
                ${curSym}${finalTotal.toFixed(2)}
            </td>
        </tr>
        <tr>
            <td></td>
            <td style="text-align:right; font-size:12px; color:#666;">
                You saved ${curSym}${promoDiscount.toFixed(2)} with promos
            </td>
        </tr>
    </table>

    <hr style="border:none; border-top:1px solid #000; margin:10px 0;" />

    <div style="font-size:14px; margin-bottom:12px;">For ${userName}</div>

    <!-- ITEMS + ADDONS + PREFS -->
    <table width="100%" cellspacing="0" cellpadding="5" style="font-size:14px;">
        ${receiptRows}
    </table>

    <hr style="border:none; border-top:1px solid #000; margin:15px 0;" />

    <!-- FINAL BREAKDOWN -->
    <table width="100%" cellspacing="0" cellpadding="5" style="font-size:14px;">
        <tr>
            <td width="70%">Subtotal</td>
            <td width="30%" style="text-align:right; font-weight:600;">
                ${curSym}${subtotal.toFixed(2)}
            </td>
        </tr>

        <tr>
            <td width="70%">Promo Discount</td>
            <td width="30%" style="text-align:right; font-weight:600; color:red;">
                -${curSym}${promoDiscount.toFixed(2)}
            </td>
        </tr>

        <tr>
            <td width="70%">Taxes</td>
            <td width="30%" style="text-align:right; font-weight:600;">
                ${curSym}${taxAmount.toFixed(2)}
            </td>
        </tr>

        <tr><td colspan="2"><hr style="border:none; border-top:1px solid #ccc;" /></td></tr>

        <tr>
            <td width="70%" style="font-weight:bold;">Total Charged</td>
            <td width="30%" style="text-align:right; font-weight:bold; font-size:16px;">
                ${curSym}${finalTotal.toFixed(2)}
            </td>
        </tr>
    </table>

</div>
        `;

        // ---------------------------
        // 8) SEND EMAIL
        // ---------------------------
        await sendMail({
            to: user.email,
            subject: "Your Booking is Confirmed!",
            bodyHtml,
            layout: "userBookingMail",
            extraData: {
                booking_id,
                userName,
                bookingDateFormatted,
                bookingTimeFormatted,
                receiptUrl
            },
        });

        console.log(`📧 Booking email sent to ${user.email} for booking #${booking_id}`);
    } catch (err) {
        console.error("⚠️ Failed to send booking email:", err.message);
    }
};

//done
const sendVendorBookingEmail = async (vendor_id, { booking_id }) => {
    try {
        // 🧩 Fetch vendor info
        const [[vendor]] = await db.query(`
            SELECT
              CASE WHEN v.vendorType = 'individual' THEN i.email ELSE c.companyEmail END AS email,
              CASE WHEN v.vendorType = 'individual' THEN i.name ELSE c.companyName END AS name
            FROM vendors v
            LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
            LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
            WHERE v.vendor_id = ? LIMIT 1
        `, [vendor_id]);

        if (!vendor) return console.warn(`⚠️ No vendor found for vendor_id ${vendor_id}`);

        // 🧩 Fetch booking details
        const [[booking]] = await db.query(`
            SELECT
              sb.booking_id, sb.bookingDate, sb.bookingTime, sb.totalTime, sb.notes, sb.created_at,
              u.firstName AS userFirstName, u.lastName AS userLastName, u.address AS userAddress,
              s.serviceName, sc.serviceCategory
            FROM service_booking sb
            LEFT JOIN users u ON sb.user_id = u.user_id
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
            WHERE sb.booking_id = ? LIMIT 1
        `, [booking_id]);

        if (!booking) return console.warn(`⚠️ No booking found for booking_id ${booking_id}`);

        // 🧾 Package items (no price info)
        const [items] = await db.query(`
            SELECT pi.itemName, sbs.quantity
            FROM service_booking_sub_packages sbs
            JOIN package_items pi ON sbs.sub_package_id = pi.item_id
            WHERE sbs.booking_id = ?
        `, [booking_id]);

        // 🧾 Addons (no price)
        const [addons] = await db.query(`
            SELECT pa.addonName
            FROM service_booking_addons sba
            JOIN package_addons pa ON sba.addon_id = pa.addon_id
            WHERE sba.booking_id = ?
        `, [booking_id]);

        // 🧾 Preferences
        const [preferences] = await db.query(`
            SELECT pp.preferenceValue
            FROM service_booking_preferences sbp
            JOIN booking_preferences pp ON sbp.preference_id = pp.preference_id
            WHERE sbp.booking_id = ?
        `, [booking_id]);

        // 🧾 Concerns
        const [concerns] = await db.query(`
            SELECT pc.question, sbc.answer
            FROM service_booking_consents sbc
            JOIN package_consent_forms pc ON sbc.consent_id = pc.consent_id
            WHERE sbc.booking_id = ?
        `, [booking_id]);

        // 🧩 Build rows
        const buildRows = (data, rowFn, emptyText) =>
            data.length
                ? data.map(rowFn).join("")
                : `<div style="color:#777; font-size:13px;">${emptyText}</div>`;

        const rowStyle = `
            display:flex;
            align-items:center;
            justify-content:space-between;
            width:100%;
            padding:6px 0;
            border-bottom:1px solid #f0f0f0;
        `;

        const nameStyle = `
            flex:1;
            text-align:left;
            word-break:break-word;
        `;

        const itemRows = buildRows(
            items,
            (i) => `
              <div style="${rowStyle}">
                <span style="${nameStyle}">${i.itemName}${i.quantity > 1 ? ` ×${i.quantity}` : ""}</span>
              </div>`,
            "No items found"
        );

        const addonRows = buildRows(
            addons,
            (a) => `
              <div style="${rowStyle}">
                <span style="${nameStyle}">${a.addonName}</span>
              </div>`,
            "No addons selected"
        );

        const preferenceRows = buildRows(
            preferences,
            (p) => `
              <div style="${rowStyle}">
                <span style="${nameStyle}">${p.preferenceValue}</span>
              </div>`,
            "No preferences set"
        );

        const concernRows = buildRows(
            concerns,
            (c) => `
              <div style="${rowStyle.replace("border-bottom:1px solid #f0f0f0;", "")}">
                <span style="${nameStyle}">${c.question}</span>
                <span style="font-weight:600;">${c.answer}</span>
              </div>`,
            "No concerns listed"
        );

        // 🧩 Simplified Vendor Email (No price, totals, tax)
        const bodyHtml = `
        <div style="background:#fff; font-family:Arial, sans-serif; padding:20px;">
         <!-- Main Heading -->
            <h1 style="font-size: 20px; font-weight: bold; color: #00000; margin: 25px 0 10px; line-height: 1.3;">
                Hello <strong>${vendor.name || "Vendor"}</strong> you have been assigned a new Homiqly booking!.
            </h1>

            <p style="color: #00000; font-size: 15px; line-height: 1.6; margin-top: 20px;">
            <strong>( #${booking_id || " "} )</strong>
            </p>
            <!-- TOTAL (Hidden for vendors) -->
            <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:10px;">
                <tr>
                    <td style="font-size:20px; font-weight:bold; color:#000;">Booking Summary</td>
                    <td></td>
                </tr>
            </table>

            <!-- LINE -->
            <hr style="border:none; border-top:1px solid #000; margin:10px 0;" />

            <!-- NAME BLOCK -->
            <div style="font-size:14px; color:#000; margin-bottom:12px;">
                For ${booking.userFirstName} ${booking.userLastName}
            </div>

            <!-- ITEMS / ADDONS / PREFS -->
            <table width="100%" cellspacing="0" cellpadding="5" style="font-size:14px; color:#000;">

                ${items
                .map((i) => {
                    const qty = parseInt(i.quantity || 1);
                    return `
                        <tr>
                            <td width="100%" style="padding:4px 0;">
                                ${i.itemName}${qty > 1 ? ` ×${qty}` : ""}
                            </td>
                        </tr>`;
                })
                .join("")}

                ${preferences
                .map((p) => {
                    return `
                        <tr>
                            <td width="100%" style="padding:2px 0; color:#000;">
                                • preference: ${p.preferenceValue}
                            </td>
                        </tr>`;
                })
                .join("")}

                ${addons
                .map((a) => {
                    return `
                        <tr>
                            <td width="100%" style="padding:2px 0; color:#000;">
                                • Add-on: ${a.addonName}
                            </td>
                        </tr>`;
                })
                .join("")}

            </table>

            <!-- LINE -->
            <hr style="border:none; border-top:1px solid #000; margin:15px 0;" />

            <!-- CUSTOMER DETAILS -->
            <table width="100%" cellspacing="0" cellpadding="5" style="font-size:14px; color:#000;">
                <tr>
                    <td><strong>Customer Name:</strong> ${booking.userFirstName} ${booking.userLastName}</td>
                </tr>
                <tr>
                    <td><strong>Address:</strong> ${booking.userAddress || "N/A"}</td>
                </tr>
                <tr>
                    <td><strong>Date:</strong> ${moment(booking.bookingDate).format("MMM DD, YYYY")}</td>
                </tr>
                <tr>
                    <td><strong>Time:</strong> ${moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A")}</td>
                </tr>
            </table>

        </div>
        `;

        // 🧩 Send Email (with extra data vendorName and booking_id)
        await sendMail({
            to: vendor.email,
            subject: "New Booking Received",
            bodyHtml,
            layout: "vendorBookingMail",
            extraData: { vendorName: vendor.name, booking_id }
        });

        console.log(`📧 Vendor email sent to ${vendor.email} for booking #${booking_id}`);
    } catch (err) {
        console.error("⚠️ Failed to send vendor booking email:", err.message);
    }
};

//done
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
          Congratulations, ${vendorName}!
        </h2>

        <p style="margin-bottom: 15px;">
          We’re excited to welcome you to <strong>Homiqly</strong> - where beauty and convenience meet!
        </p>

        <p>Your registration has been <strong>approved</strong>, and you’re now part of our trusted network of service providers.</p>

        ${passwordSection}

        <p style="margin:20px 0;">
          <a href="https://glistening-marigold-c9df83.netlify.app/vendor/login"
            padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:600;">
            Login to Dashboard
          </a>
        </p>

        <p style="margin-top:20px;">
          Before you begin, make sure your <strong>profile</strong>, <strong>service details</strong>, and <strong>availability</strong> are updated.
        </p>

        <p style="margin-top:25px;">
          Welcome aboard and we’re thrilled to have you on the Homiqly platform!<br/>
          <strong>- The Homiqly Team</strong>
        </p>
      </div>
    `;

        // ✉️ Send via global sendMail utility (adds header + footer automatically)
        await sendMail({
            to: vendorEmail,
            subject: "Welcome to Homiqly community! Your Application Has Been Approved",
            bodyHtml,
            layout: "vendorNotificationMail",
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
        const bodyHtml = `
            < div style = "font-family:Arial, sans-serif; background-color:#f4f6f8; padding:30px 0;" >
                <div style="max-width:700px; margin:auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <div style="background:#007BFF; padding:20px; text-align:center;">
                        <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png"
                            alt="Homiqly Logo" style="width:150px; display:block; margin:auto;" />
                    </div>

                    <!-- Body -->
                    <div style="padding:25px 30px; font-size:15px; color:#333;">
                        <p>Hello,</p>
                        <p>To Reset your account password, please use the following One Time Password (OTP):</p>

                        <div style="background:#f0f3ff; border:1px dashed #007BFF; border-radius:8px;
                        text-align:center; padding:15px; font-size:24px; font-weight:bold;
                        color:#007BFF; letter-spacing:3px; margin:20px 0;">
                            ${code}
                        </div>

                        <p style="margin-top:15px;">
                            ⚠️ Do not share this OTP with anyone. This code will expire in <strong>5 minutes</strong>.
                        </p>

                        <p style="margin-top:20px;">Thanks,<br><strong>Homiqly Team</strong></p>
                    </div>

                    <!-- Footer -->
                    <div style="background:#f0f3f8; text-align:center; font-size:13px; color:#555; padding:15px;">
                        <p style="margin:4px 0;">Need help? Contact
                            <a href="mailto:support@homiqly.com" style="color:#007BFF; text-decoration:none;">
                                support@homiqly.com
                            </a>
                        </p>
                        <p style="margin:4px 0;">&copy; ${new Date().getFullYear()} Homiqly. All rights reserved.</p>
                    </div>
                </div>
               </ >
               `;

        await sendMail({
            to: userEmail,
            subject: "Your Homiqly Password Reset Code",
            bodyHtml,
            layout: "noUnsubscribe",
        });

        console.log(`📧 Password reset code sent to: ${userEmail}`);
    } catch (error) {
        console.error("❌ Failed to send password reset email:", error.message);
    }
}

//done
const sendUserVerificationMail = async ({ userEmail, code, subject }) => {
    try {
        // 🧩 BODY
        const bodyHtml = `
        <div style="padding: 25px; text-align:left; max-width: 570px; margin: 0 auto; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 600; color: #000;">
            ${subject?.toLowerCase().includes("back")
                ? "Welcome back to the Homiqly community"
                : "Welcome to the Homiqly community"
            }
        </h2>

        <p style="font-size: 15px; line-height: 1.6; color: #444; text-align:left;">
            To verify your email address, please use the following One Time Password (OTP):
        </p>

        <!-- OTP Box -->
        <div style="text-align:left; margin: 20px 0;">
            <div
            style="
                display: inline-block;
                font-size: 16px;
                font-weight: 600;
                color: #000;
                letter-spacing: 3px;
            "
            >
            ${code}
            </div>
        </div>

        <p style="font-size: 14px; color: #555; margin-top: 20px;">
            Do not share this OTP with anyone. This code will expire in 5 minutes.
        </p>
        </div>
    `;

        // ✉️ Send the mail using your reusable wrapper
        await sendMail({
            to: userEmail,
            subject,
            bodyHtml,
            layout: "noUnsubscribe",
        });

        console.log(`📧 Verification email sent to ${userEmail}`);
    } catch (error) {
        console.error("❌ Error sending verification mail:", error.message);
    }
};

//done
const sendReviewRequestMail = async ({ userName, userEmail, serviceName, vendorName }) => {
    try {
        const reviewLink = `https://homiqly-development.vercel.app/Profile/history`;

        
        const bodyHtml = `
<div style="max-width:550px; padding: 25px 30px 20px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
   <h2 style="font-size: 20px; font-weight: 600; color: #000;">We’d Love Your Feedback!</h2>

   <p style="font-size: 15px; line-height: 1.6; color: #444;">
     Hello <strong>${userName}</strong>,<br>
     <p style="line-height:1.5; font-size: 15px">We hope you enjoyed your recent <strong>${serviceName}</strong> service with <strong>${vendorName}</strong>.
     Your feedback helps us improve and celebrate our top professionals.
      </p>
   </p>

    <a href="${reviewLink}"
    style="
        display: inline-block;
        padding: 12px 28px;
        background: linear-gradient(135deg, #000000, #333333);
        color: #ffffff;
        border-radius: 8px;
        font-size: 15px;
        text-decoration: none;
        font-weight: 600;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
    ">
    Leave a Review
    </a>
        <p style="font-size: 15px; margin-bottom: 18px;">
        Thank you for choosing Homiqly – where comfort, beauty, and care come together.
        </p>

        <p style="font-size: 15px; margin-top: 20px;">
        Warm regards,<br><strong>Team Homiqly</strong>
        </p>
 </div>
`;
        await sendMail({
            to: userEmail,
            subject: "How Was Your Homiqly Experience?",
            bodyHtml,
            layout: "vendorNotificationMail",
        });
        console.log(`📧 Review request sent to: ${userName} (${userEmail})`);
    } catch (error) {
        console.error("❌ Failed to send review request email:", error.message);
    }
}

//done
const assignWelcomeCode = async ({ user_id, user_email, user_name }) => {

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
        const { system_promo_code_template_id, code, discountValue, maxUse, description } = template;

        // ✅ 4. Assign promo to user
        await db.query(
            `INSERT INTO system_promo_codes (user_id, template_id, usage_count)
       VALUES (?, ?, 0)`,
            [user_id, system_promo_code_template_id]
        );

        // ✅ 5. Send email (using sendMail helper)
        if (user_email) {
            const subject = "Welcome to Homiqly community! Your Promo Code Inside";
            const bodyHtml = `
            <div style="padding: 1px 40px 10px; font-size: 15px; color: #ffffff; text-align: left;
                        font-family: Arial, sans-serif; background-color: #000;">
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 18px;">
                <strong>Hi ${user_name || "there"},</strong><br><br>
                Thanks for signing up! We want to make your Homiqly experience special, starting with
                ${discountValue} off your first ${maxUse} at-home beauty services.
              </p>

              <p style="margin-bottom: 10px; font-size: 15px;">
                To claim your welcome offer, simply use the code <strong>${code}</strong> when booking your first service.
                Your savings will be applied automatically at checkout.
              </p>

              <h3 style="font-weight: 500; margin-bottom: 18px; font-size: 16px;">
                Hurry, pamper yourself and enjoy this offer while it lasts!
              </h3>

              <p style="font-size: 14px; margin-top: 10px; line-height: 1.6; margin-bottom: 10px;">
                Valid on first ${maxUse} at-home beauty services only. Maximum discount of ${description} total across
                your first ${maxUse} services. Discount is valid for services booked through the Homiqly website.
                Offer valid only for customers who received this email directly from Homiqly.
                Cannot be combined with other promotions. Non-transferable. Terms subject to change.
              </p>

              <div style="border-top: 1px solid rgba(255, 255, 255, 0.3); width: 100%; margin: 15px 0 0;"></div>
            </div>
          `;


            await sendMail({
                to: user_email,
                subject,
                bodyHtml,
                layout: "promoCode",
                extraData: { description, code, discountValue, maxUse }, // ✅ Add this line
            });

            console.log(`📧 Welcome promo email sent to ${user_email}`);
        }

        return code;
    } catch (err) {
        console.error("❌ Error assigning welcome promo code:", err.message);
        return null;
    }
};

//done
const sendVendorAssignedPackagesEmail = async ({ vendorData, newlyAssigned }) => {
    if (!vendorData?.vendorEmail) {
        console.warn("⚠️ No vendor email found, skipping email notification.");
        return;
    }

    try {
        const subject = `New Packages Assigned to You`
        const bodyHtml = `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #333; background-color: #ffffff; padding: 25px; max-width: 600px; margin: 0 auto; border-radius: 8px; line-height: 1.6;">
    <p style="font-size: 15px; margin-bottom: 15px;">Dear <strong>${vendorData.vendorName}</strong>,</p>

    <p style="font-size: 15px; margin-bottom: 15px;">
      The following packages have been assigned to you by the admin:
    </p>

    <ul style="padding-left: 18px; margin: 15px 0; font-size: 14px;">
      ${newlyAssigned
                .map(
                    (p) => `
          <li style="margin-bottom: 10px;">
            <strong>Package:</strong> ${p.packageName} <br/>
            <strong>Sub-Packages:</strong> ${p.selected_subpackages.length > 0
                            ? p.selected_subpackages
                                .map((sp) => `<span>${sp.name} </span>`)
                                .join(", ")
                            : "<span>None</span>"
                        }
          </li>`
                )
                .join("")}
    </ul>

    <p style="font-size: 15px; margin-top: 15px;">
      You can now manage and offer these packages from your vendor dashboard.
    </p>

    <p style="font-size: 14px; color: #555; margin-top: 25px;">
      Best regards,<br/>
      <strong>Team Homiqly</strong>
    </p>
  </div>
`;


        // 4️⃣ Send the email using your wrapper
        await sendMail({
            to: vendorData.vendorEmail, // ✅
            subject,
            bodyHtml,
            layout: "vendorNotificationMail", // use consistent layout naming
        });
        console.log(`✅ Email sent to vendor ${vendorData.vendorEmail}`);
    } catch (mailErr) {
        console.error("⚠️ Failed to send vendor email:", mailErr.message);
    }
};

//done
const sendManualAssignmentMail = async (vendor_id, status, note = null) => {
    try {
        // 1️⃣ Fetch vendor info (individual or company)
        let vendorEmail = null;
        let vendorName = "Vendor";

        const [individualRows] = await db.query(
            "SELECT email, name FROM individual_details WHERE vendor_id = ?",
            [vendor_id]
        );

        if (individualRows.length > 0) {
            vendorEmail = individualRows[0].email;
            vendorName = individualRows[0].name;
        } else {
            const [companyRows] = await db.query(
                "SELECT companyEmail, companyName FROM company_details WHERE vendor_id = ?",
                [vendor_id]
            );

            if (companyRows.length > 0) {
                vendorEmail = companyRows[0].companyEmail;
                vendorName = companyRows[0].companyName || "Company Vendor";
            }
        }

        if (!vendorEmail) {
            console.warn(`⚠️ No email found for vendor_id ${vendor_id}`);
            return;
        }

        // 2️⃣ Prepare readable message
        const readableStatus =
            status === 1
                ? "enabled (Your visibility turned ON)"
                : "disabled (Your visibility turned OFF)";

        const subject = "Your visibility from the booking changed by Admin";

        // 3️⃣ Build email HTML (same format as welcome mail)
        const bodyHtml = `
      <div style="background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 40px 40px; font-family: Arial, sans-serif; text-align: left;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 15px; color: #222;">
                Hello ${vendorName},
              </h2>

              <p style="font-size: 15px; line-height: 1.6; color: #444; margin-bottom: 15px;">
                Your manual assignment setting has been <strong>${readableStatus}</strong> by the admin.
              </p>

              ${note
                ? `<p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px;">
                      <strong>Admin Note:</strong> ${note}
                     </p>`
                : ""
            }

              <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px;">
                If you have any questions or concerns, feel free to reach out to our support team anytime through the Help section in your dashboard.
              </p>

              <p style="font-size: 14px; color: #555; margin-bottom: 25px;">
                Best regards,
              </p>

              <p style="font-size: 16px; color: #333; margin-top: 0;">
                <strong>The Homiqly Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </div>
      `;

        // 4️⃣ Send the email using your wrapper
        await sendMail({
            to: vendorEmail,
            subject,
            bodyHtml,
            layout: "vendorNotificationMail", // use consistent layout naming
            extraData: {
                vendorName,
                readableStatus,
            },
        });

        console.log(`📧 Manual assignment mail sent to ${vendorEmail}`);
    } catch (err) {
        console.error("❌ Failed to send manual assignment mail:", err.message);
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
    sendUserWelcomeMail,
    sendManualAssignmentMail
}
