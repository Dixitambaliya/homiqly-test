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

    await page.emulateMediaType("screen");

    // Load content
    await page.setContent(html, {
        waitUntil: "networkidle0",
    });

    // Wait for images
    await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
            imgs.map(img =>
                img.complete ? Promise.resolve() : new Promise(res => img.onload = res)
            )
        );
    });

    // Generate PDF with exact A4 width matching CSS layout
    const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        width: "794px", // EXACT A4 print width
        margin: {
            top: "20px",
            bottom: "20px",
            left: "20px",
            right: "20px"
        }
    });

    await browser.close();

    await file.save(pdfBuffer, {
        metadata: { contentType: "application/pdf" },
        public: true,
        validation: "md5",
    });

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};

module.exports = { generateBookingPDF };
