const express = require('express');
const router = express.Router();
const {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead,
    getAllVendorsDetails,
    getAllUsers,
    getAllEmployeeNames,
    getEmployeeNames,
    deleteRatingByAdmin,
    deleteVendorsRatingByAdmin

} = require('../controller/notificationController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.post('/send', authenticationToken, sendNotification);
router.get('/user', authenticationToken, getUserNotifications);
router.put('/:notification_id/read', authenticationToken, markNotificationAsRead);

router.get("/getvendorslist", authenticationToken, getAllVendorsDetails)
router.get("/getuserslist", authenticationToken, getAllUsers)
router.get("/getemployeelist/:vendor_id", authenticationToken, getAllEmployeeNames)
router.get("/getemployees", authenticationToken, getEmployeeNames)

router.delete("/deleterating/:rating_id", authenticationToken, deleteRatingByAdmin)
router.delete("/deletevendorsrating/:rating_id", authenticationToken, deleteVendorsRatingByAdmin)

module.exports = router;