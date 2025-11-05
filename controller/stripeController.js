const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")
const { sendBookingEmail, sendVendorBookingEmail } = require("../config/utils/email/mailer");

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

  if (!cart_id) {
    return res.status(400).json({ error: "'cart_id' is required" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // ✅ Lock cart
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
      return res.status(400).json({
        error: "Incomplete booking details. Please select booking date and time.",
      });
    }

    // ✅ Fetch sub-packages, addons, preferences
    const [subPackages] = await conn.query(
      `SELECT cpi.sub_package_id AS item_id, pi.itemName, cpi.price, cpi.quantity
       FROM cart_package_items cpi
       LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
       WHERE cpi.cart_id = ?`,
      [cart_id]
    );

    const [addons] = await conn.query(
      `SELECT ca.sub_package_id, a.addonName, ca.price
       FROM cart_addons ca
       LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
       WHERE ca.cart_id = ?`,
      [cart_id]
    );

    const [preferences] = await conn.query(
      `SELECT cp.sub_package_id, bp.preferenceValue, bp.preferencePrice
       FROM cart_preferences cp
       LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
       WHERE cp.cart_id = ?`,
      [cart_id]
    );

    // ✅ Fetch active service tax
    const [serviceTaxRows] = await conn.query(
      `SELECT taxName, taxPercentage 
       FROM service_taxes 
       WHERE status = '1' 
       ORDER BY created_at ASC LIMIT 1`
    );

    let taxPercentage = 0;
    let taxName = "Service Tax";
    if (serviceTaxRows.length) {
      taxPercentage = parseFloat(serviceTaxRows[0].taxPercentage) || 0;
      taxName = serviceTaxRows[0].taxName || "Service Tax";
    }

    // ✅ Step 1: Calculate subtotal (before promo/tax)
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

    // ✅ Step 2: Apply Promo Discount FIRST
    let appliedPromo = null;
    let discountAmount = 0;
    let discountedSubtotal = subtotal;

    if (cart.user_promo_code_id) {
      // Check user promo or system promo
      const [userPromoRows] = await conn.query(
        `SELECT * FROM user_promo_codes WHERE user_id = ? AND user_promo_code_id = ? LIMIT 1`,
        [cart.user_id, cart.user_promo_code_id]
      );

      if (userPromoRows.length) {
        const promo = userPromoRows[0];
        if (promo.source_type === "admin" && promo.promo_id) {
          const [adminPromoRows] = await conn.query(
            `SELECT * FROM promo_codes WHERE promo_id = ? LIMIT 1`,
            [promo.promo_id]
          );
          if (adminPromoRows.length) {
            appliedPromo = { ...adminPromoRows[0], ...promo, source_type: "admin" };
          }
        } else if (promo.source_type === "system") {
          const [systemPromoRows] = await conn.query(
            `SELECT sc.*, st.discount_type, st.discountValue, st.code
             FROM system_promo_codes sc
             JOIN system_promo_code_templates st
               ON sc.template_id = st.system_promo_code_template_id
             WHERE sc.system_promo_code_id = ? AND sc.user_id = ? LIMIT 1`,
            [promo.system_promo_code_id || promo.user_promo_code_id, cart.user_id]
          );
          if (systemPromoRows.length) {
            appliedPromo = { ...systemPromoRows[0], source_type: "system" };
          }
        }
      }
    }

    // ✅ Step 3: Apply discount to subtotal (before tax)
    if (appliedPromo) {
      const discountValue = parseFloat(appliedPromo.discountValue || 0);
      const discountType = appliedPromo.discount_type || "percentage";

      if (discountType === "fixed") {
        discountAmount = discountValue;
        discountedSubtotal = Math.max(0, subtotal - discountValue);
      } else {
        discountAmount = subtotal * (discountValue / 100);
        discountedSubtotal = subtotal - discountAmount;
      }

      metadata.promo_code = appliedPromo.code;
      metadata.discount = discountAmount.toFixed(2);
      metadata.promo_source = appliedPromo.source_type || "system";
    }

    // ✅ Step 4: Apply Service Tax AFTER Discount
    const taxAmount = discountedSubtotal * (taxPercentage / 100);
    const totalAmount = discountedSubtotal + taxAmount;

    metadata.subtotal = subtotal.toFixed(2);
    metadata.discountedSubtotal = discountedSubtotal.toFixed(2);
    metadata.service_tax_name = taxName;
    metadata.service_tax_percentage = taxPercentage;
    metadata.service_tax_amount = taxAmount.toFixed(2);
    metadata.totalAmount = totalAmount.toFixed(2);

    if (totalAmount <= 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Total amount must be greater than 0" });
    }

    // ✅ Step 5: Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "cad",
      payment_method_types: ["card"],
      capture_method: "manual",
      metadata,
    });

    // ✅ Step 6: Log payment intent
    await conn.query(
      `INSERT INTO payments (cart_id, user_id, payment_intent_id, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cart_id, cart.user_id, paymentIntent.id, totalAmount, "cad", "pending"]
    );

    await conn.commit();
    conn.release();

    // ✅ Step 7: Return success
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: "cad",
      paymentIntentId: paymentIntent.id,
      taxAmount,
      discountAmount,
      subtotal,
      discountedSubtotal
    });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("💥 Payment Intent Error:", err);
    return res.status(500).json({ error: err.message });
  }
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

  // ✅ Acknowledge Stripe immediately
  res.status(200).json({ received: true });

  // ⚙️ Process in background
  (async () => {
    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent.id;

    if (
      event.type !== "payment_intent.amount_capturable_updated" &&
      event.type !== "charge.captured"
    ) {
      console.log("ℹ️ Ignored event type:", event.type);
      return;
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // -----------------------------------------------------
      // CASE 1: Capture-ready PaymentIntent (before capture)
      // -----------------------------------------------------
      if (event.type === "payment_intent.amount_capturable_updated") {
        const [paymentRows] = await connection.query(
          `SELECT p.cart_id, p.user_id, p.status, sc.service_id, sc.bookingDate, sc.bookingTime, 
                  sc.vendor_id, sc.notes, sc.bookingMedia, sc.user_promo_code_id
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
        const { cart_id, user_id, status, user_promo_code_id } = cart;

        if (status === "completed") {
          console.log(`ℹ️ PaymentIntent ${paymentIntentId} already captured, skipping.`);
          await connection.commit();
          return;
        }

        // 🔹 Fetch cart packages and sub-packages
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

        // ✅ Create booking
        const [insertBooking] = await connection.query(
          `INSERT INTO service_booking 
            (user_id, service_id, bookingDate, bookingTime, vendor_id, notes, bookingMedia, 
             bookingStatus, payment_status, payment_intent_id, user_promo_code_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            cart.service_id,
            cart.bookingDate,
            cart.bookingTime,
            cart.vendor_id,
            cart.notes,
            cart.bookingMedia,
            0,
            "pending",
            paymentIntentId,
            user_promo_code_id || null,
          ]
        );

        const booking_id = insertBooking.insertId;
        let totalBookingTime = 0;

        // ✅ Insert into service_booking_packages (unique package IDs)
        const uniquePackageIds = [...new Set(cartPackages.map(pkg => pkg.package_id))];
        for (const packageId of uniquePackageIds) {
          await connection.query(
            `INSERT INTO service_booking_packages (booking_id, package_id, created_at)
             VALUES (?, ?, NOW())`,
            [booking_id, packageId]
          );
        }

        // ✅ Loop through cart sub-packages
        for (const pkg of cartPackages) {
          const { sub_package_id, service_type_id, price, quantity } = pkg;

          const [[itemTimeRow]] = await connection.query(
            `SELECT timeRequired FROM package_items WHERE item_id = ?`,
            [sub_package_id]
          );

          const itemTime = (itemTimeRow?.timeRequired || 0) * (quantity || 1);
          totalBookingTime += itemTime;

          await connection.query(
            `INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, service_type_id, price, quantity)
             VALUES (?, ?, ?, ?, ?)`,
            [booking_id, sub_package_id, service_type_id, price, quantity]
          );

          // 🔹 Addons
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

            const [[addonTimeRow]] = await connection.query(
              `SELECT addonTime FROM package_addons WHERE addon_id = ?`,
              [addon.addon_id]
            );
            totalBookingTime +=
              (addonTimeRow?.addonTime || 0) * (quantity || 1);
          }

          // 🔹 Preferences
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

          // 🔹 Consents
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

        // ✅ Update total time
        await connection.query(
          `UPDATE service_booking SET totalTime = ? WHERE booking_id = ?`,
          [Math.round(totalBookingTime), booking_id]
        );

        // ✅ Promo usage (user or system promo)
        if (user_promo_code_id) {
          const [[userPromo]] = await connection.query(
            `SELECT upc.user_promo_code_id, upc.usedCount, pc.maxUse
              FROM user_promo_codes upc
              JOIN promo_codes pc ON upc.promo_id = pc.promo_id
              WHERE upc.user_promo_code_id = ?`,
            [user_promo_code_id]
          );

          const [[systemPromo]] = await connection.query(
            `SELECT spc.system_promo_code_id, spc.usage_count, spt.maxUse
              FROM system_promo_codes spc
              JOIN system_promo_code_templates spt 
              ON spc.template_id = spt.system_promo_code_template_id
              WHERE spc.system_promo_code_id = ?`,
            [user_promo_code_id]
          );

          if (userPromo && userPromo.usedCount < userPromo.maxUse) {
            await connection.query(
              `UPDATE user_promo_codes 
               SET usedCount = usedCount + 1 
               WHERE user_promo_code_id = ?`,
              [user_promo_code_id]
            );
          } else if (systemPromo && systemPromo.usage_count < systemPromo.maxUse) {
            await connection.query(
              `UPDATE system_promo_codes 
               SET usage_count = usage_count + 1 
               WHERE system_promo_code_id = ?`,
              [user_promo_code_id]
            );
          }
        }

        // ✅ Capture Stripe payment and get receipt
        const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);

        // 🔹 Get receipt URL safely (from latest charge object)
        const receiptUrl =
          capturedPayment.latest_charge &&
            typeof capturedPayment.latest_charge === "string"
            ? (await stripe.charges.retrieve(capturedPayment.latest_charge)).receipt_url
            : null;

        // ✅ Update payment + booking
        await connection.query(
          `UPDATE payments 
            SET status = 'completed', receipt_url = ? 
            WHERE payment_intent_id = ?`,
          [receiptUrl, paymentIntentId]
        );

        await connection.query(
          `UPDATE service_booking 
            SET payment_status = 'completed', bookingStatus = 1 
            WHERE booking_id = ?`,
          [booking_id]
        );


        // ✅ Clear cart data
        await connection.query(`DELETE FROM cart_addons WHERE cart_id = ?`, [cart_id]);
        await connection.query(`DELETE FROM cart_preferences WHERE cart_id = ?`, [cart_id]);
        await connection.query(`DELETE FROM cart_consents WHERE cart_id = ?`, [cart_id]);
        await connection.query(`DELETE FROM cart_package_items WHERE cart_id = ?`, [cart_id]);
        await connection.query(`DELETE FROM service_cart WHERE cart_id = ?`, [cart_id]);

        await connection.commit();
        console.log(`✅ Booking transaction completed for booking #${booking_id}`);
      }

      // -----------------------------------------------------
      // CASE 2: Charge Captured — Send Emails
      // -----------------------------------------------------
      if (event.type === "charge.captured") {
        const charge = event.data.object;
        const receiptUrl = charge.receipt_url;
        const paymentIntentId = charge.payment_intent;

        if (receiptUrl) {
          const [[booking]] = await connection.query(
            `SELECT booking_id, user_id, vendor_id 
             FROM service_booking WHERE payment_intent_id = ? LIMIT 1`,
            [paymentIntentId]
          );

          if (booking) {
            // 🔹 Send emails asynchronously (no DB locks)
            (async () => {
              try {
                await sendBookingEmail(booking.user_id, {
                  booking_id: booking.booking_id,
                  receiptUrl,
                });

                await sendVendorBookingEmail(booking.vendor_id, {
                  booking_id: booking.booking_id,
                  receiptUrl,
                });

                console.log("📧 Booking + Vendor emails sent asynchronously");
              } catch (mailErr) {
                console.error("⚠️ Failed to send booking emails:", mailErr.message);
              }
            })();
          }
        }
      }
    } catch (err) {
      console.error("❌ Webhook processing error:", err.message);
      await connection.rollback();

      try {
        await stripe.paymentIntents.cancel(paymentIntentId, {
          cancellation_reason: "abandoned",
        });
        await connection.query(
          `UPDATE payments SET status = 'failed', notes = 'Processing error' WHERE payment_intent_id = ?`,
          [paymentIntentId]
        );
      } catch (cancelErr) {
        console.error("⚠️ Failed to cancel PaymentIntent:", cancelErr.message);
      }

      // ✅ Cleanup in case rollback occurred
      await connection.query(`DELETE FROM service_booking_packages WHERE booking_id IS NULL`);
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
