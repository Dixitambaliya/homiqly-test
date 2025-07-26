const { db } = require('../config/db');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const employeeGetQueries = require('../config/employeeQueries/employeeGetQueries');
const employeePostQueries = require('../config/employeeQueries/employeePostQueries');
const employeePutQueries = require('../config/employeeQueries/employeePutQueries');
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransporter({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Get all employees for a vendor (company)
const getEmployeesByVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [employees] = await db.query(employeeGetQueries.getEmployeesByVendor, [vendor_id]);

        res.status(200).json({
            message: "Employees retrieved successfully",
            employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Create new employee (by company vendor)
const createEmployee = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const {
        first_name,
        last_name,
        email,
        phone,
        password,
        role = 'employee',
        department = 'General',
        position = 'Service Staff'
    } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ message: "Required fields missing" });
    }

    try {
        // Check if email already exists
        const [existingEmployee] = await db.query(
            'SELECT employee_id FROM company_employees WHERE email = ?',
            [email]
        );

        if (existingEmployee.length > 0) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create employee
        const [result] = await db.query(employeePostQueries.createEmployee, [
            first_name,
            last_name,
            email,
            phone,
            hashedPassword,
            vendor_id,
            role,
            department,
            position,
            new Date(),
            1 // is_active
        ]);

        const employee_id = result.insertId;

        // Send welcome email to employee
        try {
            await transport.sendMail({
                from: `"Homiqly" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Welcome to Homiqly - Employee Account Created",
                html: `
                    <h2>Welcome to Homiqly!</h2>
                    <p>Dear ${first_name} ${last_name},</p>
                    <p>Your employee account has been created successfully.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>Login Credentials:</h3>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Password:</strong> ${password}</p>
                        <p><strong>Department:</strong> ${department}</p>
                        <p><strong>Position:</strong> ${position}</p>
                    </div>
                    <p>Please login to your employee portal and change your password immediately.</p>
                    <p>Best regards,<br>Homiqly Team</p>
                `
            });
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
        }

        res.status(201).json({
            message: "Employee created successfully",
            employee_id
        });

    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Assign employee to booking
const assignEmployeeToBooking = asyncHandler(async (req, res) => {
    const { booking_id, employee_id, notes } = req.body;
    const assigned_by = req.user.admin_id || req.user.vendor_id;
    const assigned_by_type = req.user.admin_id ? 'admin' : 'vendor';

    if (!booking_id || !employee_id) {
        return res.status(400).json({ message: "Booking ID and Employee ID are required" });
    }

    try {
        // Verify employee belongs to the vendor (if assigned by vendor)
        if (assigned_by_type === 'vendor') {
            const [employeeCheck] = await db.query(
                'SELECT employee_id FROM company_employees WHERE employee_id = ? AND vendor_id = ? AND is_active = 1',
                [employee_id, req.user.vendor_id]
            );

            if (employeeCheck.length === 0) {
                return res.status(403).json({ message: "Employee not found or not authorized" });
            }
        }

        // Update booking with employee assignment
        const [updateResult] = await db.query(employeePostQueries.assignEmployeeToBooking, [
            employee_id,
            booking_id,
            assigned_by_type === 'vendor' ? req.user.vendor_id : null
        ]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Booking not found or already assigned" });
        }

        // Create assignment record
        await db.query(employeePostQueries.createBookingAssignment, [
            booking_id,
            employee_id,
            assigned_by,
            assigned_by_type,
            notes || null
        ]);

        // Create notification for employee
        await db.query(employeePostQueries.createEmployeeNotification, [
            employee_id,
            'New Booking Assignment',
            `You have been assigned to a new booking. Please check your dashboard for details.`,
            'booking_assigned',
            booking_id,
            null
        ]);

        res.status(200).json({
            message: "Employee assigned to booking successfully"
        });

    } catch (error) {
        console.error("Error assigning employee to booking:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get employee bookings
const getEmployeeBookings = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [bookings] = await db.query(employeeGetQueries.getEmployeeBookings, [employee_id]);

        res.status(200).json({
            message: "Employee bookings retrieved successfully",
            bookings
        });

    } catch (error) {
        console.error("Error fetching employee bookings:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Update booking status by employee
const updateBookingStatus = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { booking_id, status, notes } = req.body;

    if (!booking_id || !status) {
        return res.status(400).json({ message: "Booking ID and status are required" });
    }

    const validStatuses = ['in_progress', 'completed', 'on_hold'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        // Update booking status
        const [updateResult] = await db.query(employeePutQueries.updateBookingStatusByEmployee, [
            status,
            booking_id,
            employee_id
        ]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Booking not found or not assigned to you" });
        }

        // Add notes if provided
        if (notes) {
            await db.query(
                'UPDATE service_booking SET notes = CONCAT(COALESCE(notes, ""), "\n", ?) WHERE booking_id = ?',
                [`[${new Date().toISOString()}] ${notes}`, booking_id]
            );
        }

        res.status(200).json({
            message: `Booking status updated to ${status} successfully`
        });

    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get employee tasks
const getEmployeeTasks = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [tasks] = await db.query(employeeGetQueries.getEmployeeTasks, [employee_id]);

        res.status(200).json({
            message: "Employee tasks retrieved successfully",
            tasks
        });

    } catch (error) {
        console.error("Error fetching employee tasks:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Update task status
const updateTaskStatus = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { task_id, status } = req.body;

    if (!task_id || !status) {
        return res.status(400).json({ message: "Task ID and status are required" });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        const [updateResult] = await db.query(employeePutQueries.updateTaskStatus, [
            status,
            status,
            status,
            task_id,
            employee_id
        ]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Task not found or not assigned to you" });
        }

        res.status(200).json({
            message: `Task status updated to ${status} successfully`
        });

    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get employee dashboard data
const getEmployeeDashboard = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [stats] = await db.query(employeeGetQueries.getEmployeeDashboardStats, [employee_id]);
        const [notifications] = await db.query(employeeGetQueries.getEmployeeNotifications, [employee_id]);
        const [recentBookings] = await db.query(
            employeeGetQueries.getEmployeeBookings + ' LIMIT 5',
            [employee_id]
        );
        const [recentTasks] = await db.query(
            employeeGetQueries.getEmployeeTasks + ' LIMIT 5',
            [employee_id]
        );

        res.status(200).json({
            message: "Employee dashboard data retrieved successfully",
            stats: stats[0] || {},
            notifications: notifications.slice(0, 10),
            recentBookings,
            recentTasks
        });

    } catch (error) {
        console.error("Error fetching employee dashboard:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Get employee notifications
const getEmployeeNotifications = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [notifications] = await db.query(employeeGetQueries.getEmployeeNotifications, [employee_id]);

        res.status(200).json({
            message: "Employee notifications retrieved successfully",
            notifications
        });

    } catch (error) {
        console.error("Error fetching employee notifications:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Mark notification as read
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { notification_id } = req.params;

    try {
        const [updateResult] = await db.query(employeePutQueries.markNotificationAsRead, [
            notification_id,
            employee_id
        ]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
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
};