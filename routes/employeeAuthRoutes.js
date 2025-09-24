const express = require("express");
const router = express.Router();
const {
    loginEmployee,
    logoutEmployee,
    getEmployeeProfile,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
    changePassword
} = require("../controller/employeeAuthController");
const { authenticationToken } = require("../middleware/authMiddleware");

// Public routes
router.post("/login", loginEmployee);
router.post("/requestreset", requestPasswordReset);
router.post("/verifyresetcode", verifyResetCode);
router.post("/resetpassword", resetPassword);

// Protected routes
router.post("/logout", authenticationToken, logoutEmployee);
router.get("/profile", authenticationToken, getEmployeeProfile);
router.post("/changepassword", authenticationToken, changePassword);

module.exports = router;