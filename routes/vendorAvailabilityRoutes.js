const express = require("express")
const router = express.Router()

const { setAvailability, getAvailability, deleteAvailability, editAvailability } = require("../controller/vendorAvailabilityController");
const { authenticationToken } = require("../middleware/authMiddleware")

router.post("/set-availability", authenticationToken, setAvailability)
router.get("/get-availability", authenticationToken, getAvailability)
router.delete("/delete-availability/:vendor_availability_id", authenticationToken, deleteAvailability)
router.put("/edit-availability/:vendor_availability_id", authenticationToken, editAvailability)

module.exports = router;