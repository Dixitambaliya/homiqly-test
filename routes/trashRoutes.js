const express = require("express")
const router = express.Router() 

const { verifyAdminCode } = require("../middleware/verifyAdminCode");
const { authenticationToken } = require("../middleware/authMiddleware")
const { trashBookingByAdmin } = require("../controller/trashController");

router.patch("/bookings/:booking_id", authenticationToken, verifyAdminCode, trashBookingByAdmin)
module.exports = router;
