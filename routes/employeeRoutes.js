const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    createEmployee,
    assignTask,
    getEmployeeTasks
} = require('../controller/employeeController');
const { authenticationToken } = require('../middleware/authMiddleware');

router.get('/all', authenticationToken, getAllEmployees);
router.post('/create', authenticationToken, createEmployee);
router.post('/assign-task', authenticationToken, assignTask);
router.get('/:employee_id/tasks', authenticationToken, getEmployeeTasks);

module.exports = router;