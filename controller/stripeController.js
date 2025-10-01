const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
const nodemailer = require("nodemailer");
const { sendBookingEmail } = require("../config/mailer")

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

  // ✅ Fetch cart details
  const [cartRows] = await db.query(
    `SELECT sc.*, sc.user_promo_code_id, p.packageName
     FROM service_cart sc
     LEFT JOIN packages p ON sc.package_id = p.package_id
     WHERE sc.cart_id = ?`,
    [cart_id]
  );

  if (!cartRows.length) return res.status(404).json({ error: "Cart not found" });
  const cart = cartRows[0];

  if (!cart.bookingDate || !cart.bookingTime) {
    return res.status(400).json({
      error: "Incomplete booking details. Please select booking date and time."
    });
  }

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
    `SELECT ca.sub_package_id, a.addonName, ca.price
     FROM cart_addons ca
     LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
     WHERE ca.cart_id = ?`,
    [cart_id]
  );

  // ✅ Fetch preferences
  const [preferences] = await db.query(
    `SELECT cp.sub_package_id, bp.preferenceValue, bp.preferencePrice
     FROM cart_preferences cp
     LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
     WHERE cp.cart_id = ?`,
    [cart_id]
  );

  // ✅ Fetch promo if exists
  let appliedPromo = null;
  if (cart.user_promo_code_id) {
    const [[userPromo]] = await db.query(
      `SELECT upc.*, pc.discountValue, pc.minSpend, pc.start_date, pc.end_date
       FROM user_promo_codes upc
       LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
       WHERE upc.user_promo_code_id = ? AND upc.user_id = ?`,
      [cart.user_promo_code_id, cart.user_id]
    );

    if (userPromo) {
      if (userPromo.usedCount < userPromo.maxUse) {
        if (userPromo.source_type === "admin") {
          if ((!userPromo.start_date || new Date(userPromo.start_date) <= new Date()) &&
            (!userPromo.end_date || new Date(userPromo.end_date) >= new Date())) {
            appliedPromo = userPromo;
          }
        } else if (userPromo.source_type === "system") {
          // ✅ Get full details from system_promo_codes
          const [systemPromoRows] = await db.query(
            `SELECT * FROM system_promo_codes WHERE code = ? AND user_id = ? LIMIT 1`,
            [userPromo.code, cart.user_id]
          );
          if (systemPromoRows.length) appliedPromo = systemPromoRows[0];
        }
      }
    }
  }

  // ✅ Calculate subtotal including sub-packages, addons, preferences
  let subtotal = 0;
  const metadata = { cart_id };

  subPackages.forEach((item, idx) => {
    const quantity = parseInt(item.quantity) || 1;
    const price = parseFloat(item.price) || 0;
    subtotal += price * quantity;
    metadata[`item_${idx}`] = `${item.itemName || "Item"} x${quantity} @${price}`;
  });

  addons.forEach((addon, idx) => {
    const price = parseFloat(addon.price) || 0;
    subtotal += price;
    metadata[`addon_${idx}`] = addon.addonName || "Addon";
  });

  preferences.forEach((pref, idx) => {
    const price = parseFloat(pref.preferencePrice) || 0;
    subtotal += price;
    metadata[`preference_${idx}`] = pref.preferenceValue || "Preference";
  });

  // ✅ Apply percentage discount
  let discount = 0;
  let totalAmount = subtotal;

  if (appliedPromo && (!appliedPromo.minSpend || subtotal >= appliedPromo.minSpend)) {
    discount = parseFloat(appliedPromo.discountValue || 0); // percentage
    totalAmount = subtotal * (1 - discount / 100);
    metadata.promo_code = appliedPromo.code;
    metadata.user_promo_code_id = appliedPromo.user_promo_code_id || null;
    metadata.promo_source = appliedPromo.source_type || "system";
  }

  metadata.subtotal = subtotal;
  metadata.discount = discount;
  metadata.totalAmount = totalAmount.toFixed(2);

  if (totalAmount <= 0) return res.status(400).json({ error: "Total amount must be greater than 0" });

  // ✅ Check if PaymentIntent exists
  const [existingPayment] = await db.query(
    `SELECT payment_intent_id FROM payments WHERE cart_id = ? AND status = 'pending' LIMIT 1`,
    [cart_id]
  );

  let paymentIntent;

  if (existingPayment.length > 0) {
    // Update existing PaymentIntent
    paymentIntent = await stripe.paymentIntents.update(existingPayment[0].payment_intent_id, {
      amount: Math.round(totalAmount * 100),
      metadata,
    });

    await db.query(
      `UPDATE payments SET amount = ?, currency = 'cad' WHERE payment_intent_id = ?`,
      [totalAmount, paymentIntent.id]
    );

  } else {
    // Create new PaymentIntent
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "cad",
      payment_method_types: ["card"],
      capture_method: "manual",
      metadata,
    });

    await db.query(
      `INSERT INTO payments (user_id, payment_intent_id, cart_id, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cart.user_id, paymentIntent.id, cart_id, totalAmount, "cad", "pending"]
    );
  }

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

  // ✅ Immediately acknowledge Stripe
  res.status(200).json({ received: true });

  // Background task – don’t block Stripe
  (async () => {
    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent.id;

    if (event.type !== "payment_intent.amount_capturable_updated") {
      console.log("ℹ️ Ignored event type:", event.type);
      return;
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 🔎 Find payment + cart
      const [paymentRows] = await connection.query(
        `SELECT p.cart_id, p.user_id, p.status, sc.service_id, sc.bookingDate, sc.bookingTime, sc.vendor_id, sc.notes, sc.bookingMedia
         FROM payments p
         LEFT JOIN service_cart sc ON p.cart_id = sc.cart_id
         WHERE p.payment_intent_id = ? LIMIT 1`,
        [paymentIntentId]
      );

      if (!paymentRows.length) {
        console.warn("⚠️ No cart found for payment intent:", paymentIntentId);
        await connection.query(
          `UPDATE payments SET status = 'failed', notes = 'Cart not found' WHERE payment_intent_id = ?`,
          [paymentIntentId]
        );
        await connection.commit();
        return;
      }

      const cart = paymentRows[0];
      const { cart_id, user_id, status } = cart;

      if (status === "completed") {
        console.log(`ℹ️ PaymentIntent ${paymentIntentId} already captured, skipping.`);
        await connection.commit();
        return;
      }

      // 🔎 Fetch all cart packages with parent package info
      const [cartPackages] = await connection.query(
        `SELECT cpi.sub_package_id, cpi.price, cpi.quantity, cpi.package_id, p.service_type_id
         FROM cart_package_items cpi
         JOIN packages p ON cpi.package_id = p.package_id
         WHERE cpi.cart_id = ?`,
        [cart_id]
      );

      if (!cartPackages.length) {
        console.warn("⚠️ Cart has no packages/sub-packages");
        await connection.query(
          `UPDATE payments SET status = 'failed', notes = 'Cart has no packages' WHERE payment_intent_id = ?`,
          [paymentIntentId]
        );
        await connection.commit();
        return;
      }

      // ✅ Create booking (main booking row)
      const [insertBooking] = await connection.query(
        `INSERT INTO service_booking 
          (user_id, service_id, bookingDate, bookingTime, vendor_id, notes, bookingMedia, bookingStatus, payment_status, payment_intent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          cart.service_id,
          cart.bookingDate,
          cart.bookingTime,
          cart.vendor_id,
          cart.notes,
          cart.bookingMedia,
          "pending",
          "pending",
          paymentIntentId
        ]
      );

      const booking_id = insertBooking.insertId;
      console.log(`✅ Booking #${booking_id} created from Cart #${cart_id}`);

      // ==================================
      // Move cart data to booking tables
      // ==================================
      for (const pkg of cartPackages) {
        const { sub_package_id, service_type_id, price, quantity } = pkg;

        // Sub-packages
        await connection.query(
          `INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, service_type_id, price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [booking_id, sub_package_id, service_type_id, price, quantity]
        );

        // Addons
        const [addons] = await connection.query(
          `SELECT addon_id, price FROM cart_addons WHERE cart_id = ? AND sub_package_id = ?`,
          [cart_id, sub_package_id]
        );
        for (const addon of addons) {
          await connection.query(
            `INSERT INTO service_booking_addons (booking_id, sub_package_id, addon_id, price)
             VALUES (?, ?, ?, ?)`,
            [booking_id, sub_package_id, addon.addon_id, addon.price]
          );
        }

        // Preferences
        const [prefs] = await connection.query(
          `SELECT preference_id FROM cart_preferences WHERE cart_id = ? AND sub_package_id = ?`,
          [cart_id, sub_package_id]
        );
        for (const pref of prefs) {
          await connection.query(
            `INSERT INTO service_booking_preferences (booking_id, sub_package_id, preference_id)
             VALUES (?, ?, ?)`,
            [booking_id, sub_package_id, pref.preference_id]
          );
        }

        // Consents
        const [consents] = await connection.query(
          `SELECT consent_id, answer FROM cart_consents WHERE cart_id = ? AND sub_package_id = ?`,
          [cart_id, sub_package_id]
        );
        for (const consent of consents) {
          await connection.query(
            `INSERT INTO service_booking_consents (booking_id, sub_package_id, consent_id, answer)
             VALUES (?, ?, ?, ?)`,
            [booking_id, sub_package_id, consent.consent_id, consent.answer]
          );
        }
      }

      // ✅ Promo usage tracking
      if (cart.user_promo_code_id) {
        await connection.query(
          `UPDATE user_promo_codes SET usedCount = usedCount + 1 WHERE user_promo_code_id = ? AND usedCount < maxUse`,
          [cart.user_promo_code_id]
        );
      }

      // ✅ Capture payment
      await stripe.paymentIntents.capture(paymentIntentId);
      console.log(`💰 Payment captured for PaymentIntent ${paymentIntentId}`);

      // ✅ Update statuses
      await connection.query(
        `UPDATE payments SET status = 'completed' WHERE payment_intent_id = ?`,
        [paymentIntentId]
      );
      await connection.query(
        `UPDATE service_booking SET payment_status = 'completed', bookingStatus = 'confirmed' WHERE booking_id = ?`,
        [booking_id]
      );

      // ✅ Clear cart
      await connection.query(`DELETE FROM cart_addons WHERE cart_id = ?`, [cart_id]);
      await connection.query(`DELETE FROM cart_preferences WHERE cart_id = ?`, [cart_id]);
      await connection.query(`DELETE FROM cart_consents WHERE cart_id = ?`, [cart_id]);
      await connection.query(`DELETE FROM cart_package_items WHERE cart_id = ?`, [cart_id]);
      await connection.query(`DELETE FROM service_cart WHERE cart_id = ?`, [cart_id]);

      await connection.commit();
      console.log(`✅ Booking transaction completed for booking #${booking_id}`);

      // 🔽 Fetch full booking details to send email
      const [[bookingDetails]] = await connection.query(
        `SELECT sb.*,
                pk.packageName,
                GROUP_CONCAT(DISTINCT sp.itemName) AS sub_packages,
                GROUP_CONCAT(DISTINCT a.addonName) AS addons,
                GROUP_CONCAT(DISTINCT pref.preferenceValue) AS preferences,
                GROUP_CONCAT(DISTINCT CONCAT(c.question, ': ', sbc.answer) SEPARATOR ', ') AS consents
         FROM service_booking sb
         LEFT JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
         LEFT JOIN packages pk ON sbp.package_id = pk.package_id
         LEFT JOIN service_booking_sub_packages sbsp ON sb.booking_id = sbsp.booking_id
         LEFT JOIN package_items sp ON sbsp.sub_package_id = sp.item_id
         LEFT JOIN service_booking_addons sba ON sb.booking_id = sba.booking_id
         LEFT JOIN package_addons a ON sba.addon_id = a.addon_id
         LEFT JOIN service_booking_preferences sbpr ON sb.booking_id = sbpr.booking_id
         LEFT JOIN booking_preferences pref ON sbpr.preference_id = pref.preference_id
         LEFT JOIN service_booking_consents sbc ON sb.booking_id = sbc.booking_id
         LEFT JOIN package_consent_forms c ON sbc.consent_id = c.consent_id
         WHERE sb.booking_id = ?`,
        [booking_id]
      );

      // 🔽 Send booking confirmation email (non-blocking)
      sendBookingEmail(user_id, bookingDetails)
        .then(() => console.log("📧 Booking email sent"))
        .catch(err => console.error("❌ Email send failed:", err.message));

    } catch (err) {
      console.error("❌ Webhook processing error:", err.message);
      await connection.rollback();
      try {
        await stripe.paymentIntents.cancel(paymentIntentId, { cancellation_reason: "abandoned" });
        await connection.query(
          `UPDATE payments SET status = 'failed', notes = 'Processing error' WHERE payment_intent_id = ?`,
          [paymentIntentId]
        );
      } catch (cancelErr) {
        console.error("⚠️ Failed to cancel PaymentIntent:", cancelErr.message);
      }
    } finally {
      connection.release();
    }
  })(); // end background task
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
