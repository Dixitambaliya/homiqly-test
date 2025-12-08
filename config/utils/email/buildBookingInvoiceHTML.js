const { db } = require("../../db");
const moment = require("moment");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const buildBookingInvoiceHTML = async (booking_id) => {

    const [[booking]] = await db.query(`
        SELECT user_id, bookingDate, bookingTime, vendor_id
        FROM service_booking WHERE booking_id=? LIMIT 1
    `, [booking_id]);

    if (!booking) return "<div>Booking not found</div>";

    const bookingDateFormatted = moment(booking.bookingDate).format("MMM DD, YYYY");
    const bookingTimeFormatted = moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A");

    const [[user]] = await db.query(`
        SELECT firstName, lastName, email 
        FROM users WHERE user_id=? LIMIT 1
    `, [booking.user_id]);

    const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

    const [[vendor]] = await db.query(`
        SELECT name FROM individual_details WHERE vendor_id=? LIMIT 1
    `, [booking.vendor_id]);

    const vendorName = vendor?.name || "Assigned Professional";

    const [[totals]] = await db.query(`
        SELECT subtotal, promo_discount, tax_amount, final_total
        FROM booking_totals WHERE booking_id=? LIMIT 1
    `, [booking_id]);

    const subtotal = Number(totals?.subtotal || 0);
    const promoDiscount = Number(totals?.promo_discount || 0);
    const taxAmount = Number(totals?.tax_amount || 0);
    const finalTotal = Number(totals?.final_total || 0);

    const [[payoutRow]] = await db.query(`
        SELECT currency FROM vendor_payouts WHERE booking_id = ? LIMIT 1
    `, [booking_id]);

    const currency = (payoutRow?.currency || "CAD").toUpperCase();
    const currencySymbol = { INR: "₹", USD: "$", CAD: "CA$", EUR: "€", GBP: "£" }[currency] || currency + " ";

    const [packages] = await db.query(`
        SELECT sbs.sub_package_id, sbs.quantity, sbs.price, pi.itemName
        FROM service_booking_sub_packages sbs
        JOIN package_items pi ON pi.item_id = sbs.sub_package_id
        WHERE booking_id=?
    `, [booking_id]);

    const [addons] = await db.query(`
        SELECT sba.sub_package_id, sba.addon_id, sba.price, pa.addonName
        FROM service_booking_addons sba
        JOIN package_addons pa ON sba.addon_id = pa.addon_id
        WHERE sba.booking_id = ?
    `, [booking_id]);

    const [prefs] = await db.query(`
        SELECT bp.sub_package_id, pm.preferencePrice, pm.preferenceValue
        FROM service_booking_preferences bp
        JOIN booking_preferences pm ON bp.preference_id = pm.preference_id
        WHERE bp.booking_id = ?
    `, [booking_id]);

    const [[paymentRow]] = await db.query(`
        SELECT payment_intent_id
        FROM service_booking
        WHERE booking_id = ?
        LIMIT 1
    `, [booking_id]);

    let cardBrand = "N/A";
    let last4 = "****";
    let receiptEmail = user.email;

    if (paymentRow?.payment_intent_id) {
        try {
            const charges = await stripe.charges.list({
                payment_intent: paymentRow.payment_intent_id,
                limit: 1,
            });

            const charge = charges.data?.[0];

            if (charge) {
                cardBrand = charge?.payment_method_details?.card?.brand || "N/A";
                last4 = charge?.payment_method_details?.card?.last4 || "****";
                receiptEmail = charge?.billing_details?.email || receiptEmail;
            }
        } catch {}
    }

    const BASE_URL = "https://www.homiqly.codegrin.com";
    const brandLogo = {
        visa: `${BASE_URL}/public/assets/visa.svg`,
        mastercard: `${BASE_URL}/public/assets/mastercard.svg`,
        amex: `${BASE_URL}/public/assets/amex.svg`,
        unionpay: `${BASE_URL}/public/assets/unionpay.svg`,
    };

    const cardLogoUrl = brandLogo[cardBrand?.toLowerCase()] || null;

    let receiptRows = "";

    for (let pkg of packages) {
        const qty = Number(pkg.quantity);
        const pkgTotal = qty * Number(pkg.price);

        receiptRows += `
            <tr>
                <td style="padding:6px 0; font-weight:600;">${pkg.itemName} × ${qty}</td>
                <td style="text-align:right; font-weight:600;">${currencySymbol}${pkgTotal.toFixed(2)}</td>
            </tr>
        `;

        addons.filter(a => a.sub_package_id === pkg.sub_package_id).forEach(a => {
            receiptRows += `
                <tr>
                    <td style="padding:3px 0; color:#444;">• ${a.addonName}</td>
                    <td style="text-align:right;">${currencySymbol}${(qty * a.price).toFixed(2)}</td>
                </tr>
            `;
        });

        prefs.filter(p => p.sub_package_id === pkg.sub_package_id).forEach(p => {
            receiptRows += `
                <tr>
                    <td style="padding:3px 0; color:#444;">• ${p.preferenceValue}</td>
                    <td style="text-align:right;">${currencySymbol}${(qty * p.preferencePrice).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // -------------------- HTML OUTPUT ----------------------
    return `
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- FIX: GOOGLE FONT FOR CONSISTENT PDF LOOK -->
    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">

    <style>
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: antialiased;
        }

        body {
            margin: 0;
            padding: 0;
            background: #f7f7f7 !important;
            font-family: 'Inter', sans-serif !important;
        }

        .page-bg {
            width: 100%;
            background: #f7f7f7;
            padding: 40px 0;
            display: flex;
            justify-content: center;
        }

        .invoice-wrapper {
            width: 480px;
            background: white;
            padding: 25px;
            border-radius: 10px;
        }

        h2, h3 {
            margin: 15px 0 10px;
            font-weight: 700;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        td {
            padding: 4px 0;
        }

        hr {
            border: 0;
            border-top: 1px solid #ddd;
            margin: 16px 0;
        }

        .header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:35px;
        }

        .total-box {
            border-top:1px solid #ddd;
            border-bottom:1px solid #ddd;
            padding:12px 0;
            margin:20px 0;
            font-size:20px;
            font-weight:700;
        }

        .payment-section {
            border-top:1px solid #ddd;
            padding-top:12px;
        }

        .payment-row {
            display:flex;
            justify-content:space-between;
            align-items:center;
            font-size:14px;
            margin-bottom:8px;
        }

        .card-icon {
            height:20px;
            margin-right:8px;
        }
    </style>
</head>

<div class="page-bg">
    <div class="invoice-wrapper">

        <div class="header">
            <img src="${BASE_URL}/public/homiqly.png" style="width:140px;" />
            <div style="color:#666; font-size:14px;">${bookingDateFormatted}</div>
        </div>

        <h2>Your Booking Receipt</h2>
        <p>Hello <strong>${userName}</strong>, here are the details of your booking.</p>

        <div class="total-box">
            <span>Total</span>
            <span>${currencySymbol}${finalTotal.toFixed(2)}</span>
        </div>

        <h3>Pricing Summary</h3>
        <table>
            <tr><td>Subtotal</td><td style="text-align:right;">${currencySymbol}${subtotal.toFixed(2)}</td></tr>

            ${promoDiscount > 0 ? `
            <tr>
                <td>Promo Discount</td>
                <td style="text-align:right; color:green;">-${currencySymbol}${promoDiscount.toFixed(2)}</td>
            </tr>` : ""}

            <tr><td>Taxes</td><td style="text-align:right;">${currencySymbol}${taxAmount.toFixed(2)}</td></tr>
        </table>

        <h3>Service Details</h3>
        <table>${receiptRows}</table>

        <hr />

        <h3>Payment Details</h3>

        <div class="payment-section">
            <div class="payment-row">
                <div style="display:flex; align-items:center;">
                    ${cardLogoUrl ? `<img src="${cardLogoUrl}" class="card-icon" />` : ""}
                    ${cardBrand} •••• ${last4}
                </div>
                <strong>${currencySymbol}${finalTotal.toFixed(2)}</strong>
            </div>

            <div style="font-size:13px; color:#777;">
                ${moment(booking.bookingDate).format("MM/DD/YY")} ${moment(booking.bookingTime, "HH:mm:ss").format("hh:mm A")}
            </div>

            <div style="font-size:13px; margin-top:5px;">
                Receipt sent to: <strong>${receiptEmail}</strong>
            </div>
        </div>

        <hr />

        <p style="font-size:13px; color:#777;">
            Booking ID: <strong>#${booking_id}</strong><br>
            Professional: <strong>${vendorName}</strong><br>
            Scheduled on: <strong>${bookingDateFormatted} at ${bookingTimeFormatted}</strong>
        </p>

    </div>
</div>
`;

};

module.exports = { buildBookingInvoiceHTML };
