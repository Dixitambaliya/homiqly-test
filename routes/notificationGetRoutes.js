// routes/notifications.routes.js
const router = require("express").Router();
const {
    getNotifications,
} = require("../controller/notificationGetController");
const { authenticationToken } = require('../middleware/authMiddleware');

// Add auth middleware as needed
router.get("/getnotification/:userType", authenticationToken, getNotifications);

module.exports = router;
