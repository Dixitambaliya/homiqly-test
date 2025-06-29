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

router.post("/register", registerAdmin)
router.post("/login", loginAdmin)
router.post("/requestreset", requestResetAdmin)
router.post("/verifyresetcode", verifyResetCode)
router.post("/resetpassword", resetPassword);
router.post("/changepassword", changeAdminPassword);
router.post("/loginupdate", loginUpdateAdmin);

module.exports = router;