const employeeAuthQueries = {
    // Employee authentication queries
    employeeLogin: `
        SELECT 
            ce.employee_id,
            ce.first_name,
            ce.last_name,
            ce.email,
            ce.password,
            ce.vendor_id,
            ce.is_active,
            v.vendorType,
            CASE 
                WHEN v.vendorType = 'company' THEN cd.companyName
                ELSE id.name
            END as company_name
        FROM company_employees ce
        LEFT JOIN vendors v ON ce.vendor_id = v.vendor_id
        LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
        LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
        WHERE ce.email = ? AND ce.is_active = 1
    `,

    updateEmployeeLastLogin: `
        UPDATE company_employees 
        SET last_login = NOW(), fcmToken = ?
        WHERE employee_id = ?
    `,

    createEmployeeSession: `
        INSERT INTO employee_sessions (employee_id, ip_address, user_agent)
        VALUES (?, ?, ?)
    `,

    updateEmployeeSession: `
        UPDATE employee_sessions 
        SET logout_time = NOW(), is_active = FALSE
        WHERE employee_id = ? AND is_active = TRUE
    `,

    getEmployeeById: `
        SELECT 
            ce.*,
            v.vendorType,
            CASE 
                WHEN v.vendorType = 'company' THEN cd.companyName
                ELSE id.name
            END as company_name
        FROM company_employees ce
        LEFT JOIN vendors v ON ce.vendor_id = v.vendor_id
        LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
        LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
        WHERE ce.employee_id = ?
    `,

    updateEmployeePassword: `
        UPDATE company_employees 
        SET password = ?
        WHERE employee_id = ?
    `,

    checkEmployeeEmail: `
        SELECT employee_id, email 
        FROM company_employees 
        WHERE email = ?
    `
};

module.exports = employeeAuthQueries;