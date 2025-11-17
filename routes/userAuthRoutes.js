const express = require("express")
const router = express.Router()
const { registerUser,

    verifyCode,
    setPassword,
    requestReset,
    verifyResetCode,
    resetPassword,
    googleLogin,
    sendOtp,
    verifyOtp
} = require("../controller/userAuthController")

router.post("/register", registerUser)
// router.post("/login", loginUser)
router.post('/verify', verifyCode);
router.post('/setpassword', setPassword);

router.post("/requestreset", requestReset)
router.post("/verifyresetcode", verifyResetCode)
router.post("/resetpassword", resetPassword);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/google-login", googleLogin)

module.exports = router;
