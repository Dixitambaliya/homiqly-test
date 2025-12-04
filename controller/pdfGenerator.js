const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer"); // best for pixel-perfect PDFs
const db = require("../config/db");

exports.generateBookingPDF = async (booking_id, user_id) => {
    // 1. Get booking email HTML template
    const html = await buildBookingReceiptHTML(booking_id, user_id);

    // 2. Launch headless Chrome
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    // 3. Create PDF file
    const pdfPath = path.join(__dirname, "../uploads/receipts", `receipt_${booking_id}.pdf`);

    await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px" }
    });

    await browser.close();

    // 4. Store in DB
    const fileUrl = `https://www.homiqly.codegrin.com/uploads/receipts/receipt_${booking_id}.pdf`;

    await db.query(
        `UPDATE payments SET receipt_pdf_url=? WHERE payment_intent_id = (
            SELECT payment_intent_id FROM service_booking WHERE booking_id = ?
        )`,
        [fileUrl, booking_id]
    );

    return fileUrl;
};
