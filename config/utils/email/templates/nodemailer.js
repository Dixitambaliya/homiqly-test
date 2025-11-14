const nodemailer = require("nodemailer");
const path = require("path");
const moment = require('moment-timezone');

// 🔹 Create mail transporter (using Gmail)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// 🔹 Main mail sending function
const sendMail = async ({ to, subject, bodyHtml, layout = "default", extraData = {} }) => {
    const {
        userName = "",
        receiptUrl = "",
        usersName = "",
        code = "",
        vendorName = "",
        bookingDateFormatted = "",
        bookingTimeFormatted = "",
        bookingTime = "",
        booking_id = "",
        promoCode = "",
        description = "",
        discountValue = "",
        maxUse = "",
    } = extraData || {};

    let headerHtml = "";

    let footerHtml = `
    <div style="background: #000000; color: #bbb; padding: 10px 30px 15px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 470px; margin: 0 auto;">
        <tr>
          <td align="left" valign="top" style="width: 50%;">
            <div style="text-align: left; line-height: 1.8;">
              <a href="https://www.homiqly.com/help" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block;">Help</a>
              <a href="https://www.homiqly.com/termscondition" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block;">Terms of Service</a>
              <a href="https://www.homiqly.com/privacypolicy" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block;">Privacy Policy</a>
              <a href="https://www.homiqly.com/privacypolicy" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block;">Unsubscribe</a>
            </div>
          </td>

          <td align="right" valign="middle" style="width: 50%;">
            <div style="text-align: right;">
              <a href="https://www.instagram.com/homiqly" style="text-decoration: none; display: inline-block; margin-left: 10px;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram"
                     style="width: 24px; height: 24px; display: inline-block;" />
              </a>
              <a href="https://www.facebook.com/homiqly" style="text-decoration: none; display: inline-block; margin-left: 10px;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook"
                     style="width: 24px; height: 24px; display: inline-block;" />
              </a>
              <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none; display: inline-block; margin-left: 10px;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png" alt="LinkedIn"
                     style="width: 24px; height: 24px; display: inline-block;" />
              </a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

    // ----- CUSTOM LAYOUT VARIANTS -----
    if (layout === "welcomeMail") {
        headerHtml = `
            <div style="padding: 35px 35px 25px; text-align: left; background: #000000;">
            <div style="display: inline-block; background-color: #000000; padding: 10px 0; border-radius: 8px;">
              <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png" alt="Homiqly Logo"
                   style="width: 130px; display: block; margin: 0; vertical-align: middle;" />
            </div>
          </div>
        `;
    } else if (layout === "promoCode") {
        headerHtml = `
  <div style="background-color: #000000; text-align: center; padding: 40px 0 50px;">
    <div style="width: 140px; margin: 0 auto 25px;">
      <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png" alt="Homiqly Logo"
           style="width: 140px; height: auto; display: block; margin: 0 auto;" />
    </div>

    <h2 style="font-size: 22px; color: #ffffff; font-weight: bold; margin: 20px 0 6px;">
      Ready to glow?
    </h2>

    <p style="font-size: 14px; color: #ffffff; font-weight: 500; margin: 8px 0 18px;">
      Get ${description} off your first 3 at-home beauty services!
    </p>

    <h2 style="color: #ffffff; font-weight: 600; margin: 10px 0 30px; letter-spacing: 3px;">
      ${code}
    </h2>

    <img src="https://elements-resized.envatousercontent.com/envato-dam-assets-production/EVA/TRX/a4/5d/0f/e2/e7/v1_E10/E1086N8O.jpg?w=1600&cf_fit=scale-down&mark-alpha=18&mark=https%3A%2F%2Felements-assets.envato.com%2Fstatic%2Fwatermark4.png&q=85&format=auto&s=f86ec4f1523e22577b0ec9c977c511a48471adb817c6e16736b1eade19c746c0"
         alt="Homiqly Offer Image"
         style="width: 80%; max-width: 500px; height: auto; display: block; margin: 0 auto 0; border-radius: 10px;" />
  </div>
        `;
    } else if (layout === "noUnsubscribe") {
        headerHtml = `
            <div style = "background: #000000; border-bottom: 1px solid #eaeaea;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 570px; margin: 0 auto;">
                    <tr>
                        <td style="padding: 15px 10px; text-align: left;">
                            <div style="display: inline-block; padding: 10px; border-radius: 8px;">
                                <img
                                    src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png"
                                    alt="Homiqly Logo"
                                    style="width: 130px; display: block; margin: auto;"
                                />
                            </div>
                        </td>
                    </tr>
                </table>
        </ >
    `;
        // 🧩 FOOTER
        footerHtml = `
    <div style = "background: #000000; color: #bbb; padding: 20px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 570px; margin: 0 auto;">

            <!-- Top Section: Links (Vertical) + Social Icons -->
            <tr>
                <!-- Left: Vertical Links -->
                <td align="left" valign="top" style="width: 50%;">
                    <div style="text-align: left; line-height: 1.8;">
                        <a href="https://www.homiqly.com/help" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block; margin-bottom: 8px;">Help</a>
                        <a href="https://www.homiqly.com/termscondition" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block; margin-bottom: 8px;">Terms of Service</a>
                        <a href="https://www.homiqly.com/privacypolicy" style="font-size:15px; color: #4da3ff; text-decoration: none; display: block;">Privacy Policy</a>
                    </div>
                </td>

                <!-- Right: Social Icons -->
                <td align="right" valign="middle" style="width: 50%;">
                    <div style="text-align: right;">
                        <a href="https://www.instagram.com/homiqly" style="text-decoration: none; display: inline-block; margin-left: 10px;">
                            <img
                                src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png"
                                alt="Instagram"
                                style="width: 24px; height: 24px; display: inline-block;"
                            />
                        </a>
                        <a href="https://www.facebook.com/homiqly" style="text-decoration: none; display: inline-block; margin-left: 10px;">
                            <img
                                src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png"
                                alt="Facebook"
                                style="width: 24px; height: 24px; display: inline-block;"
                            />
                        </a>
                        <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none; display: inline-block; margin-left: 10px;">
                            <img
                                src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png"
                                alt="LinkedIn"
                                style="width: 24px; height: 24px; display: inline-block;"
                            />
                        </a>
                    </div>
                </td>
            </tr>
        </table>
  </ >
    `;
    } else if (layout === "userBookingMail") {
        headerHtml = `
        <div style="background-color: #000000; padding: 30px; border-radius: 8px 8px 0 0; font-family: Arial, sans-serif;">

            <!-- Top Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <!-- Left: Logo -->
                <div style="flex: 1;">
                    <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png" alt="Homiqly Logo" style="width: 150px; height: auto; display: block;" />
                </div>
            </div>
        </div >
    `;
    } else if (layout === "vendorBookingMail") {
        headerHtml = `
        <div style="background-color: #000000; padding: 30px; border-radius: 8px 8px 0 0; font-family: Arial, sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <!-- Left: Logo -->
                <div style="flex: 1;">
                    <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png" alt="Homiqly Logo"
                        style="width: 150px; height: auto; display: block;" />
                </div>
            </div>
        </div>
`;

    } else if (layout === "vendorNotificationMail") {
        headerHtml = `
     <div style="background-color: #000000; padding: 30px; border-radius: 8px 8px 0 0; font-family: Arial, sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <!-- Left: Logo -->
                <div style="flex: 1;">
                    <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png" alt="Homiqly Logo" style="width: 150px; height: auto; display: block;" />
                </div>
            </div>
        </div >
    `;
    } else if (layout === "adminCode") {
        headerHtml = `
    < div style = "background-color: #000000; text-align: center; padding: 40px 0 50px;" >

    < !--Top White Homiqly Logo-- >
    <div style="width: 140px; margin: 0 auto 25px;">
      <img src="https://www.homiqly.codegrin.com/public/Homiqly_Transparent_White.png" alt="Homiqly Logo"
           style="width: 140px; height: auto; display: block; margin: 0 auto;" />
    </div>

    <h2 style="font-size: 22px; color: #ffffff; font-weight: bold; margin: 20px 0 6px;">
    Milestone Achieved!
    </h2>

    <p style="color: #ffffff; font-weight: 600; margin: 10px 0 30px; letter-spacing: 2px;">
    You’ve successfully completed your minimum required bookings.
    </p>

    <!--Promo Code-- >
    <h2 style="color: #ffffff; font-weight: 600; margin: 0 0 25px; letter-spacing: 3px;">
      ${promoCode}
    </h2>

    <!--Big Center Image-- >
    <img src="https://elements-resized.envatousercontent.com/envato-dam-assets-production/EVA/TRX/a4/5d/0f/e2/e7/v1_E10/E1086N8O.jpg?w=1600&cf_fit=scale-down&mark-alpha=18&mark=https%3A%2F%2Felements-assets.envato.com%2Fstatic%2Fwatermark4.png&q=85&format=auto&s=f86ec4f1523e22577b0ec9c977c511a48471adb817c6e16736b1eade19c746c0"
        alt="Homiqly Offer Image"
        style="width: 80%; max-width: 500px; height: auto; display: block; margin: 30px auto 0; border-radius: 10px;" />

  </div >
    `;

    }

    // ----- FINAL WRAPPER -----
    const htmlBody = `
        <div style = "font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 30px 0;">
            <div style="max-width: 550px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            ${headerHtml}
            ${bodyHtml}
            ${footerHtml}
        </div>
    </ >
    `;

    // ----- SEND MAIL -----
    await transporter.sendMail({
        from: `"Homiqly" < ${process.env.NO_REPLAY_USER}> `,
        to,
        subject,
        html: htmlBody,
        envelope: {
            from: process.env.NO_REPLAY_USER, // ensures Gmail uses alias
            to: to,
        },
    });
}

// 🔹 Export sendMail for use in other files
module.exports = { sendMail };
