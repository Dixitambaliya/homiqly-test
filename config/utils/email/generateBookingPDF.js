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

    // Avoid timeout caused by external images
    await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 0
    });

    // Manual safe delay for image loading (works on all Puppeteer versions)
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
            top: "0px",
            right: "0px",
            bottom: "0px",
            left: "0px"
        },
        scale: 0.9
    });

    await browser.close();

    // Upload to Firebase Storage
    await file.save(pdfBuffer, {
        metadata: {
            contentType: "application/pdf",
        },
        public: true,
        validation: "md5"
    });

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};

module.exports = { generateBookingPDF };
