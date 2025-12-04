const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const generateBookingPDF = async (html, booking_id) => {
    const publicDir = path.join(__dirname, "../public/invoices");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    const filePath = path.join(publicDir, `invoice-${booking_id}.pdf`);

    const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: "new"
    });
    const page = await browser.newPage();

    await page.setContent(html, {
        waitUntil: "networkidle0"
    });

    await page.pdf({
        path: filePath,
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px" }
    });

    await browser.close();
    return filePath;
};

module.exports = { generateBookingPDF };