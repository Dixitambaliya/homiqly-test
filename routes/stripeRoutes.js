const express = require("express");
const router = express.Router();

const { createStripeAccount,
    refreshStripeOnboarding,
    getStripeAccountStatus,
    createPaymentIntent,
    confirmBooking,
    adminGetVendorStripeInfo,
    confirmPaymentIntentManually
} = require("../controller/stripeController")
const { authenticationToken } = require("../middleware/authMiddleware");

// Vendor routes
router.post("/vendor/stripe-onboard", authenticationToken, createStripeAccount);
router.get("/vendor/stripe-onboard/refresh", authenticationToken, refreshStripeOnboarding);
router.get("/vendor/stripe-account-status", authenticationToken, getStripeAccountStatus);

// User payment
router.post("/user/create-payment-intent", authenticationToken, createPaymentIntent);
router.post("/user/confirm-booking", authenticationToken, confirmBooking);

router.post("/user/confirm-payment-intent", authenticationToken, confirmPaymentIntentManually);
// Admin routes
router.get("/admin/get-vendor-stripe-info", authenticationToken, adminGetVendorStripeInfo);

module.exports = router;
