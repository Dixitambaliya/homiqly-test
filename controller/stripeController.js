const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
const { sendBookingEmail, sendVendorBookingEmail } = require("../config/utils/email/mailer");
const { recalculateCartTotals } = require("./cartCalculation")
const { buildBookingInvoiceHTML } = require("../config/utils/email/buildBookingInvoiceHTML");
const { generateBookingPDF } = require("../config/utils/email/generateBookingPDF");


// 1. Vendor creates Stripe account
exports.createStripeAccount = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: req.user.email,
        capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
        },
    });

    await db.query(`
      INSERT INTO vendor_stripe_accounts (vendor_id, stripe_account_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE stripe_account_id = VALUES(stripe_account_id)
    `, [vendorId, account.id]);

    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.CLIENT_URL}/stripe/refresh`,
        return_url: `${process.env.CLIENT_URL}/stripe/return`,
        type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
});

// 2. Refresh onboarding link
exports.refreshStripeOnboarding = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const [rows] = await db.query(
        "SELECT stripe_account_id FROM vendor_stripe_accounts WHERE vendor_id = ?",
        [vendorId]
    );

    if (!rows.length) return res.status(400).json({ error: "Stripe account not found" });

    const accountLink = await stripe.accountLinks.create({
        account: rows[0].stripe_account_id,
        refresh_url: `${process.env.CLIENT_URL}/stripe/refresh`,
        return_url: `${process.env.CLIENT_URL}/stripe/return`,
        type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
});

// 3. Get vendor account status
exports.getStripeAccountStatus = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const [rows] = await db.query(
        "SELECT stripe_account_id FROM vendor_stripe_accounts WHERE vendor_id = ?",
        [vendorId]
    );

    if (!rows.length) {
        return res.status(400).json({ error: "Stripe account not found" });
    }

    const stripeAccountId = rows[0].stripe_account_id;

    const account = await stripe.accounts.retrieve(stripeAccountId);

    const payoutsEnabled = account.payouts_enabled ? 1 : 0;
    const chargesEnabled = account.charges_enabled ? 1 : 0;
    const detailsSubmitted = account.details_submitted ? 1 : 0;

    await db.query(
        `UPDATE vendor_stripe_accounts
         SET payouts_enabled = ?, charges_enabled = ?, details_submitted = ?
         WHERE vendor_id = ?`,
        [
            payoutsEnabled,
            chargesEnabled,
            detailsSubmitted,
            vendorId
        ]
    );

    res.json({
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
        details_submitted: detailsSubmitted,
    });
});

// 4. Admin retrieves vendor Stripe info
exports.adminGetVendorStripeInfo = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        (
        SELECT
            vendor_stripe_accounts.*,
            individual_details.name AS vendor_name,
            individual_details.email AS vendor_email,
            'individual' AS vendor_type
        FROM vendor_stripe_accounts
        JOIN individual_details ON individual_details.vendor_id = vendor_stripe_accounts.vendor_id
        )
        UNION ALL
        (
        SELECT
            vendor_stripe_accounts.*,
            company_details.contactPerson AS vendor_name,
            company_details.companyEmail AS vendor_email,
            'company' AS vendor_type
        FROM vendor_stripe_accounts
        JOIN company_details ON company_details.vendor_id = vendor_stripe_accounts.vendor_id
        )`);
    res.json(rows);
});

exports.createPaymentIntent = (async (req, res) => {
    const { cart_id } = req.body;
    const user_id = req.user.user_id;

    if (!cart_id) {
        return res.status(400).json({ error: "'cart_id' is required" });
    }

    const conn = await db.getConnection();

    try {
        // 🔄 Ensure totals are up-to-date before payment
        await recalculateCartTotals(cart_id, user_id);

        await conn.beginTransaction();

        // 1️⃣ Fetch and lock the cart
        const [cartRows] = await conn.query(
            `SELECT * FROM service_cart WHERE cart_id = ? FOR UPDATE`,
            [cart_id]
        );

        if (!cartRows.length) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: "Cart not found" });
        }

        const cart = cartRows[0];

        if (!cart.bookingDate || !cart.bookingTime) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: "Please select booking date & time." });
        }

        // 2️⃣ Fetch the latest totals from cart_totals
        const [[totals]] = await conn.query(
            `SELECT subtotal, discounted_total, promo_discount, tax_amount, final_total
             FROM cart_totals
             WHERE cart_id = ? LIMIT 1`,
            [cart_id]
        );

        if (!totals) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: "Cart totals not found. Please refresh your cart." });
        }

        const finalTotal = parseFloat(totals.final_total);
        const subtotal = parseFloat(totals.subtotal);
        const discountedSubtotal = parseFloat(totals.discounted_total);
        const promoDiscount = parseFloat(totals.promo_discount);
        const taxAmount = parseFloat(totals.tax_amount);

        if (isNaN(finalTotal) || finalTotal <= 0) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: "Invalid cart total. Please refresh your cart." });
        }

        // ✅ Stripe metadata
        const metadata = {
            cart_id,
            subtotal: subtotal.toFixed(2),
            discountedSubtotal: discountedSubtotal.toFixed(2),
            promoDiscount: promoDiscount.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            finalTotal: finalTotal.toFixed(2)
        };

        // ✅ Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(finalTotal * 100),
            currency: "cad",

            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never"
            },

            payment_method_options: {
                card: {
                    request_three_d_secure: "automatic"
                }
            },

            metadata
        });


        console.log(
            "Webhook secret loaded:",
            process.env.STRIPE_WEBHOOK_SECRET
                ? process.env.STRIPE_WEBHOOK_SECRET.slice(0, 4) +
                "..." +
                process.env.STRIPE_WEBHOOK_SECRET.slice(-4)
                : "❌ NOT LOADED"
        );

        // ✅ Log payment
        await conn.query(
            `INSERT INTO payments (cart_id, user_id, payment_intent_id, amount, currency, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cart_id, user_id, paymentIntent.id, finalTotal, "cad", "pending"]
        );

        await conn.commit();
        conn.release();

        res.status(200).json({
            message: "Payment intent created successfully",
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("💥 Payment Intent Error:", err);
        res.status(500).json({ error: err.message });
    }
});


// ✅ stripeWebhook.js
exports.stripeWebhook = (async (req, res) => {
    let event;

    // 1) Verify signature and return 400 on failure
    try {
        const sig = req.headers["stripe-signature"];
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("✅ Webhook verified:", event.type);
    } catch (err) {
        console.error("❌ Stripe signature failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2) Immediate ack to Stripe
    res.status(200).send("ok");

    // 3) Async processing
    (async () => {
        const type = event.type;
        console.log(`📌 Processing event (async): ${type}`);

        // Only interested in payment_intent.succeeded here
        if (type !== "payment_intent.succeeded") {
            console.log("⏭ Ignored stripe event:", type);
            return;
        }

        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent?.id;
        if (!paymentIntentId) {
            console.error("❌ No payment_intent.id in event.data.object, aborting.");
            return;
        }

        if (paymentIntent.status !== "succeeded") {
            console.log("ℹ PaymentIntent not in succeeded state, skipping.");
            return;
        }

        // 4) Attempt to fetch expanded PaymentIntent (to get latest_charge.receipt_url).
        // If this fails, we DO NOT auto-refund — mark for manual review instead.
        let fullPI = null;
        try {
            fullPI = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
        } catch (err) {
            console.error("❌ Failed to retrieve full PaymentIntent:", err.message);
            // Update payments row (if exists) to indicate we couldn't fetch PI — manual review.
            try {
                await db.query(
                    `UPDATE payments SET status='pi_retrieve_failed_manual_review', notes=? WHERE payment_intent_id=?`,
                    [`Failed to retrieve PI: ${err.message}`, paymentIntentId]
                );
            } catch (updErr) {
                console.error("❌ Failed to update payments row after PI retrieve failure:", updErr.message);
            }
            return; // do not proceed
        }

        const receiptUrl = fullPI?.latest_charge?.receipt_url || null;

        // 5) Start DB transaction and create booking
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            console.log("🔁 DB transaction started");

            // Fetch payment + cart row (for idempotency and cart data)
            const [paymentRows] = await connection.query(
                `SELECT p.payment_id, p.cart_id, p.user_id, p.status
         FROM payments p
         WHERE p.payment_intent_id = ? LIMIT 1`,
                [paymentIntentId]
            );

            if (!paymentRows.length) {
                console.error("❌ Payment row not found for payment_intent_id:", paymentIntentId);
                // Mark a payments table row if it exists (rare), else create a record for audit
                try {
                    await connection.query(
                        `INSERT INTO payments (payment_intent_id, status, notes, created_at)
             VALUES (?, 'missing_payment_row_manual_review', ? , NOW())`,
                        [paymentIntentId, 'Webhook received but no payment row existed']
                    );
                } catch (insErr) {
                    console.error("❌ Failed to insert audit payment row:", insErr.message);
                }
                await connection.rollback();
                return;
            }

            const paymentRow = paymentRows[0];

            // Idempotency: skip if already completed or refunded
            if (paymentRow.status === "completed") {
                console.log("ℹ Payment already completed, skipping processing.");
                await connection.commit();
                return;
            }
            if (paymentRow.status && paymentRow.status.startsWith("refunded")) {
                console.log("ℹ Payment already refunded, skipping processing.");
                await connection.commit();
                return;
            }

            // Fetch cart + service_cart details
            const [cartRows] = await connection.query(
                `SELECT sc.cart_id, sc.service_id, sc.user_id, sc.bookingDate, sc.totalTime, sc.bookingTime, sc.vendor_id, sc.notes, sc.bookingMedia, sc.user_promo_code_id
         FROM service_cart sc
         WHERE sc.cart_id = ? LIMIT 1`,
                [paymentRow.cart_id]
            );

            if (!cartRows.length) {
                console.error(`❌ Cart not found for cart_id: ${paymentRow.cart_id}`);
                // Mark payment for manual review instead of auto-refund
                await connection.query(
                    `UPDATE payments SET status='cart_missing_manual_review', receipt_url=?, notes=? WHERE payment_intent_id=?`,
                    [receiptUrl, `Cart missing for cart_id ${paymentRow.cart_id}`, paymentIntentId]
                );
                await connection.rollback();
                return;
            }

            const cart = cartRows[0];

            // Load cart items
            const [cartPackages] = await connection.query(
                `SELECT cpi.sub_package_id, cpi.price, cpi.quantity, cpi.package_id, p.service_type_id
         FROM cart_package_items cpi
         JOIN packages p ON cpi.package_id = p.package_id
         WHERE cpi.cart_id = ?`,
                [cart.cart_id]
            );

            if (!cartPackages.length) {
                console.error(`❌ Cart is empty for cart_id: ${cart.cart_id}`);
                // Mark for manual review; do NOT auto-refund
                await connection.query(
                    `UPDATE payments SET status='cart_empty_manual_review', receipt_url=?, notes=? WHERE payment_intent_id=?`,
                    [receiptUrl, `Cart empty for cart_id ${cart.cart_id}`, paymentIntentId]
                );
                await connection.rollback();
                return;
            }

            // Create booking row
            const [insertBooking] = await connection.query(
                `INSERT INTO service_booking
         (user_id, service_id, bookingDate, bookingTime, vendor_id, notes, bookingMedia, bookingStatus, payment_status, payment_intent_id, totalTime, user_promo_code_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, NOW())`,
                [
                    cart.user_id,
                    cart.service_id,
                    cart.bookingDate,
                    cart.bookingTime,
                    cart.vendor_id,
                    cart.notes,
                    cart.bookingMedia,
                    paymentIntentId,
                    cart.totalTime,
                    cart.user_promo_code_id || null
                ]
            );

            const booking_id = insertBooking.insertId;

            // Insert booking packages, sub-packages, addons, prefs, consents
            const uniquePackageIds = [...new Set(cartPackages.map(p => p.package_id))];
            for (const packageId of uniquePackageIds) {
                await connection.query(
                    `INSERT INTO service_booking_packages (booking_id, package_id, created_at) VALUES (?, ?, NOW())`,
                    [booking_id, packageId]
                );
            }

            for (const pkg of cartPackages) {
                await connection.query(
                    `INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, service_type_id, price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
                    [booking_id, pkg.sub_package_id, pkg.service_type_id, pkg.price, pkg.quantity]
                );
            }

            // copy addons
            const [cartAddons] = await connection.query(
                `SELECT addon_id, sub_package_id, price FROM cart_addons WHERE cart_id = ?`,
                [cart.cart_id]
            );
            for (const a of cartAddons) {
                await connection.query(
                    `INSERT INTO service_booking_addons (booking_id, sub_package_id, addon_id, price) VALUES (?, ?, ?, ?)`,
                    [booking_id, a.sub_package_id || null, a.addon_id || null, a.price || 0]
                );
            }

            // copy preferences
            const [cartPrefs] = await connection.query(
                `SELECT preference_id, sub_package_id FROM cart_preferences WHERE cart_id = ?`,
                [cart.cart_id]
            );
            for (const p of cartPrefs) {
                await connection.query(
                    `INSERT INTO service_booking_preferences (booking_id, sub_package_id, preference_id) VALUES (?, ?, ?)`,
                    [booking_id, p.sub_package_id || null, p.preference_id || null]
                );
            }

            // copy consents
            const [cartConsents] = await connection.query(
                `SELECT consent_id, sub_package_id, answer FROM cart_consents WHERE cart_id = ?`,
                [cart.cart_id]
            );
            for (const c of cartConsents) {
                await connection.query(
                    `INSERT INTO service_booking_consents (booking_id, consent_id, sub_package_id, answer) VALUES (?, ?, ?, ?)`,
                    [booking_id, c.consent_id || null, c.sub_package_id || null, c.answer || null]
                );
            }

            // Insert booking_totals from cart_totals is_usedif present
            const [[totals]] = await connection.query(
                `SELECT subtotal, discounted_total, promo_discount, tax_amount, final_total FROM cart_totals WHERE cart_id=? LIMIT 1`,
                [cart.cart_id]
            );

            if (totals) {
                await connection.query(
                    `INSERT INTO booking_totals (booking_id, subtotal, discounted_total, promo_discount, tax_amount, final_total)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [booking_id, totals.subtotal, totals.discounted_total, totals.promo_discount, totals.tax_amount, totals.final_total]
                );
            }
            try {
                let promoData = null;
                let promoType = null; // 'user' or 'system'

                // -----------------------------------------
                // 1️⃣ Try USER PROMO (user_promo_codes)
                // -----------------------------------------
                const [[userPromo]] = await connection.query(`
        SELECT upc.user_promo_code_id, upc.promo_id, upc.usedCount, upc.maxUse
        FROM user_promo_codes upc
        WHERE upc.user_promo_code_id = ?
        LIMIT 1
    `, [cart.user_promo_code_id]);

                if (userPromo) {
                    promoData = userPromo;
                    promoType = "user";   // admin promo
                }

                // -----------------------------------------
                // 2️⃣ If NOT found → try SYSTEM PROMO
                // -----------------------------------------
                if (!promoData) {
                    const [[systemPromo]] = await connection.query(`
            SELECT spc.system_promo_code_id, spc.template_id 
            FROM system_promo_codes spc
            WHERE spc.system_promo_code_id = ?
            LIMIT 1
        `, [cart.user_promo_code_id]);

                    if (systemPromo) {
                        promoData = systemPromo;
                        promoType = "system";
                    }
                }

                // -----------------------------------------
                // 3️⃣ Update correct table
                // -----------------------------------------
                if (!promoData) {
                    console.warn("⚠️ No promo found in either table.");
                } else if (promoType === "system") {

                    await connection.query(
                        `UPDATE system_promo_codes
             SET usage_count = usage_count + 1
             WHERE system_promo_code_id = ?`,
                        [promoData.system_promo_code_id]
                    );

                    console.log("🔄 System promo usage updated:", promoData.system_promo_code_id);

                } else if (promoType === "user") {

                    await connection.query(
                        `UPDATE user_promo_codes
             SET usedCount = usedCount + 1
             WHERE user_promo_code_id = ?`,
                        [promoData.user_promo_code_id]
                    );

                    console.log("🔄 Admin/User promo usage updated:", promoData.user_promo_code_id);
                }

            } catch (promoErr) {
                console.error("⚠️ Failed to update promo usage:", promoErr.message);
            }

            // Finalize payments & booking
            await connection.query(
                `UPDATE payments SET status='completed', receipt_url=? WHERE payment_intent_id=?`,
                [receiptUrl, paymentIntentId]
            );

            await connection.query(
                `UPDATE service_booking SET payment_status='completed', bookingStatus=1 WHERE booking_id=?`,
                [booking_id]
            );

            // Clear cart rows (safe cleanup)
            await connection.query(`DELETE FROM cart_addons WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_preferences WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_consents WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_package_items WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM service_cart WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_totals WHERE cart_id=?`, [cart.cart_id]);

            await connection.commit();
            console.log("✅ Transaction committed — booking & payment completed");

            //Send emails (non-blocking)
            // sendBookingEmail(cart.user_id, { booking_id, receiptUrl });
            // sendVendorBookingEmail(cart.vendor_id, { booking_id, receiptUrl });

            // Generate PDF after 3 seconds (non-blocking)
            setTimeout(async () => {
                try {
                    const html = await buildBookingInvoiceHTML(booking_id);
                    const pdfUrl = await generateBookingPDF(html, booking_id);

                    await db.query(
                        `UPDATE payments SET pdf_receipt_url=? WHERE payment_intent_id=?`,
                        [pdfUrl, paymentIntentId]
                    );

                    console.log("📄 PDF invoice uploaded:", pdfUrl);
                } catch (err) {
                    console.error("❌ PDF generation failed:", err.message);
                }
            }, 300);


        } catch (err) {
            console.error("❌ Error during webhook processing:", err.message);
            // Rollback if possible
            try { await connection.rollback(); } catch (rbErr) { console.error("❌ Rollback failed:", rbErr?.message); }

            // Decide whether to auto-refund — default: NO
            const autoRefund = process.env.AUTO_REFUND_ON_ERROR === "true";
            if (autoRefund) {
                try {
                    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
                    console.log("↩️ Auto-refund created due to processing error:", refund.id);
                    await db.query(`UPDATE payments SET status='refunded_due_to_processing_error', refund_id=?, notes=? WHERE payment_intent_id=?`,
                        [refund.id, `Processing error: ${err.message}`, paymentIntentId]);
                } catch (refundErr) {
                    console.error("❌ Auto-refund failed:", refundErr.message);
                    // mark for manual review
                    try {
                        await db.query(`UPDATE payments SET status='refund_failed_manual_review', notes=? WHERE payment_intent_id=?`,
                            [`Processing error: ${err.message}; refund error: ${refundErr.message}`, paymentIntentId]);
                    } catch (updErr) {
                        console.error("❌ Failed to update payments after refund failure:", updErr.message);
                    }
                }
            } else {
                // Mark payments for manual review with context
                try {
                    await db.query(`UPDATE payments SET status='processing_error_manual_review', notes=? WHERE payment_intent_id=?`,
                        [`Processing error: ${err.message}`, paymentIntentId]);
                } catch (updErr) {
                    console.error("❌ Failed to mark payments row for manual review:", updErr.message);
                }
            }
        } finally {
            try { connection.release(); } catch (releaseErr) { console.error("❌ Failed to release DB connection:", releaseErr?.message); }
        }
    })();
});

exports.getPaymentStatus = asyncHandler(async (req, res) => {
    const { paymentIntentId } = req.query;

    if (!paymentIntentId) {
        return res.status(400).json({ error: "payment_intent_id is required" });
    }

    // Fetch payment + booking info
    const [rows] = await db.query(
        `SELECT p.status as payment_status, p.cart_id, sb.booking_id, sb.bookingStatus
     FROM payments p
     LEFT JOIN service_booking sb ON sb.payment_intent_id = p.payment_intent_id
     WHERE p.payment_intent_id = ? LIMIT 1`,
        [paymentIntentId]
    );

    if (!rows.length) {
        return res.status(404).json({ error: "Payment not found" });
    }

    const payment = rows[0];

    res.status(200).json({
        payment_status: payment.payment_status,        // pending / completed / failed
        booking_status: payment.bookingStatus || null, // confirmed / pending / null
        booking_id: payment.booking_id || null,
        cart_id: payment.cart_id,
    });
});