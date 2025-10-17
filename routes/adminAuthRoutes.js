const express = require("express")
const router = express.Router()
const { loginAdmin,
    registerAdmin,
    requestResetAdmin,
    changeAdminPassword,
    resetPassword,
    verifyResetCode,
    loginUpdateAdmin
} = require("../controller/adminAuthContoller")

const { authenticationToken } = require('../middleware/authMiddleware');


router.post("/register", registerAdmin)
router.post("/login", loginAdmin)
router.post("/requestreset", requestResetAdmin)
router.post("/verifyresetcode", verifyResetCode)
router.post("/resetpassword", resetPassword);
router.patch("/changepassword", authenticationToken, changeAdminPassword);
router.post("/loginupdate", loginUpdateAdmin);

module.exports = router;