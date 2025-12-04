const { db } = require("../../db");
const moment = require("moment");

const buildBookingInvoiceHTML = async (booking_id) => {

    // --------------------------
    // 1) BOOKING MAIN ROW
    // --------------------------
    const [[booking]] = await db.query(`
        SELECT user_id, bookingDate, bookingTime, vendor_id
        FROM service_booking WHERE booking_id=? LIMIT 1
    `, [booking_id]);
        
    if (!booking) return "<div>Booking not found</div>";

    const bookingDateFormatted = moment(booking.bookingDate).format("MMM DD, YYYY");
    const bookingTimeFormatted = moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A");

    // --------------------------
    // 2) USER
    // --------------------------
    const [[user]] = await db.query(`
        SELECT firstName, lastName FROM users WHERE user_id=? LIMIT 1
    `, [booking.user_id]);

    const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Customer";

    // --------------------------
    // 3) PROFESSIONAL (Vendor)
    // --------------------------
    const [[vendor]] = await db.query(`
        SELECT name FROM individual_details WHERE vendor_id=? LIMIT 1
    `, [booking.vendor_id]);

    const vendorName = vendor?.name || "Assigned Professional";
    
    // --------------------------
    // 4) TOTALS
    // --------------------------
    const [[totals]] = await db.query(`
        SELECT subtotal, promo_discount, tax_amount, final_total
        FROM booking_totals WHERE booking_id=? LIMIT 1
    `, [booking_id]);

    const subtotal = Number(totals?.subtotal || 0);
    const promoDiscount = Number(totals?.promo_discount || 0);
    const taxAmount = Number(totals?.tax_amount || 0);
    const finalTotal = Number(totals?.final_total || 0);

    // --------------------------
    // 5) Currency (fallback: CAD)
    // --------------------------
    const currencySymbol = (cur) => {
        const map = { INR: "₹", USD: "$", CAD: "CA$", EUR: "€", GBP: "£" };
        return map[cur] || cur + " ";
    };

    const curSym = currencySymbol("CAD"); // or fetch from vendor_payouts if needed

    // --------------------------
    // 6) ITEMS
    // --------------------------
    const [packages] = await db.query(`
        SELECT sbs.sub_package_id, sbs.quantity, sbs.price, pi.itemName
        FROM service_booking_sub_packages sbs
        JOIN package_items pi ON pi.item_id = sbs.sub_package_id
        WHERE booking_id=?
    `, [booking_id]);

    let receiptRows = "";

    for (let pkg of packages) {
        const total = pkg.price * pkg.quantity;

        receiptRows += `
            <tr>
                <td style="padding:4px 0;">${pkg.itemName} × ${pkg.quantity}</td>
                <td style="text-align:right; padding:4px 0;">${curSym}${total.toFixed(2)}</td>
            </tr>
        `;
    }

    // --------------------------
    // 7) FINAL HTML TEMPLATE
    // --------------------------
    return `
<div style="background:#f7f7f7; padding:20px; font-family:Arial, sans-serif;">

    <div style="max-width:650px; margin:0 auto; background:#ffffff; padding:30px; border-radius:6px;">

        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:15px;">
            <img 
                src="https://www.homiqly.codegrin.com/public/homiqly.png" 
                alt="Homiqly Logo"
                style="width:150px; height:auto; display:block;"
            />
            <div style="color:#666; font-size:14px;">${bookingDateFormatted}</div>
        </div>

        <hr style="border:none; border-top:1px solid #ddd; margin:25px 0 30px 0;" />

        <h2 style="font-size:20px; margin:0 0 8px 0; color:#000;">
            Here’s your receipt for your booking, ${userName}
        </h2>

        <p style="color:#666; font-size:14px; margin:0 0 25px 0;">
            We hope you enjoy your service experience.
        </p>

        <!-- TOTAL -->
        <div style="margin-top:15px; padding:18px 0; border-top:1px solid #ccc; border-bottom:1px solid #ccc;">
            <div style="display:flex; justify-content:space-between; font-size:22px; font-weight:bold;">
                <span>Total</span>
                <span>${curSym}${finalTotal.toFixed(2)}</span>
            </div>
        </div>

        <div style="height:28px;"></div>

        <table width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px 0; font-size:14px;">
            <tr>
                <td style="padding:6px 0;">Service Charges</td>
                <td style="text-align:right;">${curSym}${subtotal.toFixed(2)}</td>
            </tr>

            ${promoDiscount > 0 ? `
            <tr>
                <td style="padding:6px 0;">Promo Discount</td>
                <td style="text-align:right; color:green;">-${curSym}${promoDiscount.toFixed(2)}</td>
            </tr>` : ""}

            <tr>
                <td style="padding:6px 0;">Taxes</td>
                <td style="text-align:right;">${curSym}${taxAmount.toFixed(2)}</td>
            </tr>
        </table>

        <hr style="border:none; border-top:1px solid #ddd; margin:25px 0;" />

        <h3 style="font-size:16px; margin:0 0 12px 0; color:#000;">Services</h3>

        <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
            ${receiptRows}
        </table>

        <hr style="border:none; border-top:1px solid #ddd; margin:28px 0;" />

        <h3 style="font-size:16px; margin:0 0 12px 0; color:#000;">Payment</h3>

        <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
            <tr>
                <td>Paid via</td>
                <td style="text-align:right; font-weight:bold;">${curSym}${finalTotal.toFixed(2)}</td>
            </tr>
        </table>

        <p style="margin-top:20px; font-size:13px; color:#777; line-height:1.6;">
            Booking ID: <strong>#${booking_id}</strong><br/>
            Professional: <strong>${vendorName}</strong><br/>
            Scheduled on: <strong>${bookingDateFormatted} at ${bookingTimeFormatted}</strong>
        </p>

        <hr style="border:none; border-top:1px solid #ddd; margin:28px 0;" />

        <p style="font-size:12px; color:#999; line-height:1.5;">
            Thank you for choosing Homiqly.<br/>
            If you have questions about your charges, please contact our support team.
        </p>

    </div>
</div>
    `;
};

module.exports = { buildBookingInvoiceHTML };
