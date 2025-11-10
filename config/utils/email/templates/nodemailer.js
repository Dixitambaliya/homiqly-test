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
const sendMail = async ({ to, subject, bodyHtml, layout = "default" }) => {
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
    if (layout === "minimal") {
        headerHtml = `
      <div style="text-align: center; padding: 15px;">
        <img src="cid:${headerCid}" alt="Homiqly" style="width: 100px;" />
      </div>
    `;
        footerHtml = `
      <div style="background:#f2f2f2; text-align:center; padding:20px; font-size:13px; color:#555;">
        <p>© ${new Date().getFullYear()} Homiqly | <a href="mailto:support@homiqly.com" style="color:#0066ff;text-decoration:none;">support@homiqly.com</a></p>
      </div>
    `;
    } else if (layout === "dark") {
        headerHtml = `
      <div style="padding: 20px; background:#000; text-align:center;">
        <img src="cid:${headerCid}" alt="Homiqly" style="width:120px;" />
      </div>
    `;
        footerHtml = `
      <div style="background:#000; color:#bbb; text-align:center; padding:25px;">
        <p style="margin:0;">Thank you for being with Homiqly</p>
      </div>
    `;
    } else if (layout === "noUnsubscribe") {
        // same as default, but unsubscribe link removed
        footerHtml = `
      <div style="background: #111; color: #bbb; padding: 40px 30px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <!-- Left Side: Logo + Links -->
      <td align="left" valign="top" style="width: 60%; padding-right: 20px;">
        <div style="margin-bottom: 40px;">
          <img src="cid:${footerCid}" alt="Homiqly Logo" style="width: 110px; display: block;" />
        </div>
        <div style="margin-top: 10px;">
          <a href="https://www.homiqly.com/help" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 8px;">Help</a>
          <a href="https://www.homiqly.com/termscondition" style="color: #4da3ff; text-decoration: none; display: block; margin-bottom: 8px;">Terms of Service</a>
          <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; display: block;">Privacy Policy</a>
        </div>
      </td>

      <!-- Right Side: Social Links (slightly lowered) -->
      <td align="right" valign="top" style="width: 40%; padding-top: 30px;">
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

  <div style="text-align: center;">
    <p style="margin: 0; font-size: 14px; line-height: 1.8;">
      Need help? <a href="mailto:support@homiqly.com" style="color: #4da3ff; text-decoration: none;">support@homiqly.com</a><br/>
      © ${new Date().getFullYear()} Homiqly. All rights reserved.
    </p>
  </div>
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
