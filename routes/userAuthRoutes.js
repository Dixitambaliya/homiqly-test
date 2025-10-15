const express = require("express")
const router = express.Router()
const { registerUser,
    loginUser,
    verifyCode,
    setPassword,
    requestReset,
    verifyResetCode,
    resetPassword,
    googleLogin,
    googleSignup } = require("../controller/userAuthController")

router.post("/register", registerUser)
router.post("/login", loginUser)
router.post('/verify', verifyCode);
router.post('/setpassword', setPassword);

router.post("/requestreset", requestReset)
router.post("/verifyresetcode", verifyResetCode)
router.post("/resetpassword", resetPassword);

router.post("/google-login", googleLogin)
router.post("/google-signup", googleLogin)

module.exports = router;
