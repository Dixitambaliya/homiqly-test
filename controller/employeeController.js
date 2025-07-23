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

const getEmployeesWithPackages = asyncHandler(async (req, res) => {
    const { company_id } = req.params;

    try {
        const [employees] = await db.query(`
            SELECT * FROM company_employees WHERE company_id = ?
            `, [company_id]);

        for (const emp of employees) {
            const [packages] = await db.query(`
                    SELECT ep.id AS employee_package_id, ep.package_id, p.packageName, p.totalPrice, p.totalTime
                    FROM employee_packages ep
                    JOIN packages p ON ep.package_id = p.package_id
                    WHERE ep.employee_id = ?
                    `, [emp.employee_id]);

            for (const pkg of packages) {
                const [items] = await db.query(`
                            SELECT epi.package_item_id, pi.itemName, pi.timeRequired
                            FROM employee_package_items epi
                            JOIN package_items pi ON epi.package_item_id = pi.package_item_id
                            WHERE epi.employee_package_id = ?
                            `, [pkg.employee_package_id]);

                pkg.package_items = items;
            }

            emp.assigned_packages = packages;
        }

        res.status(200).json({ message: "Employees with packages fetched", employees });

    } catch (err) {
        console.error("Error fetching employees with packages:", err);
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
    assignTask,
    getEmployeesWithPackages,
    assignPackageToEmployee
};
