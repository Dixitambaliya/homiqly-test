// routes/notifications.routes.js
const router = require("express").Router();
const {
    getAdminNotifications,
    getUserNotifications,
    getVendorNotifications,
    getEmployeeNotifications,
    readNotification
} = require("../controller/notificationGetController");
const { authenticationToken } = require('../middleware/authMiddleware');

// Add auth middleware as needed
router.get("/getnotification/:userType", authenticationToken, getAdminNotifications);
router.get("/getusernotification", authenticationToken, getUserNotifications);
router.get("/getvendornotification", authenticationToken, getVendorNotifications);
router.get("/getemployeenotification", authenticationToken, getEmployeeNotifications);
router.patch("/markasread/:notification_id", authenticationToken, readNotification);

module.exports = router;
