const express = require("express")
const router = express.Router()
const { getVendor, getAllServiceType, getUsers, updateUserByAdmin } = require("../controller/adminController")
const { authenticationToken } = require("../middleware/authMiddleware")

router.get("/getvendors", authenticationToken, getVendor)
router.get("/getallservicetype", authenticationToken, getAllServiceType);
router.get("/getusers", authenticationToken, getUsers);
router.put("/editusers/:user_id", authenticationToken, updateUserByAdmin);

module.exports = router;
