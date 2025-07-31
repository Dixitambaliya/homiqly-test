const express = require("express")
const router = express.Router()
const { updatePlatformFee } = require("../controller/settingsController")
const { authenticationToken } = require("../middleware/authMiddleware")

router.post("/updatePlatformFee", authenticationToken, updatePlatformFee);

module.exports = router;