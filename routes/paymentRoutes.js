const express = require('express');
const router = express.Router();

const { registerBankAccount, getBankAccount, editBankAccount, getAllVendorsBankAccounts } = require("../controller/paymentController.js")
const { authenticationToken } = require("../middleware/authMiddleware.js")

// Vendor registers their bank account with Stripe
router.post("/register-bank", authenticationToken, registerBankAccount);
router.get("/get-bank-details", authenticationToken, getBankAccount);
router.get("/get-vendors-details", authenticationToken, getAllVendorsBankAccounts);
router.patch("/edit-bank-details", authenticationToken, editBankAccount);


module.exports = router;

