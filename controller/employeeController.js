const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const employeeGetQueries = require('../config/employeeQueries/employeeGetQueries');

const createEmployee = asyncHandler(async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        phone
    } = req.body;

    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(401).json({ message: "Unauthorized: Vendor not identified" });
    }
    console.log(vendor_id);

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ message: "Required fields missing" });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO company_employees (
                vendor_id,
                first_name,
                last_name,
                email,
                phone,
                is_active
            ) VALUES (?, ?, ?, ?, ? , 1)
        `, [
            vendor_id,
            first_name,
            last_name,
            email,
            phone
        ]);

        res.status(201).json({
            message: "Employee created successfully",
            employee_id: result.insertId
        });

    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const assignPackageToEmployee = asyncHandler(async (req, res) => {
    const { employee_id, assignedPackages } = req.body;

    if (!employee_id || !Array.isArray(assignedPackages) || assignedPackages.length === 0) {
        return res.status(400).json({ message: "employee_id and assignedPackages[] are required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        for (const pkg of assignedPackages) {
            const [packageInsertResult] = await connection.query(
                `INSERT INTO employee_packages (employee_id, package_id) VALUES (?, ?)`,
                [employee_id, pkg.package_id]
            );

            const employee_package_id = packageInsertResult.insertId;

            // 1. Insert package items
            if (Array.isArray(pkg.sub_packages)) {
                for (const item_id of pkg.sub_packages) {
                    await connection.query(
                        `INSERT INTO employee_package_items (employee_package_id, item_id) VALUES (?, ?)`,
                        [employee_package_id, item_id]
                    );
                }
            }

            // 2. Insert preferences
            if (Array.isArray(pkg.preferences)) {
                for (const pref of pkg.preferences) {
                    await connection.query(
                        `INSERT INTO employee_package_preferences (employee_package_id, preference_id, package_id)
                         VALUES (?, ?, ?)`,
                        [employee_package_id, pref.preference_id, pkg.package_id]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        res.status(200).json({ message: "Packages and preferences assigned to employee successfully" });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error assigning packages:", err);
        res.status(500).json({ error: "Database error", details: err.message });
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
                JOIN packages p ON ep.package_id = p.package_id
                JOIN service_type st ON p.service_type_id = st.service_type_id
                JOIN services s ON st.service_id = s.service_id
                JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
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

module.exports = {
    getAllEmployees,
    createEmployee,
    getEmployeesWithPackages,
    assignPackageToEmployee
};
