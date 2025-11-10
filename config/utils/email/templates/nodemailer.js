const nodemailer = require("nodemailer");
const path = require("path");

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
    const { description = "", code = "" } = extraData;

    // ----- HEADER -----
    const headerLogoPath = path.resolve("config/media/homiqly.png");
    const headerCid = "homiqlyLogo";

    let headerHtml = `
    <div style="padding: 18px 20px; text-align: center; background: #ffffff; border-bottom: 1px solid #eaeaea;">
      <div style="display: inline-block; background-color: #ffffff; padding: 10px; border-radius: 8px;">
        <img src="cid:${headerCid}" alt="Homiqly Logo" style="width: 130px; display: block; margin: auto;" />
      </div>
    </div>
  `;

    // ----- FOOTER (DEFAULT) -----
    const footerLogoPath = path.resolve("config/media/Homiqly_Transparent_White.png");
    const footerCid = "footerLogo";

    let footerHtml = `
    <div style="background: #111; color: #bbb; padding: 40px 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
          <!-- Left Side: Logo + Links -->
          <td align="left" valign="top" style="width: 60%; padding-right: 20px;">
            <img src="cid:${footerCid}" alt="Homiqly Logo" style="width: 110px; display: block; margin-bottom: 12px;" />
            <a href="https://www.homiqly.com/help" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Help</a>
            <a href="https://www.homiqly.com/termscondition" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Terms of Service</a>
            <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Privacy Policy</a>
            <a href="https://www.homiqly.com/unsubscribe" style="color: #4da3ff; text-decoration: none; display: block;">Unsubscribe</a>
          </td>

          <!-- Right Side: Social Links -->
          <td align="right" valign="top" style="width: 40%;">
            <h3 style="color: #fff; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Social Links</h3>
            <div>
              <a href="https://www.instagram.com/homiqly" style="margin-right: 12px; text-decoration: none;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="22" height="22" />
              </a>
              <a href="https://www.facebook.com/homiqly" style="margin-right: 12px; text-decoration: none;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="22" height="22" />
              </a>
              <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png" alt="LinkedIn" width="22" height="22" />
              </a>
            </div>
          </td>
        </tr>
      </table>

      <hr style="border: 0.5px solid #797a79; margin: 25px 0;">

      <!-- Bottom Row: Support -->
      <div style="text-align: center;">
        <p style="margin: 0; font-size: 14px; line-height: 1.8;">
          Need help? <a href="mailto:support@homiqly.com" style="color: #4da3ff; text-decoration: none;">support@homiqly.com</a><br/>
          © ${new Date().getFullYear()} Homiqly. All rights reserved.
        </p>
      </div>
    </div>
  `;

    // ----- CUSTOM LAYOUT VARIANTS -----
    if (layout === "welcomeMail") {
        headerHtml = `
            <div style="padding: 35px 35px 5px; text-align: left; background: #ffffff;">
            <div style="display: inline-block; background-color: #ffffff; padding: 10px 0; border-radius: 8px;">
              <img src="cid:${headerCid}" alt="Homiqly Logo"
                   style="width: 130px; display: block; margin: 0; vertical-align: middle;" />
            </div>
          </div>
        `;
        footerHtml = `
        <div style="background: #111; color: #bbb; padding: 40px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <!-- Left: Logo | Right: Social Icons -->
              <td align="left" valign="middle" style="width: 50%;">
                <img src="cid:${footerCid}" alt="Homiqly Logo" style="width: 110px; display: block;" />
              </td>
              <td align="right" valign="middle" style="width: 50%;">
                <div style="text-align: right;">
                  <a href="https://www.instagram.com/homiqly" style="text-decoration: none; display: inline-block; margin-right: 18px;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png"
                         alt="Instagram"
                         style="width: 24px; height: 24px; display: block;" />
                  </a>
                  <a href="https://www.facebook.com/homiqly" style="text-decoration: none; display: inline-block; margin-right: 18px;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png"
                         alt="Facebook"
                         style="width: 24px; height: 24px; display: block;" />
                  </a>
                  <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none; display: inline-block;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png"
                         alt="LinkedIn"
                         style="width: 24px; height: 24px; display: block;" />
                  </a>
                </div>
              </td>
            </tr>

            <!-- White line under logo + icons -->
            <tr>
              <td colspan="2" style="padding: 0;">
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.3); width: 100%; margin: 20px 0;"></div>
              </td>
            </tr>

            <!-- Links Section (vertical left) + Support Section (bottom right) -->
            <tr>
              <td align="left" valign="top" style="padding-top: 10px;">
                <div>
                  <a href="https://www.homiqly.com/help" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Help</a>
                  <a href="https://www.homiqly.com/termscondition" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Terms of Service</a>
                  <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block;  margin-bottom: 6px">Privacy Policy</a>
                  <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block;  margin-bottom: 6px">Unsubscribe</a>
                </div>
              </td>

            <td align="right">
            <div style="text-align: right; font-size: 14px; line-height: 1.8;">
              <p style="margin: 0; color:#FFFFFF;">Need help?</p>
              <p style="margin: 2px 0 8px;">
                <a href="mailto:support@homiqly.com" style="color: #4da3ff; text-decoration: none;">support@homiqly.com</a>
              </p>
              <p style="margin: 0; color:#FFFFFF;">© 2025 Homiqly. All rights reserved.</p>
            </div>
          </td>
            </tr>
          </table>
        </div>
    `;
    } else if (layout === "promoCode") {
        headerHtml = `
  <div style="background-color: #000; text-align: center; padding: 40px 0 50px; border-bottom: 1px solid #333;">

    <!-- Top White Homiqly Logo -->
    <div style="width: 140px; margin: 0 auto 25px;">
      <img src="cid:${footerCid}" alt="Homiqly Logo"
           style="width: 140px; height: auto; display: block; margin: 0 auto;" />
    </div>

    <!-- Offer Heading -->
    <h2 style="font-size: 22px; color: #ffffff; font-weight: bold; margin: 20px 0 6px;">
      Ready to glow?
    </h2>

    <!-- Description -->
    <p style="font-size: 14px; color: #ffffff; font-weight: 500; margin: 8px 0 18px;">
      Get ${description} off your first 3 at-home beauty services!
    </p>

    <!-- Promo Code -->
    <h2 style="color: #ffffff; font-weight: 600; margin: 10px 0 30px; letter-spacing: 3px;">
      ${code}
    </h2>

    <!-- Big Center Image -->
    <img src="https://elements-resized.envatousercontent.com/envato-dam-assets-production/EVA/TRX/a4/5d/0f/e2/e7/v1_E10/E1086N8O.jpg?w=1600&cf_fit=scale-down&mark-alpha=18&mark=https%3A%2F%2Felements-assets.envato.com%2Fstatic%2Fwatermark4.png&q=85&format=auto&s=f86ec4f1523e22577b0ec9c977c511a48471adb817c6e16736b1eade19c746c0"
         alt="Homiqly Offer Image"
         style="width: 80%; max-width: 500px; height: auto; display: block; margin: 30px auto 0; border-radius: 10px;" />

  </div>
`;

        footerHtml = `
      <div style="background: #111; color: #bbb; padding: 40px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <!-- Left: Logo | Right: Social Icons -->
            <td align="left" valign="middle" style="width: 50%;">
              <img src="cid:${footerCid}" alt="Homiqly Logo" style="width: 110px; display: block;" />
            </td>
            <td align="right" valign="middle" style="width: 50%;">
              <div style="text-align: right;">
                <a href="https://www.instagram.com/homiqly" style="text-decoration: none; display: inline-block; margin-right: 18px;">
                  <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png"
                       alt="Instagram"
                       style="width: 24px; height: 24px; display: block;" />
                </a>
                <a href="https://www.facebook.com/homiqly" style="text-decoration: none; display: inline-block; margin-right: 18px;">
                  <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png"
                       alt="Facebook"
                       style="width: 24px; height: 24px; display: block;" />
                </a>
                <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none; display: inline-block;">
                  <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png"
                       alt="LinkedIn"
                       style="width: 24px; height: 24px; display: block;" />
                </a>
              </div>
            </td>
          </tr>

          <!-- White line under logo + icons -->
          <tr>
            <td colspan="2" style="padding: 0;">
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.3); width: 100%; margin: 20px 0;"></div>
            </td>
          </tr>

          <!-- Links Section (vertical left) + Support Section (bottom right) -->
          <tr>
            <td align="left" valign="top" style="padding-top: 10px;">
              <div>
                <a href="https://www.homiqly.com/help" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Help</a>
                <a href="https://www.homiqly.com/termscondition" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 6px;">Terms of Service</a>
                <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block;  margin-bottom: 6px">Privacy Policy</a>
                <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block;  margin-bottom: 6px">Unsubscribe</a>
              </div>
            </td>

          <td align="right">
          <div style="text-align: right; font-size: 14px; line-height: 1.8;">
            <p style="margin: 0; color:#FFFFFF;">Need help?</p>
            <p style="margin: 2px 0 8px;">
              <a href="mailto:support@homiqly.com" style="color: #4da3ff; text-decoration: none;">support@homiqly.com</a>
            </p>
            <p style="margin: 0; color:#FFFFFF;">© 2025 Homiqly. All rights reserved.</p>
          </div>
        </td>
          </tr>
        </table>
      </div>
  `;


    } else if (layout === "noUnsubscribe") {
        let headerHtml = `
    <div style="padding: 18px 20px; text-align: center; background: #ffffff; border-bottom: 1px solid #eaeaea;">
      <div style="display: inline-block; background-color: #ffffff; padding: 10px; border-radius: 8px;">
        <img src="cid:${headerCid}" alt="Homiqly Logo" style="width: 130px; display: block; margin: auto;" />
      </div>
    </div>`
        footerHtml = `
        <div style="background: #111; color: #bbb; padding: 40px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <!-- Left: Logo | Right: Social Icons -->
              <td align="left" valign="middle" style="width: 50%;">
                <img src="cid:${footerCid}" alt="Homiqly Logo" style="width: 110px; display: block;" />
              </td>
              <td align="right" valign="middle" style="width: 50%;">
                <div style="text-align: right;">
                  <a href="https://www.instagram.com/homiqly" style="text-decoration: none; display: inline-block; margin-right: 18px;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png"
                         alt="Instagram"
                         style="width: 24px; height: 24px; display: block;" />
                  </a>
                  <a href="https://www.facebook.com/homiqly" style="text-decoration: none; display: inline-block; margin-right: 18px;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png"
                         alt="Facebook"
                         style="width: 24px; height: 24px; display: block;" />
                  </a>
                  <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none; display: inline-block;">
                    <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png"
                         alt="LinkedIn"
                         style="width: 24px; height: 24px; display: block;" />
                  </a>
                </div>
              </td>
            </tr>

            <!-- White line under logo + icons -->
            <tr>
              <td colspan="2" style="padding: 0;">
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.3); width: 100%; margin: 20px 0;"></div>
              </td>
            </tr>

            <!-- Links Section (vertical left) + Support Section (bottom right) -->
            <tr>
              <td align="left" valign="top" style="padding-top: 10px;">
                <div>
                  <a href="https://www.homiqly.com/help" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 8px;">Help</a>
                  <a href="https://www.homiqly.com/termscondition" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 8px;">Terms of Service</a>
                  <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block;">Privacy Policy</a>
                </div>
              </td>

              <td align="right" valign="bottom" style="padding-top: 10px;">
                <div style="text-align: right; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0; color:#FFFFFF;">Need help?
                    <a href="mailto:support@homiqly.com" style="color: #4da3ff; text-decoration: none;">support@homiqly.com</a>
                  </p>
                  <p style="margin: 4px 0 0; color:#FFFFFF;">© ${new Date().getFullYear()} Homiqly. All rights reserved.</p>
                </div>
              </td>
            </tr>
          </table>
        </div>
        `;
    }

    // ----- FINAL WRAPPER -----
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 30px 0;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        ${headerHtml}
        ${bodyHtml}
        ${footerHtml}
      </div>
    </div>
  `;

    // ----- SEND MAIL -----
    await transporter.sendMail({
        from: `<${process.env.NO_REPLAY_USER}>`,
        to,
        subject,
        html: htmlBody,
        attachments: [
            { filename: "homiqly.png", path: headerLogoPath, cid: headerCid },
            { filename: "Homiqly_Transparent_White.png", path: footerLogoPath, cid: footerCid },
        ],
    });
};

// 🔹 Export sendMail for use in other files
module.exports = { sendMail };
