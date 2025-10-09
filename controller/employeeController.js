const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const employeeGetQueries = require('../config/employeeQueries/employeeGetQueries');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendEmployeeCreationNotification, sendBookingAssignedNotification } = require("./adminNotification");

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

        // ✅ Send booking notification (external service)
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

        // 6️⃣ Insert notifications with try-catch
        try {
            // Notification for user
            const userNotificationMessage = `Hi! ${employeeName} (Employee ID: ${employee_id}) has been assigned to your booking (#${booking_id}).`;
            await connection.query(
                `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
                 VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                ['users', user_id, 'Employee Assigned', userNotificationMessage]
            );

            // Notification for employee
            const employeeNotificationMessage = `Hi ${employeeName}, you have been assigned to booking ID: ${booking_id}.`;
            await connection.query(
                `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
                 VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                ['employee', employee_id, 'Booking Assigned', employeeNotificationMessage]
            );
        } catch (notifErr) {
            console.error("⚠️ Failed to insert notifications:", notifErr.message);
        }

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
        // 1️⃣ Get employee's vendor ID
        const [[employeeRow]] = await db.query(`
            SELECT vendor_id FROM company_employees WHERE employee_id = ?
        `, [employee_id]);
        // const vendor_id = employeeRow?.vendor_id;

        // // 2️⃣ Get vendor type and latest platform fee
        // const [[vendorRow]] = await db.query(bookingGetQueries.getVendorIdForBooking, [vendor_id]);
        // const vendorType = vendorRow?.vendorType || null;

        // const [platformSettings] = await db.query(bookingGetQueries.getPlateFormFee, [vendorType]);
        // const platformFee = Number(platformSettings?.[0]?.platform_fee_percentage ?? 0);

        // 3️⃣ Fetch employee bookings
        const [bookings] = await db.query(`
            SELECT
                sb.booking_id, 
                sb.bookingDate, 
                sb.bookingTime, 
                sb.bookingStatus, 
                sb.notes, 
                sb.bookingMedia, 
                sb.package_id,
                sb.assigned_employee_id,
                sb.payment_status, 
                sb.start_time,
                sb.end_time,
                s.serviceName,
                u.user_id,
                CONCAT(u.firstName,' ', u.lastName) AS userName,
                u.profileImage AS userProfileImage,
                u.email AS userEmail,
                u.phone AS userPhone,
                u.address AS userAddress,
                u.flatNumber AS userFlatNumber,
                u.parkingInstruction AS userParkingInstructions,
                u.postalcode AS userPostalcode,
                u.state AS userState
            FROM service_booking sb
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
            LEFT JOIN users u ON sb.user_id = u.user_id
            WHERE sb.assigned_employee_id = ?
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `, [employee_id]);

        for (const booking of bookings) {
            const bookingId = booking.booking_id;
            // const rawAmount = Number(booking.payment_amount) || 0;

            // // 4️⃣ Calculate platform fee & net amount
            // booking.platform_fee = parseFloat((rawAmount * (platformFee / 100)).toFixed(2));
            // booking.net_amount = parseFloat((rawAmount - booking.platform_fee).toFixed(2));
            // booking.payment_amount = booking.net_amount;

            // 5️⃣ Fetch sub-packages/items, addons, preferences, consents
            const [subPackages] = await db.query(employeeGetQueries.getemployeeBookingSubPackages, [bookingId]);
            const [bookingAddons] = await db.query(employeeGetQueries.getemployeeBookingAddons, [bookingId]);
            const [bookingPreferences] = await db.query(employeeGetQueries.getemployeeBookingPrefrences, [bookingId]);
            const [bookingConsents] = await db.query(employeeGetQueries.getemployeeConcentForm, [bookingId]);

            // 6️⃣ Group addons, preferences, consents by sub_package_id
            const addonsByItem = {};
            bookingAddons.forEach(a => {
                if (!addonsByItem[a.sub_package_id]) addonsByItem[a.sub_package_id] = [];
                addonsByItem[a.sub_package_id].push({
                    addon_id: a.addon_id,
                    addonName: a.addonName,
                    addonMedia: a.addonMedia,
                    quantity: a.quantity
                });
            });

            const prefsByItem = {};
            bookingPreferences.forEach(p => {
                if (!prefsByItem[p.sub_package_id]) prefsByItem[p.sub_package_id] = [];
                prefsByItem[p.sub_package_id].push({
                    preference_id: p.preference_id,
                    preferenceValue: p.preferenceValue
                });
            });

            const consentsByItem = {};
            bookingConsents.forEach(c => {
                if (!consentsByItem[c.sub_package_id]) consentsByItem[c.sub_package_id] = [];
                consentsByItem[c.sub_package_id].push({
                    consent_id: c.consent_id,
                    consentText: c.question,
                    answer: c.answer
                });
            });

            // 7️⃣ Group sub-packages by package_id
            const groupedByPackage = subPackages.reduce((acc, sp) => {
                const packageId = sp.package_id;

                if (!acc[packageId]) {
                    acc[packageId] = {
                        package_id: packageId,
                        packageName: sp.packageName,
                        packageMedia: sp.packageMedia,
                        items: []
                    };
                }

                const addons = addonsByItem[sp.sub_package_id] || [];
                const preferences = prefsByItem[sp.sub_package_id] || [];
                const consents = consentsByItem[sp.sub_package_id] || [];

                acc[packageId].items.push({
                    sub_package_id: sp.sub_package_id,
                    itemName: sp.itemName,
                    itemMedia: sp.itemMedia,
                    timeRequired: sp.timeRequired,
                    quantity: sp.quantity,
                    price: sp.price,
                    ...(addons.length && { addons }),
                    ...(preferences.length && { preferences }),
                    ...(consents.length && { consents })
                });

                return acc;
            }, {});

            booking.subPackages = Object.values(groupedByPackage);

            // // 8️⃣ Attach promo code if exists
            // if (booking.user_promo_code_id) {
            //     let promo = null;

            //     const [[userPromo]] = await db.query(`
            //         SELECT upc.user_promo_code_id AS promo_id,
            //                pc.code AS promoCode,
            //                pc.discountValue,
            //                pc.minSpend
            //         FROM user_promo_codes upc
            //         LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
            //         WHERE upc.user_promo_code_id = ?
            //     `, [booking.user_promo_code_id]);

            //     if (userPromo) {
            //         promo = userPromo;
            //     } else {
            //         const [[systemPromo]] = await db.query(`
            //             SELECT spc.system_promo_code_id AS promo_id,
            //                    spct.code AS promoCode,
            //                    spct.discountValue
            //             FROM system_promo_codes spc
            //             LEFT JOIN system_promo_code_templates spct ON spc.template_id = spct.system_promo_code_template_id 
            //             WHERE spc.system_promo_code_id = ?
            //         `, [booking.user_promo_code_id]);

            //         if (systemPromo) promo = systemPromo;
            //     }

            //     if (promo) booking.promo = promo;
            // }

            // 9️⃣ Remove null fields
            Object.keys(booking).forEach(k => { if (booking[k] === null) delete booking[k]; });
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
        // 1️⃣ Fetch bookings assigned to the employee
        const [bookings] = await db.query(employeeGetQueries.getemployeeBookings, [employee_id]);

        for (const booking of bookings) {
            const bookingId = booking.booking_id;

            // 2️⃣ Fetch sub-packages (each sub-package will have a package_id)
            const [subPackages] = await db.query(employeeGetQueries.getemployeeBookingSubPackages, [bookingId]);

            // 3️⃣ Fetch addons
            const [bookingAddons] = await db.query(employeeGetQueries.getemployeeBookingAddons, [bookingId]);

            // 4️⃣ Fetch preferences
            const [bookingPreferences] = await db.query(employeeGetQueries.getemployeeBookingPrefrences, [bookingId]);

            // 5️⃣ Fetch consents
            const [bookingConsents] = await db.query(employeeGetQueries.getemployeeConcentForm, [bookingId]);

            // 6️⃣ Group addons, preferences, consents by sub_package_id
            const addonsBySubPackage = {};
            bookingAddons.forEach(a => {
                if (!addonsBySubPackage[a.sub_package_id]) addonsBySubPackage[a.sub_package_id] = [];
                addonsBySubPackage[a.sub_package_id].push({
                    addon_id: a.addon_id,
                    addonName: a.addonName,
                    addonMedia: a.addonMedia,
                    quantity: a.quantity
                });
            });

            const preferencesBySubPackage = {};
            bookingPreferences.forEach(p => {
                if (!preferencesBySubPackage[p.sub_package_id]) preferencesBySubPackage[p.sub_package_id] = [];
                preferencesBySubPackage[p.sub_package_id].push({
                    preference_id: p.preference_id,
                    preferenceValue: p.preferenceValue
                });
            });

            const consentsBySubPackage = {};
            bookingConsents.forEach(c => {
                if (!consentsBySubPackage[c.sub_package_id]) consentsBySubPackage[c.sub_package_id] = [];
                consentsBySubPackage[c.sub_package_id].push({
                    consent_id: c.consent_id,
                    consentText: c.question,
                    answer: c.answer
                });
            });

            // 7️⃣ Group sub-packages by package_id
            const packagesMap = {};
            subPackages.forEach(sp => {
                if (!packagesMap[sp.package_id]) {
                    packagesMap[sp.package_id] = {
                        package_id: sp.package_id,
                        packageName: sp.packageName,
                        packageMedia: sp.packageMedia,
                        items: []
                    };
                }

                packagesMap[sp.package_id].items.push({
                    sub_package_id: sp.sub_package_id,
                    itemName: sp.itemName,
                    itemMedia: sp.itemMedia,
                    timeRequired: sp.timeRequired,
                    quantity: sp.quantity,
                    addons: addonsBySubPackage[sp.sub_package_id] || [],
                    preferences: preferencesBySubPackage[sp.sub_package_id] || [],
                    consents: consentsBySubPackage[sp.sub_package_id] || []
                });
            });

            booking.packages = Object.values(packagesMap);

            // 8️⃣ Remove null fields at booking level
            Object.keys(booking).forEach(k => { if (booking[k] === null) delete booking[k]; });

            // 9️⃣ Optional: remove subPackages if you don't want duplicates
            delete booking.subPackages;
        }

        res.status(200).json({
            message: "Employee booking history fetched successfully",
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
