const path = require("path");

const emailHeader = (alignment = "left") => {
    const logoPath = path.resolve("config/media/homiqly.png");
    const cidName = "homiqlyLogo";

    // alignment can be 'left' or 'right'
    const textAlign = alignment === "right" ? "right" : "left";

    const html = `
      <div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="${textAlign}">
              <img src="cid:${cidName}" alt="Homiqly Logo" width="130" />
            </td>
          </tr>
        </table>
      </div>
    `;

    return { html, logoPath, cidName };
};


module.exports = { emailHeader };
