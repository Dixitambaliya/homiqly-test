const path = require("path");

const emailFooter = () => {
    const footerLogoPath = path.resolve("config/media/Homiqly_Transparent_White.png");
    const cidFooterLogo = "footerLogo";

    const html = `
    <div style="background: #111; color: #bbb; padding: 40px 30px;">
      <!-- Row 1: Logo + Socials -->
      <table width="80%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; margin-left:10%;">
        <tr>
          <td align="left" valign="middle" width="50%">
            <img src="cid:${cidFooterLogo}" alt="Homiqly Logo" style="width: 120px; height: auto; display: block;" />
          </td>
          <td align="right" valign="middle" width="50%">
            <div>
              <a href="https://www.instagram.com/homiqly" style="margin-right: 18px; text-decoration: none; display: inline-block;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="22" height="22" style="display:block;" />
              </a>
              <a href="https://www.facebook.com/homiqly" style="margin-right: 18px; text-decoration: none; display: inline-block;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="22" height="22" style="display:block;" />
              </a>
              <a href="https://www.linkedin.com/company/homiqly" style="text-decoration: none; display: inline-block;">
                <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png" alt="LinkedIn" width="22" height="22" style="display:block;" />
              </a>
            </div>
          </td>
        </tr>
      </table>

      <hr style="border:0.5px solid #797a79; margin-bottom: 25px;">

      <!-- Row 2: Links -->
      <div style="text-align: center; margin-bottom: 25px;">
        <a href="https://www.homiqly.com/privacypolicy" style="color: #4da3ff; text-decoration: none; font-size: 14px; margin-right: 25px;">Privacy Policy</a>
        <a href="https://www.homiqly.com/termscondition" style="color: #4da3ff; text-decoration: none; font-size: 14px; border-left:1px solid #fff; padding-left:30px;">Terms of Service</a>
      </div>

      <!-- Row 3: Support -->
      <div style="text-align: center;">
        <p style="margin: 0; font-size: 14px; line-height: 1.8;">
          Need help? <a href="mailto:support@homiqly.com" style="color: #4da3ff; text-decoration: none;">support@homiqly.com</a><br/>
          © ${new Date().getFullYear()} Homiqly. All rights reserved.
        </p>
      </div>
    </div>
  `;

    return { html, footerLogoPath, cidFooterLogo };
}

module.exports = { emailFooter };