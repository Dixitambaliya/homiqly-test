const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMessageToAdmins = asyncHandler(async (req, res) => {
  const { name, subject, message } = req.body;
  const senderEmail = req.user?.email;

  if (!name || !subject || !message) {
    return res
      .status(400)
      .json({ error: "Name, subject, and message are required" });
  }

  try {
    // Step 1: Insert into support_tickets table
    await db.query(
      `
            INSERT INTO support_tickets (user_email, user_name, subject, message)
            VALUES (?, ?, ?, ?)
        `,
      [senderEmail, name, subject, message]
    );

    // Step 2: Send email to admins
    const [admins] = await db.query("SELECT email FROM admin");

    if (admins.length === 0) {
      return res.status(404).json({ error: "No admins found" });
    }

    const adminEmails = admins.map((admin) => admin.email).join(",");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      bcc: adminEmails,
      subject: `Ticket: ${subject}`,
      html: `
                <p><strong>From:</strong> ${name} (${senderEmail})</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <hr />
                <p>This message was also logged as a support ticket.</p>
            `,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({ message: "Support ticket created and message sent to admins" });
  } catch (err) {
    console.error("Error creating support ticket or sending message:", err);
    res
      .status(500)
      .json({ error: "Failed to send message", details: err.message });
  }
});

const getAllSupportTickets = asyncHandler(async (req, res) => {
  try {
    const [tickets] = await db.query(`
            SELECT 
                st.ticket_id,
                st.user_email AS vendor_email,
                st.user_name AS vendor_name,
                st.subject,
                st.message,
                st.status,
                st.created_at
            FROM support_tickets st
            ORDER BY st.created_at DESC
        `);

    res.status(200).json({ tickets });
  } catch (err) {
    console.error("Failed to fetch support tickets:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

const deleteTicket = asyncHandler(async (req, res) => {
  const { ticket_id } = req.params;

  if (!ticket_id) {
    return res.status(400).json({ message: "Ticket ID is required" });
  }

  try {
    const [result] = await db.query(
      `DELETE FROM support_tickets WHERE ticket_id = ?`,
      [ticket_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("Error deleting ticket:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

const getVendorSupportTickets = asyncHandler(async (req, res) => {
  try {
    // If vendor is authenticated, use req.user.email, else allow query param
    const vendorEmail = req.user?.email || req.query.email;

    if (!vendorEmail) {
      return res.status(400).json({ error: "Vendor email is required" });
    }

    const [tickets] = await db.query(
      `
            SELECT 
                st.ticket_id,
                st.user_email AS vendor_email,
                st.user_name AS vendor_name,
                st.subject,
                st.message,
                st.status,
                st.created_at
            FROM support_tickets st
            WHERE st.user_email = ?
            ORDER BY st.created_at DESC
        `,
      [vendorEmail]
    );

    res.status(200).json({ tickets });
  } catch (err) {
    console.error("Failed to fetch vendor tickets:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

module.exports = {
  sendMessageToAdmins,
  getAllSupportTickets,
  getVendorSupportTickets,
  deleteTicket,
};
