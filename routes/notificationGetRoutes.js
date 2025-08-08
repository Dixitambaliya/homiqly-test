// routes/notifications.routes.js
const router = require("express").Router();
const {
    getAdminNotifications,
    getUserNotifications
} = require("../controller/notificationGetController");
const { authenticationToken } = require('../middleware/authMiddleware');

// Add auth middleware as needed
router.get("/getnotification/:userType", authenticationToken, getAdminNotifications);
router.get("/getusernotification", authenticationToken, getUserNotifications);

module.exports = router;
