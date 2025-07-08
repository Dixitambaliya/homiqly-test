const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const paymentGetQueries = require('../config/paymentQueries/paymentGetQueries');
const paymentPostQueries = require('../config/paymentQueries/paymentPostQueries');
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const registerStripeForVendor = asyncHandler(async (req, res) => {
    const { vendor_id } = req.body;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    try {
        // 1. Fetch vendor details from DB
        const [vendorRows] = await db.query(`SELECT * FROM vendors WHERE vendor_id = ?`, [vendor_id]);
        if (vendorRows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const vendor = vendorRows[0];

        // 2. Create Stripe Express account
        const stripeAccount = await stripe.accounts.create({
            type: "express",
            country: "CA",
            email: vendor.email || vendor.companyEmail, // fallback for company
            business_type: vendor.vendor_type === "company" ? "company" : "individual",
            capabilities: {
                transfers: { requested: true },
                card_payments: { requested: true }
            },
        });

        // 3. Save account_id to DB
        await db.query(`UPDATE vendors SET stripe_account_id = ? WHERE vendor_id = ?`, [
            stripeAccount.id,
            vendor_id,
        ]);

        // 4. Generate onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccount.id,
            refresh_url: "https://yourdomain.com/vendor/reauth",
            return_url: "https://yourdomain.com/vendor/onboarded",
            type: "account_onboarding",
        });

        res.status(200).json({
            message: "Stripe account created",
            stripe_account_id: stripeAccount.id,
            onboarding_url: accountLink.url,
        });
    } catch (error) {
        console.error("Stripe registration error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const handleStripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'account.updated') {
        const account = event.data.object;

        try {
            // Check if vendor exists with that stripe_account_id
            const [vendors] = await db.query("SELECT vendor_id FROM vendors WHERE stripe_account_id = ?", [account.id]);
            if (!vendors.length) {
                return res.status(404).json({ message: "Vendor not found for Stripe account" });
            }

            const vendor_id = vendors[0].vendor_id;

            // Insert/update Stripe account info
            await db.query(`
                INSERT INTO vendor_stripe_details (
                    vendor_id,
                    stripe_account_id,
                    email,
                    business_type,
                    payouts_enabled,
                    charges_enabled,
                    country,
                    currency,
                    details_submitted
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    email = VALUES(email),
                    business_type = VALUES(business_type),
                    payouts_enabled = VALUES(payouts_enabled),
                    charges_enabled = VALUES(charges_enabled),
                    country = VALUES(country),
                    currency = VALUES(currency),
                    details_submitted = VALUES(details_submitted)
            `, [
                vendor_id,
                account.id,
                account.email,
                account.business_type,
                account.payouts_enabled,
                account.charges_enabled,
                account.country,
                account.default_currency,
                account.details_submitted
            ]);

            console.log(`Vendor Stripe info updated: ${vendor_id}`);

        } catch (err) {
            console.error("Error saving vendor Stripe details:", err.message);
        }
    }

    res.status(200).json({ received: true });
});

const processVendorPayment = asyncHandler(async (req, res) => {
    const { booking_id, vendor_id, amount, commission_rate } = req.body;

    if (!booking_id || !vendor_id || !amount || !commission_rate) {
        return res.status(400).json({ message: "All payment details are required" });
    }

    try {
        const commission_amount = (amount * commission_rate) / 100;
        const net_amount = amount - commission_amount;

        // Create vendor payment record
        await db.query(paymentPostQueries.createVendorPayment, [
            vendor_id,
            booking_id,
            amount,
            commission_rate,
            commission_amount,
            net_amount,
            'pending' // payment_status
        ]);

        res.status(201).json({
            message: "Vendor payment processed successfully",
            net_amount,
            commission_amount
        });

    } catch (error) {
        console.error("Error processing vendor payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorPayments = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [payments] = await db.query(paymentGetQueries.getVendorPayments, [vendor_id]);

        res.status(200).json({
            message: "Vendor payments fetched successfully",
            payments
        });

    } catch (error) {
        console.error("Error fetching vendor payments:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getPendingPayouts = asyncHandler(async (req, res) => {
    try {
        const [payouts] = await db.query(paymentGetQueries.getPendingPayouts);

        res.status(200).json({
            message: "Pending payouts fetched successfully",
            payouts
        });

    } catch (error) {
        console.error("Error fetching pending payouts:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const approvePayment = asyncHandler(async (req, res) => {
    const { payment_id, payout_type } = req.body;

    if (!payment_id || !payout_type) {
        return res.status(400).json({ message: "Payment ID and payout type are required" });
    }

    try {
        let updateQuery;
        if (payout_type === 'vendor') {
            updateQuery = `
                UPDATE vendor_payments
                SET payment_status = 'completed', payout_date = NOW()
                WHERE payment_id = ?
            `;
        } else if (payout_type === 'contractor') {
            updateQuery = `
                UPDATE contractor_payouts
                SET payout_status = 'completed', payout_date = NOW()
                WHERE payout_id = ?
            `;
        } else {
            return res.status(400).json({ message: "Invalid payout type" });
        }

        await db.query(updateQuery, [payment_id]);

        res.status(200).json({
            message: "Payment approved successfully"
        });

    } catch (error) {
        console.error("Error approving payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    processVendorPayment,
    getVendorPayments,
    getPendingPayouts,
    approvePayment,
    registerStripeForVendor,
    handleStripeWebhook
};
