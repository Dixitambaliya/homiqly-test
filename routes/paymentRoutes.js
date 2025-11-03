const express = require('express');
const router = express.Router();
const { upload, handleUploads } = require("../middleware/upload");

const { registerBankAccount,
    getBankAccount,
    editBankAccount,
    getAllVendorsBankAccounts,
    applyForPayout,
    updatePayoutStatus,
    getAllPayoutRequests,
    getVendorPayoutStatus
} = require("../controller/paymentController.js")
const { authenticationToken } = require("../middleware/authMiddleware.js")
const multiUpload = upload.any();

// Vendor registers their bank account with Stripe
router.post("/register-bank", authenticationToken, multiUpload, handleUploads, registerBankAccount);
router.get("/get-bank-details", authenticationToken, getBankAccount);
router.get("/get-vendors-details", authenticationToken, getAllVendorsBankAccounts);
router.get("/getallpayout", authenticationToken, getAllPayoutRequests);
router.get("/getpaymentstatus", authenticationToken, getVendorPayoutStatus);
router.patch("/edit-bank-details", authenticationToken, multiUpload, handleUploads, editBankAccount);
router.post("/applypayout", authenticationToken, applyForPayout);
router.post("/updatepayout/:payout_request_id", authenticationToken, multiUpload, handleUploads, updatePayoutStatus);


module.exports = router;

