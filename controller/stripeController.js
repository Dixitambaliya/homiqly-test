const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
const nodemailer = require("nodemailer");



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

// ✅ createPaymentIntent.js
exports.createPaymentIntent = asyncHandler(async (req, res) => {
  const { cart_id } = req.body;

  if (!cart_id) {
    return res.status(400).json({ error: "'cart_id' is required" });
  }

  // ✅ Fetch cart details along with user_id
  const [cartRows] = await db.query(
    `SELECT sc.cart_id, sc.user_id, sc.vendor_id, sc.notes, sc.bookingMedia, sc.bookingDate, sc.bookingTime,
            sc.package_id, p.packageName
     FROM service_cart sc
     LEFT JOIN packages p ON sc.package_id = p.package_id
     WHERE sc.cart_id = ?`,
    [cart_id]
  );

  if (cartRows.length === 0) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const cart = cartRows[0];

  // ✅ Fetch sub-packages
  const [subPackages] = await db.query(
    `SELECT cpi.sub_package_id AS item_id, pi.itemName, cpi.price, cpi.quantity
     FROM cart_package_items cpi
     LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
     WHERE cpi.cart_id = ?`,
    [cart_id]
  );

  // ✅ Fetch addons
  const [addons] = await db.query(
    `SELECT ca.addon_id, a.addonName, ca.price
     FROM cart_addons ca
     LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
     WHERE ca.cart_id = ?`,
    [cart_id]
  );

  // ✅ Calculate total amount (CAD)
  let totalAmount = 0;
  const metadata = { cart_id };

  subPackages.forEach((item, idx) => {
    const quantity = parseInt(item.quantity) || 1;
    const price = parseFloat(item.price) || 0;
    totalAmount += price * quantity;
    metadata[`item_${idx}`] = `${item.itemName || "Item"} x${quantity} @${price}`;
  });

  addons.forEach((addon, idx) => {
    const price = parseFloat(addon.price) || 0;
    totalAmount += price;
    metadata[`addon_${idx}`] = addon.addonName || "Addon";
  });

  if (totalAmount <= 0) {
    return res.status(400).json({ error: "Total amount must be greater than 0" });
  }

  metadata.totalAmount = totalAmount.toFixed(2);

  // ✅ Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100), // in cents
    currency: "cad",
    metadata,
    payment_method_types: ["card"],
  });

  // ✅ Save payment record in DB
  await db.query(
    `INSERT INTO payments (user_id, payment_intent_id, cart_id, amount, currency, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cart.user_id, paymentIntent.id, cart_id, totalAmount, "cad", "pending"]
  );

  res.status(200).json({
    clientSecret: paymentIntent.client_secret,
    amount: totalAmount,
    currency: "cad",
    paymentIntentId: paymentIntent.id,
  });
});


// ✅ stripeWebhook.js
exports.stripeWebhook = asyncHandler(async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  res.status(200).json({ received: true });

  if (event.type !== "payment_intent.succeeded") {
    console.log("ℹ️ Ignored event type:", event.type);
    return;
  }

  const paymentIntent = event.data.object;
  const paymentIntentId = paymentIntent.id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT cart_id, user_id, amount, currency FROM payments WHERE payment_intent_id = ? LIMIT 1`,
      [paymentIntentId]
    );
    if (!rows.length) {
      console.warn("⚠️ No cart found for payment intent:", paymentIntentId);
      await connection.rollback();
      return;
    }

    const { cart_id, user_id, amount, currency } = rows[0];

    const [[cart]] = await connection.query(
      `SELECT * FROM service_cart WHERE cart_id = ? LIMIT 1`,
      [cart_id]
    );
    if (!cart) {
      console.warn("⚠️ Cart not found:", cart_id);
      await connection.rollback();
      return;
    }

    await connection.query(
      `UPDATE payments SET status = 'completed' WHERE payment_intent_id = ?`,
      [paymentIntentId]
    );

    // 🔎 Get all package_ids from cart_packages
    // 🔎 Get first package_id from cart_packages
    const [cartPackages] = await connection.query(
      `SELECT package_id FROM cart_packages WHERE cart_id = ? LIMIT 1`,
      [cart_id]
    );
    const packageId = cartPackages.length ? cartPackages[0].package_id : null;

    // ✅ Create booking with single package_id
    const [insertBooking] = await connection.query(
      `INSERT INTO service_booking 
    (user_id, bookingDate, bookingTime,
     vendor_id, notes, bookingMedia, bookingStatus, payment_status, payment_intent_id, package_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        cart.bookingDate,
        cart.bookingTime,
        cart.vendor_id,
        cart.notes,
        cart.bookingMedia,
        "pending",
        "completed",
        paymentIntentId,
        packageId,
      ]
    );
    const booking_id = insertBooking.insertId;
    console.log(`✅ Booking #${booking_id} created from Cart #${cart_id}`);

    // Move cart data to booking tables
    await connection.query(
      `INSERT INTO service_booking_packages (booking_id, package_id)
       SELECT ?, package_id FROM cart_packages WHERE cart_id = ?`,
      [booking_id, cart_id]
    );
    await connection.query(
      `INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, price, quantity)
       SELECT ?, sub_package_id, price, quantity FROM cart_package_items WHERE cart_id = ?`,
      [booking_id, cart_id]
    );
    await connection.query(
      `INSERT INTO service_booking_preferences (booking_id, preference_id)
       SELECT ?, preference_id FROM cart_preferences WHERE cart_id = ?`,
      [booking_id, cart_id]
    );
    await connection.query(
      `INSERT INTO service_booking_consents (booking_id, consent_id, answer)
       SELECT ?, consent_id, answer FROM cart_consents WHERE cart_id = ?`,
      [booking_id, cart_id]
    );
    await connection.query(
      `INSERT INTO service_booking_addons (booking_id, package_id, addon_id, price)
       SELECT ?, package_id, addon_id, price FROM cart_addons WHERE cart_id = ?`,
      [booking_id, cart_id]
    );

    // Clear cart
    await connection.query(`DELETE FROM cart_addons WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_packages WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_package_items WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_preferences WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_consents WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM service_cart WHERE cart_id = ?`, [cart_id]);

    await connection.commit();
    console.log(`✅ Booking transaction completed for booking #${booking_id}`);

    // Optional email sending...
    const [[bookingInfo]] = await connection.query(
      `SELECT sb.bookingDate, sb.bookingTime, sb.payment_status,
              u.firstName, u.lastName, u.email
       FROM service_booking sb
       LEFT JOIN users u ON sb.user_id = u.user_id
       WHERE sb.booking_id = ?`,
      [booking_id]
    );

    if (bookingInfo.email) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        const receiptHtml = `<p>Hi ${bookingInfo.firstName}, your booking #${booking_id} is confirmed.</p>`;
        await transporter.sendMail({
          from: `"Homiqly" <${process.env.EMAIL_USER}>`,
          to: bookingInfo.email,
          subject: `Receipt for Booking #${booking_id}`,
          html: receiptHtml,
        });
        console.log(`✅ Receipt email sent to ${bookingInfo.email}`);
      } catch (emailErr) {
        console.error(`⚠️ Failed to send receipt email: ${emailErr.message}`);
      }
    } else {
      console.warn("⚠️ No email defined for booking, skipping receipt");
    }

  } catch (err) {
    await connection.rollback();
    console.error("❌ Error processing Stripe webhook:", err.message);
  } finally {
    connection.release();
  }
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

