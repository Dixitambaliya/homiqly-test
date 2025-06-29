const express = require("express")
const router = express.Router()
const { getVendor, getAllServiceType, getUsers, updateUserByAdmin, getBookings } = require("../controller/adminController")
const { authenticationToken } = require("../middleware/authMiddleware")

router.get("/getvendors", authenticationToken, getVendor)
router.get("/getallservicetype", authenticationToken, getAllServiceType)
router.get("/getusers", authenticationToken, getUsers)
router.get("/getbookings", authenticationToken, getBookings)
router.put("/editusers/:user_id", authenticationToken, updateUserByAdmin)

module.exports = router