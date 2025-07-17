const express = require("express");
const router = express.Router();
const { createStripeAccount,
    refreshStripeOnboarding,
    getStripeAccountStatus,
    getVendorBookings,
    getVendorEarnings,
    createPaymentIntent,
    confirmBooking,
    stripeWebhook,
    adminGetVendorStripeInfo,
    getBookingsByVendor,
    adminGetVendorPaymentSummary,
    markVendorPaid,
    logManualPayout,
    confirmPaymentIntentManually
} = require("../controller/stripeController")
const { authenticationToken } = require("../middleware/authMiddleware");

// Vendor routes
router.post("/vendor/stripe-onboard", authenticationToken, createStripeAccount);
router.get("/vendor/stripe-onboard/refresh", authenticationToken, refreshStripeOnboarding);
router.get("/vendor/stripe-account-status", authenticationToken, getStripeAccountStatus);
router.get("/vendor/get-my-bookings", authenticationToken, getVendorBookings);
router.get("/vendor/get-earnings", authenticationToken, getVendorEarnings);

// User payment
router.post("/user/create-payment-intent", authenticationToken, createPaymentIntent);
router.post("/user/confirm-booking", authenticationToken, confirmBooking);


router.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);


router.post("/user/confirm-payment-intent", authenticationToken, confirmPaymentIntentManually);
// Admin routes
router.get("/admin/get-vendor-stripe-info", authenticationToken, adminGetVendorStripeInfo);
router.get("/admin/get-bookings-by-vendor", authenticationToken, getBookingsByVendor);
router.get("/admin/get-vendor-payment-summary", authenticationToken, adminGetVendorPaymentSummary);
router.post("/admin/mark-vendor-paid", authenticationToken, markVendorPaid);
router.post("/admin/manual-payout-log", authenticationToken, logManualPayout);

module.exports = router;
