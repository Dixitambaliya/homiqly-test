const employeeGetQueries = {

    getAllEmployees: `
    SELECT
        e.employee_id,
        e.first_name,
        e.last_name,
        e.profile_image,
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

    getemployeeBookings:
        ` SELECT
                sb.*,
                s.serviceName,
                p.status AS payment_status,
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
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
            LEFT JOIN users u ON sb.user_id = u.user_id
            WHERE sb.assigned_employee_id = ? AND sb.completed_flag = 1
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `,

    getemployeeBookingPackages: `
                SELECT
                    p.package_id,
                    p.packageName,
                    p.packageMedia
                FROM service_booking_packages sbp
                JOIN packages p ON sbp.package_id = p.package_id
                WHERE sbp.booking_id = ?`,

    getemployeeBookingSubPackages: `                
                SELECT
                    sbsp.sub_package_id AS item_id,
                    pi.itemName,
                    sbsp.quantity,
                    pi.itemMedia,
                    pi.timeRequired,
                    pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                WHERE sbsp.booking_id = ?`,

    getemployeeBookingAddons: `                
                SELECT
                    sba.package_id,
                    sba.addon_id,
                    a.addonName,
                    sba.quantity
                FROM service_booking_addons sba
                LEFT JOIN package_addons a ON sba.addon_id = a.addon_id
                WHERE sba.booking_id = ?`,

    getemployeeBookingPrefrences: `                
                SELECT
                    bp.preferenceValue,
                    sp.preference_id
                FROM service_booking_preferences sp
                JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                WHERE sp.booking_id = ?`,

    getemployeeConcentForm: `                
                SELECT 
                    c.consent_id, 
                    c.question, 
                    sbc.answer, 
                    sbc.package_id
                FROM service_booking_consents sbc
                LEFT JOIN package_consent_forms c ON sbc.consent_id = c.consent_id
                WHERE sbc.booking_id = ?`,
                
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
