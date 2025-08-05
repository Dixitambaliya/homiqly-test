const express = require('express');
const router = express.Router();
const {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead,
    getAllVendorsDetails,
    getAllUsers,
    getAllEmployeeNames

} = require('../controller/notificationController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.post('/send', authenticationToken, sendNotification);
router.get('/user', authenticationToken, getUserNotifications);
router.put('/:notification_id/read', authenticationToken, markNotificationAsRead);

router.get("/getvendorslist", authenticationToken, getAllVendorsDetails)
router.get("/getuserslist", authenticationToken, getAllUsers)
router.get("/getemployeelist/:vendor_id", authenticationToken, getAllEmployeeNames)

module.exports = router;