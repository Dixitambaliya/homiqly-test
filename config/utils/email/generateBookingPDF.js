const puppeteer = require("puppeteer");
const admin = require("../../../config/firebaseConfig");

const generateBookingPDF = async (html, booking_id) => {
    const bucket = admin.storage().bucket();
    const fileName = `invoices/invoice-${booking_id}.pdf`;
    const file = bucket.file(fileName);

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: "/usr/bin/chromium-browser",
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" }); ``

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px" },
    });

    await browser.close();

    // Upload to Firebase Storage
    await file.save(pdfBuffer, {
        metadata: {
            contentType: "application/pdf",
        },
        public: true, // make file accessible through URL
        validation: "md5"
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return publicUrl;
};

module.exports = { generateBookingPDF };