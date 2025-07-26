const express = require('express');
const router = express.Router();
const {
    getEmployeesByVendor,
    createEmployee,
    assignEmployeeToBooking,
    getEmployeeBookings,
    updateBookingStatus,
    getEmployeeTasks,
    updateTaskStatus,
    getEmployeeDashboard,
    getEmployeeNotifications,
    markNotificationAsRead
} = require('../controller/employeeController');
const { authenticationToken } = require('../middleware/authMiddleware');

// Vendor routes (for managing employees)
router.get('/vendor/employees', authenticationToken, getEmployeesByVendor);
router.post('/create', authenticationToken, createEmployee);
router.post('/assign-booking', authenticationToken, assignEmployeeToBooking);

// Employee routes (for employee dashboard)
router.get('/dashboard', authenticationToken, getEmployeeDashboard);
router.get('/bookings', authenticationToken, getEmployeeBookings);
router.put('/booking/status', authenticationToken, updateBookingStatus);
router.get('/tasks', authenticationToken, getEmployeeTasks);
router.put('/task/status', authenticationToken, updateTaskStatus);
router.get('/notifications', authenticationToken, getEmployeeNotifications);
router.put('/notification/:notification_id/read', authenticationToken, markNotificationAsRead);

module.exports = router;