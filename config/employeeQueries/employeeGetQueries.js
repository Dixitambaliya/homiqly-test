const employeeGetQueries = {

    getAllEmployees: `
    SELECT
        e.employee_id,
        e.first_name,
        e.last_name,
        e.profile_iamge,
        e.vendor_id,
        e.phone,
        e.email,
        e.is_active,
        e.created_at AS employee_created_at,

        cd.dob,
        cd.profileImage,
        cd.companyName,
        cd.contactPerson,
        cd.companyEmail,
        cd.companyPhone,
        cd.googleBusinessProfileLink,
        cd.companyAddress,
        cd.created_at AS vendor_created_at

    FROM company_employees e
    LEFT JOIN company_details cd ON e.vendor_id = cd.vendor_id
    WHERE e.is_active = 1 AND e.vendor_id = ?
    ORDER BY e.first_name ASC
`,

    getEmployeeById: `
        SELECT * FROM employees WHERE employee_id = ?
    `,

    getEmployeesByDepartment: `
        SELECT * FROM employees WHERE department = ? AND is_active = 1
    `,

    getEmployeeTasks: `
        SELECT
            et.task_id,
            et.task_title,
            et.task_description,
            et.priority,
            et.status,
            et.due_date,
            et.assigned_date,
            et.completed_date,

            CONCAT(a.first_name, ' ', a.last_name) AS assigned_by_name

        FROM employee_tasks et
        LEFT JOIN employees a ON et.assigned_by = a.employee_id
        WHERE et.employee_id = ?
        ORDER BY et.due_date ASC
    `,

    getEmployeePerformance: `
        SELECT
            ep.performance_id,
            ep.review_period,
            ep.rating,
            ep.feedback,
            ep.goals,
            ep.review_date,

            CONCAT(r.first_name, ' ', r.last_name) AS reviewer_name

        FROM employee_performance ep
        LEFT JOIN employees r ON ep.reviewer_id = r.employee_id
        WHERE ep.employee_id = ?
        ORDER BY ep.review_date DESC
    `
};

module.exports = employeeGetQueries;
