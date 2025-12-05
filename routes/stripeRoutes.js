const express = require("express");
const router = express.Router();

const { createStripeAccount,
    refreshStripeOnboarding,
    getStripeAccountStatus,
    createPaymentIntent,
    getPaymentStatus
} = require("../controller/stripeController")
const { authenticationToken } = require("../middleware/authMiddleware");

// Vendor routes
router.post("/vendor/stripe-onboard", authenticationToken, createStripeAccount);
router.get("/vendor/stripe-onboard/refresh", authenticationToken, refreshStripeOnboarding);
router.get("/vendor/stripe-account-status", authenticationToken, getStripeAccountStatus);

// User payment
router.post("/user/create-payment-intent", authenticationToken, createPaymentIntent);
router.get("/user/get-payment-status", authenticationToken, getPaymentStatus);

module.exports = router;
