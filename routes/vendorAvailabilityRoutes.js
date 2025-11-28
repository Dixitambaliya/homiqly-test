const express = require("express")
const router = express.Router()

const { setAvailability,
    getAvailability,
    deleteAvailability,
    editAvailability,
    adminSetAvailability,
    adminGetAvailability,
    adminEditAvailability,
    adminDeleteAvailability,
    getVendors,
    adminGetVendorBookings
} = require("../controller/vendorAvailabilityController");
const { authenticationToken } = require("../middleware/authMiddleware")

router.post("/set-availability", authenticationToken, setAvailability)
router.get("/get-availability", authenticationToken, getAvailability)
router.delete("/delete-availability/:vendor_availability_id", authenticationToken, deleteAvailability)
router.put("/edit-availability/:vendor_availability_id", authenticationToken, editAvailability)
router.post("/admin-set-availability/:vendor_id", authenticationToken, adminSetAvailability)
router.get("/admin-get-availability/:vendor_id", authenticationToken, adminGetAvailability)
router.put("/admin-edit-availability/:vendor_availability_id", authenticationToken, adminEditAvailability)
router.delete("/admin-delete-availability/:vendor_availability_id", authenticationToken, adminDeleteAvailability)
router.get("/get-vendors", authenticationToken, getVendors)
router.get("/get-vendors-bookings", authenticationToken, adminGetVendorBookings)

module.exports = router;