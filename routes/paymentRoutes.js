const express = require('express');
const router = express.Router();
const {
    processVendorPayment,
    getVendorPayments,
    getPendingPayouts,
    approvePayment,
    registerStripeForVendor,
    handleStripeWebhook
} = require('../controller/paymentController');
const { authenticationToken } = require('../middleware/authMiddleware');

// Admin routes
router.post('/vendor/process', authenticationToken, processVendorPayment);
router.get('/pending', authenticationToken, getPendingPayouts);
router.put('/approve', authenticationToken, approvePayment);
router.post('/registeraccount', authenticationToken, registerStripeForVendor);
router.post('/webhookstripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Vendor routes
router.get('/vendor/history', authenticationToken, getVendorPayments);

module.exports = router;
