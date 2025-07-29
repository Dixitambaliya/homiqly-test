const express = require("express")
const router = express.Router()
const { registerVendor, loginVendor, requestResetVendor, verifyResetCode, resetPassword, changeVendorPassword } = require("../controller/vendorAuthController")
const {upload,handleUploads} = require("../middleware/upload");

const multiUpload = upload.any();

// Use this in your route:
router.post('/register',multiUpload,handleUploads, registerVendor);
router.post("/login", loginVendor)
router.post("/requestreset", requestResetVendor)
router.post("/verifyresetcode", verifyResetCode)
router.post("/resetpassword", resetPassword);
router.put("/changepassword", changeVendorPassword);

module.exports = router;
