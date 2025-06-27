const express = require("express")
const router = express.Router()
const { approveVendor,approveServiceType } = require("../controller/verificationAuthController")
const {authenticationToken} = require("../middleware/authMiddleware")

router.put("/verification/:vendor_id", authenticationToken, approveVendor)
router.put("/approveservicetype/:service_type_id",authenticationToken, approveServiceType);

module.exports = router
