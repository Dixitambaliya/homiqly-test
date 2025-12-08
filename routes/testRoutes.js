const express = require("express")
const router = express.Router()
const { authenticationToken } = require("../middleware/authMiddleware")

const { getMe,testInvoice } = require("../controller/testController.js")

router.get("/me", authenticationToken, getMe);
router.get("/test", testInvoice); // Protected route

module.exports = router;
