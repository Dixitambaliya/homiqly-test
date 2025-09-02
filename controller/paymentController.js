const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { db } = require("../config/db")

const registerBankAccount = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id; // assuming vendor logged in via auth middleware

    try {
        // 1. Check if vendor already has a Stripe account
        const [rows] = await db.query(
            "SELECT stripe_account_id FROM vendors WHERE vendor_id = ?",
            [vendor_id]
        );

        let stripeAccountId = rows[0]?.stripe_account_id;

        // 2. If not, create a new Express account
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: "express",
                country: "CA", // Canada
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: "individual", // or "company" if you want
            });

            stripeAccountId = account.id;

            // Save to DB
            await db.query(
                "UPDATE vendors SET stripe_account_id = ? WHERE vendor_id = ?",
                [stripeAccountId, vendor_id]
            );
        }

        // 3. Generate onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: "https://yourapp.com/reauth",  // replace with your frontend
            return_url: "https://yourapp.com/dashboard", // after success
            type: "account_onboarding",
        });

        res.json({ url: accountLink.url });
    } catch (error) {
        console.error("Stripe Register Bank Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { registerBankAccount };