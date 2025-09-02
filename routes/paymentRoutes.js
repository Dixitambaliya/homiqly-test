const express = require('express');
const router = express.Router();

const { registerBankAccount, getBankAccount } = require("../controller/paymentController.js")
const { authenticationToken } = require("../middleware/authMiddleware.js")

// Vendor registers their bank account with Stripe
router.post("/register-bank", authenticationToken, registerBankAccount);
router.get("/get-bank-details", authenticationToken, getBankAccount);


module.exports = router;

