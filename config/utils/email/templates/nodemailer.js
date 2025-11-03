const nodemailer = require("nodemailer");
const path = require("path");
const { emailHeader } = require("../templates/emailHeader");
const { emailFooter } = require("../templates/emailFooter");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NO_REPLAY_USER,
        pass: process.env.NO_REPLAY,
    }
});

const sendMail = async ({ to, subject, bodyHtml }) => {
    const { html: headerHtml, logoPath, cidName } = emailHeader();
    const { html: footerHtml, footerLogoPath, cidFooterLogo } = emailFooter();

    // Wrap everything inside a fixed-width container
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #f6f6f6; padding: 30px 0;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        ${headerHtml}
        ${bodyHtml}
        ${footerHtml}
        </div>
    </div>
    `;

    await transporter.sendMail({
        from: `<${process.env.NO_REPLAY_USER}>`,
        to,
        subject,
        html: htmlBody,
        attachments: [
            { filename: "homiqly.png", path: logoPath, cid: cidName },
            { filename: "Homiqly_Transparent_White.png", path: footerLogoPath, cid: cidFooterLogo },
        ],
    });
};

module.exports = { sendMail };
