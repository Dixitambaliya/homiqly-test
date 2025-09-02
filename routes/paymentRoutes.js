const express = require("express")
const { registerBankAccount } = require("../controllers/paymentController.js")
const { protectVendor } = require("../middleware/authMiddleware.js")

const router = express.Router();

// Vendor registers their bank account with Stripe
router.post("/register-bank", registerBankAccount);

export default router;
