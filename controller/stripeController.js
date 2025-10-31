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
    // ✅ Begin transaction
    await conn.beginTransaction();

    // ✅ Lock cart row to prevent concurrent modifications
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

    // ✅ Fetch sub-packages
    const [subPackages] = await conn.query(
      `SELECT cpi.sub_package_id AS item_id, pi.itemName, cpi.price, cpi.quantity
       FROM cart_package_items cpi
       LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
       WHERE cpi.cart_id = ?`,
      [cart_id]
    );

    // ✅ Fetch addons
    const [addons] = await conn.query(
      `SELECT ca.sub_package_id, a.addonName, ca.price
       FROM cart_addons ca
       LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
       WHERE ca.cart_id = ?`,
      [cart_id]
    );

    // ✅ Fetch preferences
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
    let taxName = "";
    if (serviceTaxRows.length) {
      taxPercentage = parseFloat(serviceTaxRows[0].taxPercentage) || 0;
      taxName = serviceTaxRows[0].taxName || "Service Tax";
    }

    // ✅ Calculate subtotal (sub-packages + addons + preferences)
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

    // ✅ Apply service tax
    const taxAmount = subtotal * (taxPercentage / 100);
    let totalAmount = subtotal + taxAmount;

    metadata[`service_tax_name`] = taxName;
    metadata[`service_tax_percentage`] = taxPercentage;
    metadata[`service_tax_amount`] = taxAmount.toFixed(2);

    // ✅ Promo code logic
    let appliedPromo = null;

    if (cart.user_promo_code_id) {
      // 1️⃣ Check user_promo_codes first
      const [userPromoRows] = await conn.query(
        `SELECT * FROM user_promo_codes WHERE user_id = ? AND user_promo_code_id = ? LIMIT 1`,
        [cart.user_id, cart.user_promo_code_id]
      );

      if (userPromoRows.length) {
        const promo = userPromoRows[0];

        // Admin promo via user_promo_codes
        if (promo.source_type === "admin" && promo.promo_id) {
          const [adminPromoRows] = await conn.query(
            `SELECT * FROM promo_codes WHERE promo_id = ? LIMIT 1`,
            [promo.promo_id]
          );

          if (adminPromoRows.length) {
            appliedPromo = { ...adminPromoRows[0], ...promo, source_type: "admin" };
          }
        }

        // System promo via user_promo_codes
        if (!appliedPromo && promo.source_type === "system") {
          const [systemPromoRows] = await conn.query(
            `SELECT sc.*, st.discount_type, st.discountValue, st.minSpend, st.maxUse, st.code
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

      // 2️⃣ If no promo found in user_promo_codes, check system_promo_codes directly
      if (!appliedPromo) {
        const [systemPromoRows] = await conn.query(
          `SELECT sc.*, st.discount_type, st.discountValue, st.minSpend, st.maxUse, st.code
           FROM system_promo_codes sc
           JOIN system_promo_code_templates st
             ON sc.template_id = st.system_promo_code_template_id
           WHERE sc.system_promo_code_id = ? AND sc.user_id = ? LIMIT 1`,
          [cart.user_promo_code_id, cart.user_id]
        );

        if (systemPromoRows.length) {
          appliedPromo = { ...systemPromoRows[0], source_type: "system" };
        }
      }
    }

    // ✅ Apply discount
    let discountAmount = 0;
    if (appliedPromo && (!appliedPromo.minSpend || totalAmount >= appliedPromo.minSpend)) {
      const discountValue = parseFloat(appliedPromo.discountValue || 0);
      const discountType = appliedPromo.discount_type || "percentage";

      if (discountType === "fixed") {
        discountAmount = discountValue;
        totalAmount = Math.max(0, totalAmount - discountValue);
      } else {
        discountAmount = totalAmount * (discountValue / 100);
        totalAmount -= discountAmount;
      }

      metadata.promo_code = appliedPromo.code;
      metadata.user_promo_code_id = appliedPromo.user_promo_code_id || null;
      metadata.promo_source = appliedPromo.source_type || "system";
      metadata.discount = discountAmount.toFixed(2);
    }

    metadata.subtotal = subtotal.toFixed(2);
    metadata.totalAmount = totalAmount.toFixed(2);

    if (totalAmount <= 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Total amount must be greater than 0" });
    }

    // ✅ Create new Stripe PaymentIntent (no DB insert)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: "cad",
      payment_method_types: ["card"],
      capture_method: "manual",
      metadata,
    });

    // ✅ Commit transaction
    await conn.commit();
    conn.release();

    // ✅ Return Stripe details
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: "cad",
      paymentIntentId: paymentIntent.id,
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

  // ✅ Immediately acknowledge Stripe
  res.status(200).json({ received: true });

  // Background task – don’t block Stripe
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

      // ------------------------------
      // CASE 1: Capture-ready PaymentIntent
      // ------------------------------
      if (event.type === "payment_intent.amount_capturable_updated") {
        // 🔎 Find payment + cart
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
          console.log(
            `ℹ️ PaymentIntent ${paymentIntentId} already captured, skipping.`
          );
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

        // ✅ Create main booking
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
        console.log(`✅ Booking #${booking_id} created from Cart #${cart_id}`);

        // ==================================
        // Move cart data to booking tables
        // ==================================
        let totalBookingTime = 0; // 🕒 total time accumulator

        for (const pkg of cartPackages) {
          const { sub_package_id, service_type_id, price, quantity } = pkg;

          // 🕓 Fetch time from package_items table
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

            // 🕓 Fetch addon time and multiply by sub-package quantity
            const [[addonTimeRow]] = await connection.query(
              `SELECT addonTime FROM package_addons WHERE addon_id = ?`,
              [addon.addon_id]
            );

            const addonTime = addonTimeRow?.addonTime
              ? Number(addonTimeRow.addonTime) * (quantity || 1)
              : 0;
            totalBookingTime += addonTime;
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

        // ✅ Safely update total time
        const safeTotalTime = Number.isFinite(totalBookingTime)
          ? Math.round(totalBookingTime)
          : 0;

        await connection.query(
          `UPDATE service_booking SET totalTime = ? WHERE booking_id = ?`,
          [safeTotalTime, booking_id]
        );

        console.log(
          `🕒 Total booking time for booking #${booking_id}: ${safeTotalTime} minutes`
        );

        // ✅ Promo usage
        if (user_promo_code_id) {
          const [[userPromo]] = await connection.query(
            `SELECT upc.user_promo_code_id, upc.usedCount, pc.maxUse
              FROM user_promo_codes upc
              JOIN promo_codes pc ON upc.promo_id = pc.promo_id
              WHERE upc.user_promo_code_id = ?`,
            [user_promo_code_id]
          );

          const [[systemPromo]] = await connection.query(
            `SELECT 
              spc.system_promo_code_id, 
              spc.usage_count, 
              spt.maxUse
              FROM system_promo_codes spc
              JOIN system_promo_code_templates spt ON spc.template_id = spt.system_promo_code_template_id
              WHERE spc.system_promo_code_id = ?`,
            [user_promo_code_id]
          );

          if (userPromo) {
            if (userPromo.usedCount < userPromo.maxUse) {
              await connection.query(
                `UPDATE user_promo_codes 
                  SET usedCount = usedCount + 1 
                  WHERE user_promo_code_id = ?`,
                [user_promo_code_id]
              );
              console.log(
                `✅ Promo usage incremented in user_promo_codes for ID ${user_promo_code_id}`
              );
            } else {
              console.warn(
                `⚠️ user_promo_code_id ${user_promo_code_id} reached its max usage (${userPromo.maxUse})`
              );
            }
          } else if (systemPromo) {
            if (systemPromo.usage_count < systemPromo.maxUse) {
              await connection.query(
                `UPDATE system_promo_codes 
                  SET usage_count = usage_count + 1 
                  WHERE system_promo_code_id = ?`,
                [user_promo_code_id]
              );
              console.log(
                `✅ Promo usage incremented in system_promo_codes for ID ${user_promo_code_id}`
              );
            } else {
              console.warn(
                `⚠️ system_promo_code_id ${user_promo_code_id} reached its max usage (${systemPromo.maxUse})`
              );
            }
          } else {
            console.warn(
              `⚠️ No matching promo found for user_promo_code_id ${user_promo_code_id}`
            );
          }
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
          `UPDATE service_booking SET payment_status = 'completed', bookingStatus = 1 WHERE booking_id = ?`,
          [booking_id]
        );

        // ✅ Clear cart
        await connection.query(`DELETE FROM cart_addons WHERE cart_id = ?`, [
          cart_id,
        ]);
        await connection.query(
          `DELETE FROM cart_preferences WHERE cart_id = ?`,
          [cart_id]
        );
        await connection.query(`DELETE FROM cart_consents WHERE cart_id = ?`, [
          cart_id,
        ]);
        await connection.query(
          `DELETE FROM cart_package_items WHERE cart_id = ?`,
          [cart_id]
        );
        await connection.query(`DELETE FROM service_cart WHERE cart_id = ?`, [
          cart_id,
        ]);

        await connection.commit();
        console.log(`✅ Booking transaction completed for booking #${booking_id}`);
      }

      // ------------------------------
      // CASE 2: Charge Captured — send receipt
      // ------------------------------
      if (event.type === "charge.captured") {
        const charge = event.data.object;
        const receiptUrl = charge.receipt_url;
        const paymentIntentId = charge.payment_intent;

        if (receiptUrl && paymentIntentId) {
          console.log("🧾 Captured receipt from Stripe webhook:", receiptUrl);

          await connection.query(
            `UPDATE payments SET receipt_url = ?, status = 'completed' WHERE payment_intent_id = ?`,
            [receiptUrl, paymentIntentId]
          );
          await connection.query(
            `UPDATE service_booking SET payment_status = 'completed', bookingStatus = 1 WHERE payment_intent_id = ?`,
            [paymentIntentId]
          );

          const [[booking]] = await connection.query(
            `SELECT 
              sb.booking_id,
              sb.user_id,
              sb.vendor_id,
              sb.bookingDate,
              sb.bookingTime,
              sb.notes,
              sb.payment_intent_id,
              u.firstName AS userFirstName,
              u.lastName AS userLastName,
              u.email AS userEmail,
              u.phone AS userPhone,
              COALESCE(pc.code, spt.code) AS promo_code,
              COALESCE(pc.discountValue, spt.discountValue) AS promo_discount,
              sb.user_promo_code_id
            FROM service_booking sb
            LEFT JOIN users u ON sb.user_id = u.user_id
            LEFT JOIN user_promo_codes upc ON sb.user_promo_code_id = upc.user_promo_code_id
            LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
            LEFT JOIN system_promo_codes spc ON sb.user_promo_code_id = spc.system_promo_code_id
            LEFT JOIN system_promo_code_templates spt ON spc.template_id = spt.system_promo_code_template_id
            WHERE sb.payment_intent_id = ?`,
            [paymentIntentId]
          );

          if (!booking) {
            console.warn("⚠️ No booking found for paymentIntentId", paymentIntentId);
            return;
          }

          const [packages] = await connection.query(
            `SELECT 
              pk.package_id,
              pk.packageName,
              sp.item_id AS sub_package_id,
              sp.itemName,
              sp.timeRequired,
              sbsp.price AS sub_package_price,
              sbsp.quantity
          FROM service_booking_sub_packages sbsp
          JOIN package_items sp ON sbsp.sub_package_id = sp.item_id
          JOIN packages pk ON sp.package_id = pk.package_id
          WHERE sbsp.booking_id = ?`,
            [booking.booking_id]
          );

          const [addons] = await connection.query(
            `SELECT sba.sub_package_id, a.addon_id, a.addonName, sba.price
            FROM service_booking_addons sba
            JOIN package_addons a ON sba.addon_id = a.addon_id
            WHERE sba.booking_id = ?`,
            [booking.booking_id]
          );

          const [preferences] = await connection.query(
            `SELECT sbpr.sub_package_id, pref.preference_id, pref.preferenceValue, pref.preferencePrice
            FROM service_booking_preferences sbpr
            JOIN booking_preferences pref ON sbpr.preference_id = pref.preference_id
            WHERE sbpr.booking_id = ?`,
            [booking.booking_id]
          );

          const [consents] = await connection.query(
            `SELECT sbc.sub_package_id, c.consent_id, c.question, sbc.answer
            FROM service_booking_consents sbc
            JOIN package_consent_forms c ON sbc.consent_id = c.consent_id
            WHERE sbc.booking_id = ?`,
            [booking.booking_id]
          );

          const packageMap = {};
          packages.forEach((pkg) => {
            if (!packageMap[pkg.package_id]) {
              packageMap[pkg.package_id] = {
                package_id: pkg.package_id,
                packageName: pkg.packageName,
                sub_packages: [],
              };
            }

            packageMap[pkg.package_id].sub_packages.push({
              sub_package_id: pkg.sub_package_id,
              itemName: pkg.itemName,
              timeRequired: pkg.timeRequired,
              price: pkg.sub_package_price,
              quantity: pkg.quantity,
              addons: [],
              preferences: [],
              consents: [],
            });
          });

          Object.values(packageMap).forEach((pkg) => {
            pkg.sub_packages.forEach((sub) => {
              sub.addons = addons.filter(
                (a) => a.sub_package_id === sub.sub_package_id
              );
              sub.preferences = preferences.filter(
                (p) => p.sub_package_id === sub.sub_package_id
              );
              sub.consents = consents.filter(
                (c) => c.sub_package_id === sub.sub_package_id
              );
            });
          });

          const bookingDetails = {
            booking_id: booking.booking_id,
            user_id: booking.user_id,
            vendor_id: booking.vendor_id,
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            notes: booking.notes,
            payment_intent_id: booking.payment_intent_id,
            userName: `${booking.userFirstName} ${booking.userLastName}`,
            userEmail: booking.userEmail,
            userPhone: booking.userPhone,
            promo_code: booking.promo_code,
            promo_discount: booking.promo_discount,
            packages: Object.values(packageMap),
          };

          if (bookingDetails) {
            await sendBookingEmail(booking.user_id, {
              ...bookingDetails,
              receiptUrl,
            });
            console.log("📧 Booking email sent with receipt");

            if (bookingDetails.vendor_id) {
              await sendVendorBookingEmail(bookingDetails.vendor_id, {
                ...bookingDetails,
                receiptUrl,
              });
              console.log("📧 Vendor booking email sent");
            } else {
              console.warn(
                "⚠️ No vendor_id found in booking, skipping vendor email."
              );
            }
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
          `UPDATE payments SET status = 'failed', notes = 'Processing error' WHERE payment_intent_id = ? `,
          [paymentIntentId]
        );
      } catch (cancelErr) {
        console.error("⚠️ Failed to cancel PaymentIntent:", cancelErr.message);
      }
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
