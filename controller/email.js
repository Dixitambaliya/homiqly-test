// const express = require("express");
// const nodemailer = require("nodemailer");
// const router = express.Router();

// // POST /send-email
// router.post("/send-email", async (req, res) => {
//   const { to, subject, text } = req.body;

//   if (!to || !subject || !text) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   const transporter = nodemailer.createTransport({
//     host: "smtp.hostinger.com",
//     port: 465,
//     secure: true,
//     auth: {
//       user: "info@codegrin.com",
//       pass: "Yourcode@2001",
//     },
//   });

//   try {
//     await transporter.sendMail({
//       from: '"Codegrin Technologies" <info@codegrin.com>',
//       to,
//       subject,
//       text,
//     });

//     res.status(200).json({ message: "Email sent successfully!" });
//   } catch (err) {
//     console.error("Email error:", err);
//     res.status(500).json({ message: "Failed to send email", error: err.message });
//   }
// });

// module.exports = router;

const nodemailer = require("nodemailer");

async function sendWelcomeEmail() {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: "info@codegrin.com",
      pass: "Yourcode@2001", // 🔐 Don't hardcode in production
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Codegrin Technologies" <info@codegrin.com>',
      to: "client@example.com",
      subject: "Welcome to Codegrin",
      text: "Thank you for choosing us.",
    });

    console.log("✅ Email sent: " + info.messageId);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}

// Call the function directly
sendWelcomeEmail();
