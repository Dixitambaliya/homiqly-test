const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
const { sendBookingEmail, sendVendorBookingEmail } = require("../config/utils/email/mailer");
const { recalculateCartTotals } = require("./cartCalculation")

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

exports.createPaymentIntent = asyncHandler(async (req, res) => {
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
            amount: finalTotal,
            subtotal,
            discountedSubtotal,
            promoDiscount,
            taxAmount
        });

    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error("💥 Payment Intent Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ stripeWebhook.js
exports.stripeWebhook = asyncHandler(async (req, res) => {
    console.log("✅ Incoming Stripe webhook");

    let event;

    try {
        const sig = req.headers["stripe-signature"];
        console.log("🔐 Signature received:", sig ? "YES" : "NO");

        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log("✅ Webhook verified:", event.type);

    } catch (err) {
        console.error("❌ Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Respond immediately (required by Stripe)
    res.status(200).send("ok");

    // ✅ Process asynchronously
    (async () => {
        const type = event.type;
        console.log(`📌 Processing event: ${type}`);

        // ✅ Only create booking when payment is FINAL
        if (type !== "payment_intent.succeeded") {
            console.log("⏭ Ignored:", type);
            return;
        }

        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        console.log("💳 paymentIntentId:", paymentIntentId);
        console.log("💳 paymentIntent status:", paymentIntent.status);

        if (paymentIntent.status !== "succeeded") {
            console.log("⏭ Not succeeded — skipping");
            return;
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();
            console.log("✅ Transaction started");

            // ✅ Get cart + user
            const [paymentRows] = await connection.query(
                `SELECT p.cart_id, p.user_id, p.status,
                        sc.service_id, sc.bookingDate, sc.bookingTime,
                        sc.vendor_id, sc.notes, sc.bookingMedia, sc.user_promo_code_id
                 FROM payments p
                 LEFT JOIN service_cart sc ON p.cart_id = sc.cart_id
                 WHERE p.payment_intent_id = ? LIMIT 1`,
                [paymentIntentId]
            );

            if (!paymentRows.length) {
                console.warn("⚠️ No cart found");
                await connection.query(
                    `UPDATE payments SET status='failed', notes='Cart not found'
                     WHERE payment_intent_id=?`,
                    [paymentIntentId]
                );
                await connection.commit();
                return;
            }

            const cart = paymentRows[0];
            console.log("✅ Cart found:", cart.cart_id);

            // ✅ Idempotency check
            if (cart.status === "completed") {
                console.log("ℹ Already processed — skipping");
                await connection.commit();
                return;
            }

            // ✅ Load cart items
            const [cartPackages] = await connection.query(
                `SELECT cpi.sub_package_id, cpi.price, cpi.quantity,
                        cpi.package_id, p.service_type_id
                 FROM cart_package_items cpi
                 JOIN packages p ON cpi.package_id = p.package_id
                 WHERE cpi.cart_id = ?`,
                [cart.cart_id]
            );

            if (!cartPackages.length) {
                console.warn("⚠️ Cart empty");
                await connection.query(
                    `UPDATE payments SET status='failed', notes='Cart empty'
                     WHERE payment_intent_id=?`,
                    [paymentIntentId]
                );
                await connection.commit();
                return;
            }

            // ✅ Create booking
            const [insertBooking] = await connection.query(
                `INSERT INTO service_booking
                 (user_id, service_id, bookingDate, bookingTime, vendor_id,
                  notes, bookingMedia, bookingStatus, payment_status,
                  payment_intent_id, user_promo_code_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cart.user_id,
                    cart.service_id,
                    cart.bookingDate,
                    cart.bookingTime,
                    cart.vendor_id,
                    cart.notes,
                    cart.bookingMedia,
                    0,
                    "pending",
                    paymentIntentId,
                    cart.user_promo_code_id || null
                ]
            );

            const booking_id = insertBooking.insertId;
            console.log("✅ Booking created:", booking_id);

            // ✅ Insert packages
            const uniquePackageIds = [...new Set(cartPackages.map(p => p.package_id))];
            for (const packageId of uniquePackageIds) {
                await connection.query(
                    `INSERT INTO service_booking_packages (booking_id, package_id, created_at)
                     VALUES (?, ?, NOW())`,
                    [booking_id, packageId]
                );
            }

            // ✅ Insert sub-packages
            let totalBookingTime = 0;

            for (const pkg of cartPackages) {
                const [[itemTimeRow]] = await connection.query(
                    `SELECT timeRequired FROM package_items WHERE item_id=?`,
                    [pkg.sub_package_id]
                );

                const itemTime = (itemTimeRow?.timeRequired || 0) * (pkg.quantity || 1);
                totalBookingTime += itemTime;

                await connection.query(
                    `INSERT INTO service_booking_sub_packages
                     (booking_id, sub_package_id, service_type_id, price, quantity)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        booking_id,
                        pkg.sub_package_id,
                        pkg.service_type_id,
                        pkg.price,
                        pkg.quantity
                    ]
                );
            }

            await connection.query(
                `UPDATE service_booking SET totalTime=? WHERE booking_id=?`,
                [Math.round(totalBookingTime), booking_id]
            );

            // ✅ Insert booking_totals
            const [[totals]] = await connection.query(
                `SELECT subtotal, discounted_total, promo_discount, tax_amount, final_total
                 FROM cart_totals WHERE cart_id=? LIMIT 1`,
                [cart.cart_id]
            );

            if (totals) {
                await connection.query(
                    `INSERT INTO booking_totals
                     (booking_id, subtotal, discounted_total, promo_discount, tax_amount, final_total)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        booking_id,
                        totals.subtotal,
                        totals.discounted_total,
                        totals.promo_discount,
                        totals.tax_amount,
                        totals.final_total
                    ]
                );
            }

            // ✅ Mark payment completed
            await connection.query(
                `UPDATE payments SET status='completed' WHERE payment_intent_id=?`,
                [paymentIntentId]
            );

            await connection.query(
                `UPDATE service_booking
                 SET payment_status='completed', bookingStatus=1
                 WHERE booking_id=?`,
                [booking_id]
            );

            // ✅ Clear cart data
            await connection.query(`DELETE FROM cart_addons WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_preferences WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_consents WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_package_items WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM service_cart WHERE cart_id=?`, [cart.cart_id]);
            await connection.query(`DELETE FROM cart_totals WHERE cart_id=?`, [cart.cart_id]);

            await connection.commit();
            console.log("✅ Booking finalized & cart cleared");

            // ✅ Send emails
            await sendBookingEmail(cart.user_id, { booking_id });
            await sendVendorBookingEmail(cart.vendor_id, { booking_id });

            console.log("✅ Webhook completed successfully ✅");

        } catch (err) {
            console.error("❌ ERROR:", err.message);
            await connection.rollback();
            console.error("↩️ Rolled back");
        } finally {
            connection.release();
        }
    })();
});



exports.confirmPaymentIntentManually = asyncHandler(async (req, res) => {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ message: "Missing paymentIntentId" });

    // Confirm the intent (for testing, only if it's 'requires_confirmation')
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "requires_confirmation") {
        const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId);
        return res.status(200).json({ message: "Payment confirmed", status: confirmedIntent.status });
    }

    res.status(400).json({ message: "Intent is not in a confirmable state", status: paymentIntent.status });
});

// 6. Confirm booking after payment
exports.confirmBooking = asyncHandler(async (req, res) => {
    const { user_id, vendor_id, serviceId, paymentIntentId } = req.body;
    if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment Intent ID required." });
    }

    // Validate payment
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment not completed." });
    }

    // Store booking
    await db.query(
        "INSERT INTO service_booking (user_id, vendor_id, service_id, amount, payment_intent_id, status) VALUES (?, ?, ?, ?, ?, ?)",
        [user_id, vendor_id, serviceId, paymentIntent.amount, paymentIntent.id, "confirmed"]
    );

    res.json({ message: "Booking confirmed." });
});

// 8. Vendor sees their bookings
exports.getVendorBookings = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;
    const [rows] = await db.query(
        "SELECT * FROM bookings WHERE vendor_id = ? ORDER BY created_at DESC",
        [vendorId]
    );
    res.json(rows);
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
