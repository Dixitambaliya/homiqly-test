const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const employeeGetQueries = require('../config/employeeQueries/employeeGetQueries');
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendEmployeeCreationNotification,
    sendBookingAssignedNotification
} = require("./adminNotification");

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
        if (vendorRows.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const vendor = vendorRows[0];
        if (vendor.vendorType !== "company") {
            return res.status(403).json({ message: "Only company vendors can create employees" });
        }

        // 🏢 Get vendorName once here (reusable everywhere)
        const [vendorInfo] = await db.query(
            `SELECT companyName FROM company_details WHERE vendor_id = ?`,
            [vendor_id]
        );
        const vendorName = vendorInfo[0]?.companyName || `Vendor #${vendor_id}`;

        // 🔑 2️⃣ Generate random password
        const plainPassword = crypto.randomBytes(4).toString("hex");

        // 🔒 3️⃣ Hash password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 📦 4️⃣ Insert into employee table
        const [result] = await db.query(
            `
            INSERT INTO company_employees (
                vendor_id,
                first_name,
                last_name,
                email,
                phone,
                password,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
            `,
            [vendor_id, first_name, last_name, email, phone, hashedPassword]
        );

        // 🔔 Admin notification
        try {
            const employeeFullName = `${first_name} ${last_name}`;
            await db.query(
                `INSERT INTO notifications (
                    user_type,
                    user_id,
                    title,
                    body,
                    is_read,
                    sent_at
                ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                [
                    "admin",
                    null,
                    "New Employee Added",
                    `Vendor ${vendorName} (Vendor ID: ${vendor_id}) has added a new employee: ${employeeFullName}.`
                ]
            );
        } catch (err) {
            console.error("⚠️ Failed to insert admin notification:", err.message);
        }

        // 🔔 Vendor notification
        try {
            await sendEmployeeCreationNotification(vendor_id, `${first_name} ${last_name}`);
        } catch (err) {
            console.error("Error sending employee creation notification:", err.message);
        }

        // 📧 5️⃣ Send password via email
        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: `"${vendorName}" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Your Employee Login Credentials",
                html: `
                    <p>Hi ${first_name},</p>
                    <p>You’ve been added as an employee under <strong>${vendorName}</strong>.</p>
                    <p><strong>Login Credentials:</strong></p>
                    <ul>
                        <li>Email: ${email}</li>
                        <li>Password: <b>${plainPassword}</b></li>
                    </ul>
                    <p>Please login and update your password after first login.</p>
                    <p>Thanks,<br/>${vendorName}</p>
                `
            };

            await transporter.sendMail(mailOptions);
        } catch (err) {
            console.error("Error sending email:", err.message);
        }

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
    const { email, password, fcmToken } = req.body;

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

        // ✅ Optional: Update FCM token if new and different
        if (fcmToken && fcmToken.trim() !== "") {
            const trimmedToken = fcmToken.trim();

            if (employee.fcmToken !== trimmedToken) {
                try {
                    await db.query(
                        "UPDATE company_employees SET fcmToken = ? WHERE employee_id = ?",
                        [trimmedToken, employee.employee_id]
                    );
                    console.log("✅ FCM token updated for employee:", employee.employee_id);
                } catch (err) {
                    console.error("❌ FCM token update error:", err.message);
                }
            } else {
                console.log("ℹ️ FCM token already up to date for employee:", employee.employee_id);
            }
        }


        const token = jwt.sign(
            {
                employee_id: employee.employee_id,
                vendor_id: employee.vendor_id,
                email: employee.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const fullName = `${employee.first_name} ${employee.last_name}`

        res.status(200).json({
            message: "Login successful",
            token,
            employee_id: employee.employee_id,
            name: fullName
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
        // 1️⃣ Get booking info including package_id and user_id
        const [bookingInfo] = await connection.query(
            `SELECT package_id, user_id FROM service_booking WHERE booking_id = ?`,
            [booking_id]
        );

        const package_id = bookingInfo[0]?.package_id;
        const user_id = bookingInfo[0]?.user_id;

        if (!package_id) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Package not found for this booking" });
        }

        // 2️⃣ Get employee's vendor_id
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

        // 3️⃣ Check if vendor has this package
        const [packageCheck] = await connection.query(
            `SELECT 1 FROM vendor_packages WHERE vendor_id = ? AND package_id = ?`,
            [vendor_id, package_id]
        );

        if (packageCheck.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: "This employee's vendor is not registered for the requested package" });
        }

        // 4️⃣ Assign booking to employee and vendor
        await connection.query(
            `UPDATE service_booking SET assigned_employee_id = ?, vendor_id = ? WHERE booking_id = ?`,
            [employee_id, vendor_id, booking_id]
        );

        try {
            sendBookingAssignedNotification(employee_id, booking_id);
        } catch (err) {
            console.error("⚠️ Failed to send booking assignment notification:", err.message);
        }

        await connection.commit();

        // 5️⃣ Fetch employee name
        let employeeName = `Employee #${employee_id}`;
        const [employeeNameRow] = await connection.query(
            `SELECT CONCAT(first_name , ' ' , last_name) AS name FROM company_employees WHERE employee_id = ?`,
            [employee_id]
        );
        employeeName = employeeNameRow[0]?.name || employeeName;

        // 6️⃣ Insert notification for user
        const notificationMessage = `Hi! ${employeeName} (Employee ID: ${employee_id}) has been assigned to your booking (#${booking_id}).`;

        await connection.query(
            `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
             VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            ['users', user_id, 'Employee Assigned', notificationMessage]
        );

        // 7️⃣ Insert notification for employee
        await connection.query(
            `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
             VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            ['employee', employee_id, 'Booking Assigned', `Hi ${employeeName}, you have been assigned to booking ID: ${booking_id}.`]
        );

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
                    p.service_type_id,
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
                profile_image,
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
                p.status AS payment_status,
                CONCAT(u.firstName,' ', u.lastName) AS userName,
                u.profileImage AS userProfileImage,
                u.email AS userEmail,
                u.phone AS userPhone,
                u.address AS userAddress,
                u.state AS userState,
                u.postalcode AS userPostalCode
            FROM service_booking sb
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
            LEFT JOIN users u ON sb.user_id = u.user_id
            WHERE sb.assigned_employee_id = ?
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `, [employee_id]);

        for (const booking of bookings) {
            const bookingId = booking.booking_id;

            // 🔹 Fetch Packages
            const [bookingPackages] = await db.query(`
                SELECT
                    p.package_id,
                    p.packageName,
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
                    sbsp.quantity,
                    pi.itemMedia,
                    pi.timeRequired,
                    pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                WHERE sbsp.booking_id = ?
            `, [bookingId]);

            // 🔹 Fetch Addons
            const [bookingAddons] = await db.query(`
                SELECT
                    sba.addon_id,
                    a.addonName,
                    sba.quantity,
                    sba.package_id
                FROM service_booking_addons sba
                LEFT JOIN package_addons a ON sba.addon_id = a.addon_id
                WHERE sba.booking_id = ?
            `, [bookingId]);

            // 🔹 Fetch Preferences
            const [bookingPreferences] = await db.query(`
                SELECT
                sp.preference_id,
                bp.preferenceValue
                FROM service_booking_preferences sp
                    LEFT JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                    WHERE sp.booking_id = ?
            `, [bookingId]);

            // 🔹 Fetch Consents
            const [bookingConsents] = await db.query(`
                SELECT 
                    c.consent_id, 
                    c.question AS consentText, 
                    sbc.answer,
                    sbc.package_id
                FROM service_booking_consents sbc
                LEFT JOIN package_consent_forms c ON sbc.consent_id = c.consent_id
                WHERE sbc.booking_id = ?
            `, [bookingId]);

            // 🔹 Group consents by package_id
            const consentsGroupedByPackage = {};
            bookingConsents.forEach(consent => {
                const pkgId = consent.package_id || 'no_package';
                if (!consentsGroupedByPackage[pkgId]) consentsGroupedByPackage[pkgId] = [];
                consentsGroupedByPackage[pkgId].push({
                    consent_id: consent.consent_id,
                    consentText: consent.consentText,
                    answer: consent.answer
                });
            });

            // 🔹 Merge everything into packages
            booking.packages = bookingPackages.map(pkg => {
                const items = packageItems
                    .filter(item => item.package_id === pkg.package_id)
                    .map(({ package_id, ...rest }) => rest); // remove package_id

                const addons = bookingAddons
                    .filter(addon => addon.package_id === pkg.package_id)
                    .map(({ package_id, ...rest }) => rest);

                const preferences = bookingPreferences
                    .map(({ package_id, ...rest }) => rest);

                const consents = consentsGroupedByPackage[pkg.package_id] || [];

                return {
                    ...pkg,
                    items,
                    addons,
                    preferences,
                    consents
                };
            });

            // 🔹 Remove old top-level arrays
            delete booking.package_items;
            delete booking.addons;
            delete booking.preferences;
            delete booking.consents;

            // 🔹 Clean null/empty fields
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

const getEmployeeProfile = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    if (!employee_id) {
        return res.status(401).json({ message: "Unauthorized: employee_id missing" });
    }

    try {
        const [rows] = await db.query(
            `SELECT employee_id, first_name, last_name, profile_image, vendor_id, phone, email, is_active, created_at
             FROM company_employees
             WHERE employee_id = ?`,
            [employee_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        console.error("Error fetching employee profile:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

const editEmployeeProfile = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { first_name, last_name, phone, email } = req.body;

    if (!employee_id) {
        return res.status(401).json({ message: "Unauthorized: employee_id missing" });
    }

    const newProfileImage = req.uploadedFiles?.profile_image?.[0]?.url || null;

    try {
        // Step 1: Fetch existing employee data
        const [existingRows] = await db.query(
            `SELECT first_name, last_name, phone, email, profile_image FROM company_employees WHERE employee_id = ?`,
            [employee_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const existing = existingRows[0];

        // Step 2: Merge with new values
        const updatedFirstName = first_name || existing.first_name;
        const updatedLastName = last_name || existing.last_name;
        const updatedPhone = phone || existing.phone;
        const updatedEmail = email || existing.email;
        const updatedProfileImage = newProfileImage || existing.profile_image;

        // Step 3: Update the record
        const [result] = await db.query(
            `UPDATE company_employees
             SET first_name = ?, last_name = ?, phone = ?, email = ?, profile_image = ?
             WHERE employee_id = ?`,
            [updatedFirstName, updatedLastName, updatedPhone, updatedEmail, updatedProfileImage, employee_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Nothing was updated" });
        }

        res.status(200).json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Error updating employee profile:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

const updateBookingStatusByEmployee = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;
    const { booking_id, status } = req.body;

    // ✅ Validate input
    if (!booking_id || ![3, 4].includes(status)) {
        return res.status(400).json({ message: "Invalid booking ID or status" });
    }

    try {
        // 🔐 Check if the booking is assigned to the current employee
        const [checkBooking] = await db.query(
            `SELECT sb.booking_id, 
                sb.assigned_employee_id, 
                sb.user_id,
                p.status AS payment_status
            FROM service_booking sb
            LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
            WHERE sb.booking_id = ? AND sb.assigned_employee_id = ?`,
            [booking_id, employee_id]
        );


        if (checkBooking.length === 0) {
            return res.status(403).json({ message: "Unauthorized or booking not assigned to this employee" });
        }

        const { payment_status, user_id } = checkBooking[0];

        if (payment_status !== 'completed') {
            return res.status(400).json({ message: "Cannot start or complete service. Payment is not complete." });
        }

        // ✅ Determine completed_flag
        const completed_flag = status === 4 ? 1 : 0;
        const now = new Date();

        let updateFields = `bookingStatus = ?, completed_flag = ?`;
        const updateParams = [status, completed_flag];

        if (status === 3) {
            // service started → set start_time if not already set
            updateFields += `, start_time = ?`;
            updateParams.push(now);
        } else if (status === 4) {
            // service completed → set end_time
            updateFields += `, end_time = ?`;
            updateParams.push(now);
        }

        updateParams.push(booking_id);

        // ✅ Update the booking status and completed flag
        await db.query(
            `UPDATE service_booking SET ${updateFields} WHERE booking_id = ?`,
            updateParams
        );

        // 🔔 Create USER notification (best-effort)
        let notifTitle, notifBody, ratingLink = null;

        if (status === 3) {
            notifTitle = "Service Started";
            notifBody = `Employee has started your service for booking #${booking_id}.`;
        } else if (status === 4) {
            notifTitle = "Service Completed";
            notifBody = `Employee has completed your service for booking #${booking_id}. Please take a moment to rate your experience.`;
            ratingLink = `https://homiqly-h81s.vercel.app/checkout/rating?booking_id=${booking_id}`;
        }

        // ✅ Always insert the same number of columns
        await db.query(
            `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at, action_link)
     VALUES ('users', ?, ?, ?, 0, CURRENT_TIMESTAMP, ?)`,
            [user_id, notifTitle, notifBody, ratingLink]  // ratingLink can be NULL if no link
        );

        res.status(200).json({
            message: `Booking marked as ${status === 3 ? 'started' : 'completed'} successfully`
        });

    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

const getEmployeeBookingHistory = asyncHandler(async (req, res) => {
    const employee_id = req.user.employee_id;

    try {
        const [bookings] = await db.query(employeeGetQueries.getemployeeBookings, [employee_id]);

        for (const booking of bookings) {
            const bookingId = booking.booking_id;

            // Packages
            const [bookingPackages] = await db.query(employeeGetQueries.getemployeeBookingPackages, [bookingId]);

            // Package Items
            const [packageItems] = await db.query(employeeGetQueries.getemployeeBookingSubPackages, [bookingId]);

            // Addons
            const [bookingAddons] = await db.query(employeeGetQueries.getemployeeBookingAddons, [bookingId]);

            // Preferences
            const [bookingPreferences] = await db.query(employeeGetQueries.getemployeeBookingPrefrences, [bookingId]);

            // Consents
            const [bookingConsents] = await db.query(employeeGetQueries.getemployeeConcentForm, [bookingId]);

            // Group consents by package_id
            const consentsGroupedByPackage = {};
            bookingConsents.forEach(consent => {
                const pkgId = consent.package_id || 'no_package';
                if (!consentsGroupedByPackage[pkgId]) consentsGroupedByPackage[pkgId] = [];
                consentsGroupedByPackage[pkgId].push({
                    consent_id: consent.consent_id,
                    consentText: consent.question,
                    answer: consent.answer
                });
            });

            // Merge everything into packages
            booking.packages = bookingPackages.map(pkg => {
                const items = packageItems
                    .filter(item => item.package_id === pkg.package_id)
                    .map(({ package_id, ...rest }) => rest);
                const addons = bookingAddons
                    .filter(addon => addon.package_id === pkg.package_id)
                    .map(({ package_id, ...rest }) => rest);
                const preferences = bookingPreferences
                    .map(({ package_id, ...rest }) => rest);
                const consents = consentsGroupedByPackage[pkg.package_id] || [];

                return {
                    ...pkg,
                    items,
                    addons,
                    preferences,
                    consents
                };
            });

            // Remove top-level arrays
            delete booking.package_items;
            delete booking.addons;
            delete booking.preferences;
            delete booking.consents;

            // Remove null/empty fields
            Object.keys(booking).forEach(key => {
                if (booking[key] === null) delete booking[key];
            });
        }

        res.status(200).json({
            message: "Completed bookings fetched successfully",
            bookings
        });

    } catch (error) {
        console.error("Error fetching completed bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

const changeEmployeePassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const employee_id = req.user.employee_id; // from auth middleware

    if (!employee_id) {
        return res.status(401).json({ message: "Unauthorized: employee_id missing from token" });
    }

    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "New password must be at least 4 characters long" });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await db.query(
            `UPDATE company_employees SET password = ? WHERE employee_id = ?`,
            [hashedPassword, employee_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error changing employee password:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
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
    getEmployeeBookings,
    getEmployeeProfile,
    editEmployeeProfile,
    updateBookingStatusByEmployee,
    getEmployeeBookingHistory,
    changeEmployeePassword
};
