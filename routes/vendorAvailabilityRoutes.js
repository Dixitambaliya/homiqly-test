const express = require("express")
const router = express.Router()

const { setAvailability, getAvailability } = require("../controller/vendorAvailabilityController");
const { authenticationToken } = require("../middleware/authMiddleware")

router.post("/setavailability", authenticationToken, setAvailability)
router.get("/getavailability", authenticationToken, getAvailability)

module.exports = router;