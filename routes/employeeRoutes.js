const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    createEmployee,
    assignBookingToEmployee,
    getEmployeesWithPackages,
    employeeLogin,
    getEmployeesByVendor
} = require('../controller/employeeController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.get('/all', authenticationToken, getAllEmployees);
router.post('/create-employee', authenticationToken, createEmployee);
router.post('/assign-booking', authenticationToken, assignBookingToEmployee);
router.post('/login', employeeLogin);
router.get('/getemployeepackages', authenticationToken, getEmployeesWithPackages);

router.get('/getemployee', authenticationToken, getEmployeesByVendor);

module.exports = router;
