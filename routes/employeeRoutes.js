const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    createEmployee,
    assignPackageToEmployee,
    getEmployeesWithPackages,
    employeeLogin
} = require('../controller/employeeController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.get('/all', authenticationToken, getAllEmployees);
router.post('/create-employee', authenticationToken, createEmployee);
router.post('/assign-package', authenticationToken, assignPackageToEmployee);
router.post('/login-employee', authenticationToken, employeeLogin);
router.get('/getemployeepackages', authenticationToken, getEmployeesWithPackages);

module.exports = router;
