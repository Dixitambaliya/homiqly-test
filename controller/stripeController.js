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
  const { packages, metadata = {}, cart_id } = req.body;

  if (!packages || !cart_id) {
    return res.status(400).json({ error: "'packages' and 'cart_id' are required" });
  }

  // Parse packages
  let parsedPackages = [];
  try {
    parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
    if (!Array.isArray(parsedPackages)) {
      return res.status(400).json({ error: "'packages' must be an array." });
    }
  } catch (e) {
    return res.status(400).json({
      error: "'packages' must be valid JSON array",
      details: e.message,
    });
  }

  // Calculate total
  let totalAmount = 0;
  const metadataToStore = { ...metadata, cart_id };

  parsedPackages.forEach((pkg, index) => {
    const { package_id, package_name, sub_packages = [] } = pkg;
    const pkgKey = `package_${index}`;
    const pkgLabel = `${package_name || "Package"} (ID:${package_id})`;
    metadataToStore[pkgKey] = pkgLabel;

    sub_packages.forEach((item, itemIndex) => {
      const quantity =
        item.quantity && Number.isInteger(item.quantity) && item.quantity > 0
          ? item.quantity
          : 1;
      const price = item.price || 0;
      totalAmount += price * quantity;

      const itemName = item.item_name || `Item_${itemIndex}`;
      const itemKey = `pkg${index}_item${itemIndex}`;
      metadataToStore[itemKey] = `${itemName} x${quantity} @${price}`;
    });
  });

  if (totalAmount <= 0) {
    return res.status(400).json({ error: "Total amount must be greater than 0" });
  }

  metadataToStore.totalAmount = totalAmount.toString();

  // ✅ Create PaymentIntent for testing (card only, no redirects)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100), // cents
    currency: "cad",
    metadata: metadataToStore,
    payment_method_types: ["card"], // force only card payment
    // automatic_payment_methods: { enabled: true, allow_redirects: "never" }, // prevent redirect issues
  });

  // Save payment record in DB
  await db.query(
    `INSERT INTO payments (user_id, payment_intent_id, cart_id, amount, currency, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.user_id,
      paymentIntent.id,
      cart_id,
      totalAmount,
      "cad",
      "pending",
    ]
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

  // Quickly acknowledge Stripe
  res.status(200).json({ received: true });

  // Only handle payment_intent.succeeded
  if (event.type !== "payment_intent.succeeded") {
    console.log("ℹ️ Ignored event type:", event.type);
    return;
  }

  const paymentIntent = event.data.object;
  const paymentIntentId = paymentIntent.id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 🔎 Find payment + cart
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

    // 🔎 Fetch cart
    const [[cart]] = await connection.query(
      `SELECT * FROM service_cart WHERE cart_id = ? LIMIT 1`,
      [cart_id]
    );
    if (!cart) {
      console.warn("⚠️ Cart not found:", cart_id);
      await connection.rollback();
      return;
    }

    // ✅ Update payment record
    await connection.query(
      `UPDATE payments SET status = 'completed' WHERE payment_intent_id = ?`,
      [paymentIntentId]
    );

    // ✅ Create booking
    const [insertBooking] = await connection.query(
      `INSERT INTO service_booking 
        (user_id, bookingDate, bookingTime,
         vendor_id, notes, bookingMedia, bookingStatus, payment_status, payment_intent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );
    const booking_id = insertBooking.insertId;
    console.log(`✅ Booking #${booking_id} created from Cart #${cart_id}`);

    // ✅ Move cart data to booking tables
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

    // ✅ Clear cart
    await connection.query(`DELETE FROM cart_addons WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_packages WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_package_items WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_preferences WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM cart_consents WHERE cart_id = ?`, [cart_id]);
    await connection.query(`DELETE FROM service_cart WHERE cart_id = ?`, [cart_id]);

    await connection.commit();

    // --------------------------
    // 📧 Send Receipt Email
    // --------------------------
    const [[bookingInfo]] = await connection.query(
      `SELECT sb.bookingDate, sb.bookingTime, sb.payment_status,
              u.firstName, u.lastName, u.email,
              v.vendorType,
              IF(v.vendorType = 'company', cdet.companyName, idet.name) AS vendorName,
              IF(v.vendorType = 'company', cdet.companyEmail, idet.email) AS vendorEmail,
              IF(v.vendorType = 'company', cdet.companyPhone, idet.phone) AS vendorPhone,
              IF(v.vendorType = 'company', cdet.contactPerson, NULL) AS vendorContactPerson
       FROM service_booking sb
       LEFT JOIN users u ON sb.user_id = u.user_id
       LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
       LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
       LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
       WHERE sb.booking_id = ?`,
      [booking_id]
    );

    const [packages] = await connection.query(
      `SELECT p.package_id, p.packageName
       FROM service_booking_packages sbp
       JOIN packages p ON sbp.package_id = p.package_id
       WHERE sbp.booking_id = ?`,
      [booking_id]
    );

    const [items] = await connection.query(
      `SELECT sbsp.sub_package_id AS item_id, pi.itemName, sbsp.price, sbsp.quantity,
              pi.itemMedia, pi.timeRequired, pi.package_id
       FROM service_booking_sub_packages sbsp
       LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
       WHERE sbsp.booking_id = ?`,
      [booking_id]
    );

    const [preferences] = await connection.query(
      `SELECT bp.preferenceValue
       FROM booking_preferences bp
       JOIN service_booking_preferences sp ON bp.preference_id = sp.preference_id
       WHERE sp.booking_id = ?`,
      [booking_id]
    );

    const [consents] = await connection.query(
      `SELECT sc.question, bc.answer
       FROM service_booking_consents bc
       JOIN package_consent_forms sc ON bc.consent_id = sc.consent_id
       WHERE bc.booking_id = ?`,
      [booking_id]
    );

    // Group packages with items
    const groupedPackages = packages.map((pkg) => ({
      ...pkg,
      items: items.filter((i) => i.package_id === pkg.package_id),
    }));

    const preferenceText = preferences.map((p) => p.preferenceValue).join(", ") || "None";
    const consentText = consents.length > 0
      ? consents.map((c) => `${c.question}: ${c.answer || "N/A"}`).join("\n")
      : "None";

    // ✅ Safe charge access
    const charge = paymentIntent.charges?.data?.[0] || {};
    const stripeMetadata = {
      cardBrand: charge?.payment_method_details?.card?.brand || "N/A",
      last4: charge?.payment_method_details?.card?.last4 || "****",
      receiptEmail: paymentIntent.receipt_email || bookingInfo?.email || "N/A",
      chargeId: charge?.id || "N/A",
      paidAt: new Date(paymentIntent.created * 1000).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      paymentIntentId,
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const receiptHtml = `
      <div style="text-align:center;">
        <h2>Hi ${bookingInfo.firstName} ${bookingInfo.lastName},</h2>
        <p>Thank you for your payment. Here is your booking receipt:</p>
        <p><strong>Booking ID:</strong> ${booking_id}</p>
        <p><strong>Date:</strong> ${bookingInfo.bookingDate}</p>
        <p><strong>Time:</strong> ${bookingInfo.bookingTime}</p>
        <p><strong>Vendor:</strong> ${bookingInfo.vendorName} (${bookingInfo.vendorEmail}, ${bookingInfo.vendorPhone})</p>
        ${bookingInfo.vendorContactPerson ? `<p><strong>Contact Person:</strong> ${bookingInfo.vendorContactPerson}</p>` : ""}
        <hr/>
        ${groupedPackages.map(pkg => `
          <h3>Package: ${pkg.packageName}</h3>
          <ul>
            ${pkg.items.map(item => `<li>${item.itemName} - $${item.price} × ${item.quantity} = $${item.price * item.quantity}</li>`).join("")}
          </ul>
        `).join("")}
        <hr/>
        <p><strong>Preferences:</strong> ${preferenceText}</p>
        <p><strong>Consents:</strong><br/>${consentText.replace(/\n/g, "<br/>")}</p>
        <p><strong>Total Paid:</strong> ${currency.toUpperCase()} $${amount / 100}</p>
        <p><strong>Paid At:</strong> ${stripeMetadata.paidAt}</p>
        <p><strong>Payment Method:</strong> ${stripeMetadata.cardBrand.toUpperCase()} ending in ${stripeMetadata.last4}</p>
        <p><strong>Stripe PaymentIntent ID:</strong> ${stripeMetadata.paymentIntentId}</p>
        <p><strong>Stripe Charge ID:</strong> ${stripeMetadata.chargeId}</p>
        <hr/>
        <p>We appreciate your business. Contact support if needed.</p>
      </div>
    `;

    transporter.sendMail({
      from: `"Homiqly" <${process.env.EMAIL_USER}>`,
      to: bookingInfo.email,
      subject: `Receipt for Booking #${booking_id}`,
      html: receiptHtml,
    });

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

