const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const employeeGetQueries = require('../config/employeeQueries/employeeGetQueries');

const getAllEmployees = asyncHandler(async (req, res) => {
    try {
        const [employees] = await db.query(employeeGetQueries.getAllEmployees);

        res.status(200).json({
            message: "Employees fetched successfully",
            employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const createEmployee = asyncHandler(async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        employee_type,
        department,
        position,
        salary,
        manager_id
    } = req.body;

    if (!first_name || !last_name || !email || !employee_type || !department) {
        return res.status(400).json({ message: "Required fields missing" });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO employees (
                first_name, last_name, email, phone, employee_type,
                department, position, salary, manager_id, hire_date, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
        `, [first_name, last_name, email, phone, employee_type, department, position, salary, manager_id]);

        res.status(201).json({
            message: "Employee created successfully",
            employee_id: result.insertId
        });

    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const assignTask = asyncHandler(async (req, res) => {
    const { employee_id, task_title, task_description, priority, due_date } = req.body;
    const assigned_by = req.user.admin_id || req.user.employee_id;

    if (!employee_id || !task_title || !priority) {
        return res.status(400).json({ message: "Employee ID, task title, and priority are required" });
    }

    try {
        await db.query(`
            INSERT INTO employee_tasks (
                employee_id, task_title, task_description, priority,
                due_date, assigned_by, assigned_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'pending')
        `, [employee_id, task_title, task_description, priority, due_date, assigned_by]);

        res.status(201).json({
            message: "Task assigned successfully"
        });

    } catch (error) {
        console.error("Error assigning task:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getEmployeeTasks = asyncHandler(async (req, res) => {
    const { employee_id } = req.params;

    try {
        const [tasks] = await db.query(employeeGetQueries.getEmployeeTasks, [employee_id]);

        res.status(200).json({
            message: "Employee tasks fetched successfully",
            tasks
        });

    } catch (error) {
        console.error("Error fetching employee tasks:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    getAllEmployees,
    createEmployee,
    assignTask,
    getEmployeeTasks
};