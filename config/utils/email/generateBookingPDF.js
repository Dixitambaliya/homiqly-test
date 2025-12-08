const puppeteer = require("puppeteer");
const admin = require("../../../config/firebaseConfig");

const generateBookingPDF = async (html, booking_id) => {
    const bucket = admin.storage().bucket();
    const fileName = `invoices/invoice-${booking_id}.pdf`;
    const file = bucket.file(fileName);

    // ---- 1. Launch Puppeteer ----
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: "/usr/bin/chromium-browser",
    });

    const page = await browser.newPage();

    // ---- 2. Force viewport to prevent stretching ----
    await page.setViewport({
        width: 600,     // fixed width prevents horizontal stretching
        height: 1200,   // not important but required
        deviceScaleFactor: 1,
    });

    // ---- 3. Inject a <meta viewport> to prevent scaling/stretching ----
    const htmlWithMeta = `
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        ${html}
    `;

    // ---- 4. Load HTML into Puppeteer safely ----
    await page.setContent(htmlWithMeta, {
        waitUntil: "domcontentloaded",
        timeout: 0
    });

    // ---- 5. Wait for ALL images to fully load (prevents stretched logos) ----
    await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
            imgs.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => img.addEventListener("load", resolve));
            })
        );
    });

    // ---- 6. Generate the PDF with SAFE margins and NO scale ----
    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        scale: 1,  // prevent stretching
        margin: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px"
        }
    });

    await browser.close();

    // ---- 7. Upload PDF to Firebase Storage ----
    await file.save(pdfBuffer, {
        metadata: { contentType: "application/pdf" },
        public: true,
        validation: "md5"
    });

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};

module.exports = { generateBookingPDF };
