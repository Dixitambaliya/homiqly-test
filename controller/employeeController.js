const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const employeeGetQueries = require('../config/employeeQueries/employeeGetQueries');
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const createEmployee = asyncHandler(async (req, res) => {
    const { first_name, last_name, email, phone } = req.body;
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(401).json({ message: "Unauthorized: Vendor not identified" });
    }

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ message: "Required fields missing" });
    }

    try {
        // 🔐 1️⃣ Check if vendor is of type 'company'
        const [vendorRows] = await db.query(
            "SELECT vendorType FROM vendors WHERE vendor_id = ?",
            [vendor_id]
        );
        console.log(vendorRows);

        if (vendorRows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const vendor = vendorRows[0];

        if (vendor.vendorType !== 'company') {
            return res.status(403).json({ message: "Only company vendors can create employees" });
        }

        // 🔑 2️⃣ Generate random password
        const plainPassword = crypto.randomBytes(4).toString('hex');

        // 🔒 3️⃣ Hash password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 📦 4️⃣ Insert into employee table
        const [result] = await db.query(`
            INSERT INTO company_employees (
                vendor_id,
                first_name,
                last_name,
                email,
                phone,
                password,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [
            vendor_id,
            first_name,
            last_name,
            email,
            phone,
            hashedPassword
        ]);

        // 📧 5️⃣ Send password via email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"${vendor.name}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Employee Login Credentials',
            html: `
                <p>Hi ${first_name},</p>
                <p>You’ve been added as an employee under our company.</p>
                <p><strong>Login Credentials:</strong></p>
                <ul>
                    <li>Email: ${email}</li>
                    <li>Password: <b>${plainPassword}</b></li>
                </ul>
                <p>Please login and update your password after first login.</p>
                <p>Thanks,<br/>${vendor.name}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({
            message: "Employee created and login credentials sent to email",
            employee_id: result.insertId
        });

    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const employeeLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const [rows] = await db.query(
            `SELECT * FROM company_employees WHERE email = ? AND is_active = 1`,
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Employee not found or inactive" });
        }

        const employee = rows[0];

        // ✅ Check if password is valid
        if (typeof employee.password !== 'string') {
            console.error("Invalid password type from DB:", employee.password);
            return res.status(500).json({ message: "Invalid password stored in database" });
        }

        const isMatch = await bcrypt.compare(password, employee.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                employee_id: employee.employee_id,
                vendor_id: employee.vendor_id,
                email: employee.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            employee_id: employee.employee_id
        });

    } catch (error) {
        console.error("Employee login error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const assignBookingToEmployee = asyncHandler(async (req, res) => {
    const { booking_id, employee_id } = req.body;

    if (!booking_id || !employee_id) {
        return res.status(400).json({ message: "booking_id and employee_id are required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // ✅ 1. Get booking info (including service_id)
        const [bookingInfo] = await connection.query(
            `SELECT service_id FROM service_booking WHERE booking_id = ?`,
            [booking_id]
        );

        const service_id = bookingInfo[0]?.service_id;
        if (!service_id) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Service not found for this booking" });
        }

        // ✅ 2. Get employee's vendor_id
        const [employeeInfo] = await connection.query(
            `SELECT vendor_id FROM company_employees WHERE employee_id = ?`,
            [employee_id]
        );

        const vendor_id = employeeInfo[0]?.vendor_id;
        if (!vendor_id) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Employee not found or not linked to a vendor" });
        }

        // ✅ 3. Check vendor type and confirm service access
        const [vendorTypeRow] = await connection.query(
            `SELECT vendorType FROM vendors WHERE vendor_id = ?`,
            [vendor_id]
        );

        const vendorType = vendorTypeRow[0]?.vendorType;
        if (!vendorType) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Vendor not found for employee" });
        }

        let serviceCheck = [];
        if (vendorType === 'individual') {
            [serviceCheck] = await connection.query(
                `SELECT 1 FROM individual_services WHERE vendor_id = ? AND service_id = ?`,
                [vendor_id, service_id]
            );
        } else if (vendorType === 'company') {
            [serviceCheck] = await connection.query(
                `SELECT 1 FROM company_services WHERE vendor_id = ? AND service_id = ?`,
                [vendor_id, service_id]
            );
        }

        if (serviceCheck.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: "This employee's vendor is not registered for the requested service" });
        }

        // ✅ 4. Assign booking to employee and vendor
        await connection.query(
            `UPDATE service_booking SET assigned_employee_id = ?, vendor_id = ? WHERE booking_id = ?`,
            [employee_id, vendor_id, booking_id]
        );

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: `Booking ${booking_id} successfully assigned to employee ${employee_id} and vendor ${vendor_id}`
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error assigning booking to employee:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getEmployeesWithPackages = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        // ✅ 1. Get Company Info
        const [companyRows] = await db.query(`
            SELECT id AS vendor_id, companyName, companyEmail, companyPhone
            FROM company_details
            WHERE vendor_id = ?
        `, [vendor_id]);

        if (companyRows.length === 0) {
            return res.status(404).json({ error: "Company not found for this vendor" });
        }

        const company = companyRows[0];

        // ✅ 2. Get Employees by vendor_id
        const [employees] = await db.query(`
            SELECT
                employee_id,
                first_name,
                last_name,
                phone,
                email,
                is_active,
                created_at
            FROM company_employees
            WHERE vendor_id = ?
        `, [vendor_id]);

        for (const emp of employees) {
            // ✅ 3. Get assigned packages with full detail
            const [packages] = await db.query(`
                SELECT
                    ep.id AS employee_package_id,
                    ep.package_id,
                    p.packageName,
                    p.description,
                    p.totalPrice,
                    p.totalTime,
                    p.packageMedia,
                    p.service_type_id,
                    st.serviceTypeName,
                    st.service_id,
                    s.serviceName,
                    s.service_categories_id,
                    sc.serviceCategory,

                    -- Ratings
                    IFNULL((
                        SELECT ROUND(AVG(r.rating), 1)
                        FROM ratings r
                        WHERE r.package_id = p.package_id
                    ), 0) AS averageRating,

                    IFNULL((
                        SELECT COUNT(r.rating_id)
                        FROM ratings r
                        WHERE r.package_id = p.package_id
                    ), 0) AS totalReviews
                FROM employee_packages ep
                LEFT JOIN packages p ON ep.package_id = p.package_id
                LEFT JOIN service_type st ON p.service_type_id = st.service_type_id
                LEFT JOIN services s ON st.service_id = s.service_id
                LEFT JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
                WHERE ep.employee_id = ?
            `, [emp.employee_id]);

            // ✅ 4. Add sub-packages & preferences
            for (const pkg of packages) {
                // Sub-packages
                const [subPackages] = await db.query(`
                    SELECT
                        pi.item_id AS sub_package_id,
                        pi.itemName AS title,
                        pi.description,
                        pi.price,
                        pi.timeRequired AS time_required,
                        pi.itemMedia
                    FROM employee_package_items epi
                    JOIN package_items pi ON epi.item_id = pi.item_id
                    WHERE epi.employee_package_id = ?
                `, [pkg.employee_package_id]);

                // Preferences
                const [preferences] = await db.query(`
                    SELECT
                        bp.preference_id,
                        bp.preferenceValue
                    FROM employee_package_preferences epp
                    JOIN booking_preferences bp ON epp.preference_id = bp.preference_id
                    WHERE epp.employee_package_id = ?
                `, [pkg.employee_package_id]);

                pkg.sub_packages = subPackages;
                pkg.preferences = preferences;
            }

            emp.assigned_packages = packages;
        }

        // ✅ Final Response
        res.status(200).json({
            message: "Employees with detailed package info fetched successfully",
            company,
            employees
        });

    } catch (err) {
        console.error("Error fetching detailed employee packages:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getEmployeesByVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(401).json({ message: "Unauthorized: Vendor not identified" });
    }

    try {
        const [employees] = await db.query(`
            SELECT
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                is_active,
                created_at
            FROM company_employees
            WHERE vendor_id = ?
        `, [vendor_id]);

        res.status(200).json({
            employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllEmployees = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [employees] = await db.query(employeeGetQueries.getAllEmployees, [vendor_id]);

        res.status(200).json({
            message: "Employees fetched successfully",
            employees
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const deleteEmployee = asyncHandler(async (req, res) => {
    const { employee_id } = req.body;
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(401).json({ message: "Unauthorized: Vendor not identified" });
    }

    if (!employee_id) {
        return res.status(400).json({ message: "employee_id is required" });
    }

    try {
        // 1️⃣ Check if the employee exists and belongs to the vendor
        const [rows] = await db.query(
            `SELECT * FROM company_employees WHERE employee_id = ? AND vendor_id = ?`,
            [employee_id, vendor_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Employee not found or unauthorized" });
        }

        // 2️⃣ Delete the employee
        await db.query(
            `DELETE FROM company_employees WHERE employee_id = ? AND vendor_id = ?`,
            [employee_id, vendor_id]
        );

        res.status(200).json({ message: "Employee deleted successfully" });

    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const toggleEmployeeStatus = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { is_active } = req.body;

    if (employee_id === undefined || is_active === undefined) {
        return res.status(400).json({ message: "employee_id and status are required" });
    }

    if (is_active !== 0 && is_active !== 1) {
        return res.status(400).json({ message: "Invalid status. Use 1 for 'on' or 0 for 'off'" });
    }

    const [rows] = await db.query("SELECT * FROM company_employees WHERE employee_id = ?", [employee_id]);

    if (rows.length === 0) {
        return res.status(404).json({ message: "Employee not found" });
    }

    await db.query("UPDATE company_employees SET is_active = ? WHERE employee_id = ?", [is_active, employee_id]);

    res.status(200).json({
        employee_id,
        is_active
    });
});

const getEmployeeStatus = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    if (!employee_id) {
        return res.status(400).json({ message: "employee_id is required" });
    }

    const [rows] = await db.query(
        "SELECT employee_id, is_active FROM company_employees WHERE employee_id = ?",
        [employee_id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
        employee_id: rows[0].employee_id,
        is_active: rows[0].is_active
    });
});

const getEmployeeBookings = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [bookings] = await db.query(`
            SELECT
                sb.*,
                s.serviceName,
                sc.serviceCategory,
                st.serviceTypeName,
                p.status AS payment_status,
                p.amount AS payment_amount,
                p.currency AS payment_currency,
                CONCAT(u.firstName,' ', u.lastName) AS userName,
                u.profileImage AS userProfileImage,
                u.email AS userEmail,
                u.phone AS userPhone,
                u.address AS userAddress,
                u.state AS userState,
                u.postalcode AS userPostalCode
            FROM service_booking sb
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
            LEFT JOIN users u ON sb.user_id = u.user_id
            WHERE sb.assigned_employee_id = ?
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `, [employee_id]);

        // Loop over bookings to attach package data
        for (const booking of bookings) {
            const bookingId = booking.booking_id;

            // 🔹 Fetch Packages
            const [bookingPackages] = await db.query(`
                SELECT
                    p.package_id,
                    p.packageName,
                    p.totalPrice,
                    p.totalTime,
                    p.packageMedia
                FROM service_booking_packages sbp
                JOIN packages p ON sbp.package_id = p.package_id
                WHERE sbp.booking_id = ?
            `, [bookingId]);

            // 🔹 Fetch Package Items
            const [packageItems] = await db.query(`
                SELECT
                    sbsp.sub_package_id AS item_id,
                    pi.itemName,
                    sbsp.price,
                    sbsp.quantity,
                    pi.itemMedia,
                    pi.timeRequired,
                    pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                WHERE sbsp.booking_id = ?
            `, [bookingId]);

            // 🔹 Group items by package
            const groupedPackages = bookingPackages.map(pkg => {
                const items = packageItems.filter(item => item.package_id === pkg.package_id);
                return { ...pkg, items };
            });

            // 🔹 Fetch Preferences
            const [bookingPreferences] = await db.query(`
                SELECT
                    sp.preference_id,
                    bp.preferenceValue
                FROM service_preferences sp
                JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                WHERE sp.booking_id = ?
            `, [bookingId]);

            booking.packages = groupedPackages;
            booking.package_items = packageItems;
            booking.preferences = bookingPreferences;

            // 🔹 Clean nulls
            Object.keys(booking).forEach(key => {
                if (booking[key] === null) delete booking[key];
            });
        }

        res.status(200).json({
            message: "Employee bookings fetched successfully",
            bookings
        });

    } catch (error) {
        console.error("Error fetching employee bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});



module.exports = {
    createEmployee,
    getAllEmployees,
    getEmployeesWithPackages,
    assignBookingToEmployee,
    employeeLogin,
    getEmployeesByVendor,
    toggleEmployeeStatus,
    deleteEmployee,
    getEmployeeStatus,
    getEmployeeBookings
};
