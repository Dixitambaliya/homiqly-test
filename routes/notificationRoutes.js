const express = require('express');
const router = express.Router();
const {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead
} = require('../controller/notificationController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.post('/send', authenticationToken, sendNotification);
router.get('/user', authenticationToken, getUserNotifications);
router.put('/:notification_id/read', authenticationToken, markNotificationAsRead);

module.exports = router;