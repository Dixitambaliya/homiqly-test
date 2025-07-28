const express = require('express');
const router = express.Router();
const { upload, handleUploads } = require("../middleware/upload");
const {
    getAllEmployees,
    createEmployee,
    assignBookingToEmployee,
    getEmployeesWithPackages,
    employeeLogin,
    getEmployeesByVendor,
    toggleEmployeeStatus,
    deleteEmployee,
    getEmployeeStatus,
    getEmployeeBookings,
    getEmployeeProfile,
    editEmployeeProfile
} = require('../controller/employeeController');
const { authenticationToken } = require('../middleware/authMiddleware');
const multiUpload = upload.any();

router.get('/getallemployee', authenticationToken, getAllEmployees);

router.post('/create-employee', authenticationToken, createEmployee);

router.post('/assign-booking', authenticationToken, assignBookingToEmployee);
router.post('/login', employeeLogin);

router.put('/togglechange', authenticationToken, toggleEmployeeStatus);

router.post('/remove-employee', authenticationToken, deleteEmployee);

router.get('/getemployeepackages', authenticationToken, getEmployeesWithPackages);

router.get('/getemployee', authenticationToken, getEmployeesByVendor);

router.get('/getstatus', authenticationToken, getEmployeeStatus);
router.get('/getprofile', authenticationToken, getEmployeeProfile);


router.put('/editprofile', authenticationToken, multiUpload, handleUploads, editEmployeeProfile);


router.get('/getbookingemployee', authenticationToken, getEmployeeBookings);

module.exports = router;
