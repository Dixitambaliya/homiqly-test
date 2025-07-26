const { db } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const employeeAuthQueries = require("../config/employeeQueries/employeeAuthQueries");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

const resetCodes = new Map(); // Store reset codes in memory
const RESET_EXPIRATION = 10 * 60 * 1000; // 10 minutes

const transport = nodemailer.createTransporter({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const generateResetCode = () =>
    Math.floor(1000 + Math.random() * 900000).toString(); // 6-digit code

// Employee Login
const loginEmployee = asyncHandler(async (req, res) => {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const [employees] = await db.query(employeeAuthQueries.employeeLogin, [email]);

        if (!employees || employees.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const employee = employees[0];

        // Check if employee is active
        if (!employee.is_active) {
            return res.status(403).json({ error: "Your account has been deactivated. Please contact your supervisor." });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, employee.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login and FCM token
        if (fcmToken && fcmToken.trim() !== "") {
            await db.query(employeeAuthQueries.updateEmployeeLastLogin, [fcmToken.trim(), employee.employee_id]);
        } else {
            await db.query(employeeAuthQueries.updateEmployeeLastLogin, [null, employee.employee_id]);
        }

        // Create session record
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        await db.query(employeeAuthQueries.createEmployeeSession, [employee.employee_id, ipAddress, userAgent]);

        // Generate JWT token
        const token = jwt.sign(
            {
                employee_id: employee.employee_id,
                vendor_id: employee.vendor_id,
                email: employee.email,
                role: employee.role,
                type: 'employee'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            employee: {
                employee_id: employee.employee_id,
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email,
                vendor_id: employee.vendor_id,
                role: employee.role,
                department: employee.department,
                position: employee.position,
                company_name: employee.company_name
            }
        });

    } catch (err) {
        console.error("Employee login error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// Employee Logout
const logoutEmployee = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        // Update session to mark as logged out
        await db.query(employeeAuthQueries.updateEmployeeSession, [employee_id]);

        res.status(200).json({ message: "Logout successful" });
    } catch (err) {
        console.error("Employee logout error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// Get Employee Profile
const getEmployeeProfile = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [employees] = await db.query(employeeAuthQueries.getEmployeeById, [employee_id]);

        if (!employees || employees.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const employee = employees[0];
        
        // Remove sensitive information
        delete employee.password;

        res.status(200).json({
            message: "Employee profile retrieved successfully",
            employee
        });

    } catch (err) {
        console.error("Get employee profile error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// Request Password Reset
const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const [employees] = await db.query(employeeAuthQueries.checkEmployeeEmail, [email]);

        if (!employees || employees.length === 0) {
            return res.status(404).json({ error: "Employee email not found" });
        }

        const code = generateResetCode();
        const expiryTime = Date.now() + RESET_EXPIRATION;
        resetCodes.set(email, { code, expires: expiryTime });

        // Send reset code email
        await transport.sendMail({
            from: `"Homiqly Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Employee Password Reset Code",
            html: `
                <h2>Password Reset Request</h2>
                <p>You have requested to reset your password. Use the following code to reset your password:</p>
                <h3 style="color: #3b82f6; font-size: 24px; letter-spacing: 2px;">${code}</h3>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Homiqly Team</p>
            `
        });

        res.status(200).json({ message: "Reset code sent to your email" });

    } catch (err) {
        console.error("Password reset request error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// Verify Reset Code
const verifyResetCode = asyncHandler(async (req, res) => {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
        return res.status(400).json({ error: "Email and reset code are required" });
    }

    const storedData = resetCodes.get(email);
    if (!storedData || storedData.expires < Date.now()) {
        return res.status(400).json({ error: "Invalid or expired reset code" });
    }

    if (storedData.code !== resetCode) {
        return res.status(400).json({ error: "Incorrect reset code" });
    }

    // Remove used code
    resetCodes.delete(email);

    // Generate temporary token for password reset
    const token = jwt.sign({ email, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: "10m" });

    res.status(200).json({ 
        message: "Code verified successfully", 
        token 
    });
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(400).json({ error: "Reset token is required" });
    }

    const token = authHeader.split(" ")[1];
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: "New password is required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ error: "Invalid token type" });
        }

        const email = decoded.email;

        // Check if employee exists
        const [employees] = await db.query(employeeAuthQueries.checkEmployeeEmail, [email]);
        if (!employees || employees.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query(employeeAuthQueries.updateEmployeePassword, [hashedPassword, employees[0].employee_id]);

        res.status(200).json({ message: "Password reset successfully" });

    } catch (err) {
        console.error("Password reset error:", err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(400).json({ error: "Invalid or expired token" });
        }
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// Change Password (authenticated)
const changePassword = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
    }

    try {
        // Get current employee data
        const [employees] = await db.query(employeeAuthQueries.getEmployeeById, [employee_id]);
        if (!employees || employees.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const employee = employees[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, employee.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query(employeeAuthQueries.updateEmployeePassword, [hashedNewPassword, employee_id]);

        res.status(200).json({ message: "Password changed successfully" });

    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

module.exports = {
    loginEmployee,
    logoutEmployee,
    getEmployeeProfile,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
    changePassword
};