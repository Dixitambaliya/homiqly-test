const employeeGetQueries = {
    // Get all employees for a specific vendor (company)
    getEmployeesByVendor: `
        SELECT 
            ce.employee_id,
            ce.first_name,
            ce.last_name,
            ce.email,
            ce.phone,
            ce.role,
            ce.department,
            ce.position,
            ce.hire_date,
            ce.is_active,
            ce.profile_image,
            ce.last_login,
            COUNT(DISTINCT t.task_id) as total_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks,
            COUNT(DISTINCT sb.booking_id) as assigned_bookings
        FROM company_employees ce
        LEFT JOIN employee_tasks t ON ce.employee_id = t.employee_id
        LEFT JOIN service_booking sb ON ce.employee_id = sb.assigned_employee_id
        WHERE ce.vendor_id = ? AND ce.is_active = 1
        GROUP BY ce.employee_id
        ORDER BY ce.created_at DESC
    `,

    // Get employee assigned bookings
    getEmployeeBookings: `
        SELECT 
            sb.booking_id,
            sb.bookingDate,
            sb.bookingTime,
            sb.bookingStatus,
            sb.notes,
            sb.bookingMedia,
            CONCAT(u.firstName, ' ', u.lastName) as customer_name,
            u.phone as customer_phone,
            u.email as customer_email,
            u.address as customer_address,
            s.serviceName,
            sc.serviceCategory,
            st.serviceTypeName,
            p.packageName,
            p.totalPrice,
            p.totalTime,
            ba.assigned_at,
            ba.notes as assignment_notes
        FROM service_booking sb
        JOIN users u ON sb.user_id = u.user_id
        JOIN services s ON sb.service_id = s.service_id
        JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
        LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
        LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
        LEFT JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
        LEFT JOIN packages p ON sbp.package_id = p.package_id
        LEFT JOIN booking_assignments ba ON sb.booking_id = ba.booking_id
        WHERE sb.assigned_employee_id = ?
        ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
    `,

    // Get employee tasks
    getEmployeeTasks: `
        SELECT 
            et.task_id,
            et.task_title,
            et.task_description,
            et.priority,
            et.status,
            et.due_date,
            et.started_at,
            et.completed_at,
            et.created_at,
            et.booking_id,
            CASE 
                WHEN et.assigned_by_type = 'admin' THEN a.name
                WHEN et.assigned_by_type = 'vendor' AND v.vendorType = 'company' THEN cd.companyName
                WHEN et.assigned_by_type = 'vendor' AND v.vendorType = 'individual' THEN id.name
                ELSE 'Unknown'
            END as assigned_by_name,
            et.assigned_by_type,
            sb.bookingDate,
            sb.bookingTime,
            s.serviceName
        FROM employee_tasks et
        LEFT JOIN admin a ON et.assigned_by = a.admin_id AND et.assigned_by_type = 'admin'
        LEFT JOIN vendors v ON et.assigned_by = v.vendor_id AND et.assigned_by_type = 'vendor'
        LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
        LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
        LEFT JOIN service_booking sb ON et.booking_id = sb.booking_id
        LEFT JOIN services s ON sb.service_id = s.service_id
        WHERE et.employee_id = ?
        ORDER BY et.due_date ASC, et.priority DESC
    `,

    // Get employee performance data
    getEmployeePerformance: `
        SELECT 
            ep.*,
            CASE 
                WHEN ep.reviewed_by_type = 'admin' THEN a.name
                WHEN ep.reviewed_by_type = 'vendor' AND v.vendorType = 'company' THEN cd.companyName
                WHEN ep.reviewed_by_type = 'vendor' AND v.vendorType = 'individual' THEN id.name
                ELSE 'System'
            END as reviewed_by_name
        FROM employee_performance ep
        LEFT JOIN admin a ON ep.reviewed_by = a.admin_id AND ep.reviewed_by_type = 'admin'
        LEFT JOIN vendors v ON ep.reviewed_by = v.vendor_id AND ep.reviewed_by_type = 'vendor'
        LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
        LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
        WHERE ep.employee_id = ?
        ORDER BY ep.review_date DESC
    `,

    // Get employee availability
    getEmployeeAvailability: `
        SELECT 
            day_of_week,
            start_time,
            end_time,
            is_available
        FROM employee_availability
        WHERE employee_id = ?
        ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    `,

    // Get employee notifications
    getEmployeeNotifications: `
        SELECT 
            en.notification_id,
            en.title,
            en.message,
            en.type,
            en.is_read,
            en.created_at,
            en.read_at,
            sb.bookingDate,
            sb.bookingTime,
            s.serviceName,
            et.task_title
        FROM employee_notifications en
        LEFT JOIN service_booking sb ON en.related_booking_id = sb.booking_id
        LEFT JOIN services s ON sb.service_id = s.service_id
        LEFT JOIN employee_tasks et ON en.related_task_id = et.task_id
        WHERE en.employee_id = ?
        ORDER BY en.created_at DESC
        LIMIT 50
    `,

    // Get employee dashboard stats
    getEmployeeDashboardStats: `
        SELECT 
            COUNT(DISTINCT et.task_id) as total_tasks,
            COUNT(DISTINCT CASE WHEN et.status = 'pending' THEN et.task_id END) as pending_tasks,
            COUNT(DISTINCT CASE WHEN et.status = 'in_progress' THEN et.task_id END) as in_progress_tasks,
            COUNT(DISTINCT CASE WHEN et.status = 'completed' THEN et.task_id END) as completed_tasks,
            COUNT(DISTINCT sb.booking_id) as total_bookings,
            COUNT(DISTINCT CASE WHEN sb.bookingStatus = 'pending' THEN sb.booking_id END) as pending_bookings,
            COUNT(DISTINCT CASE WHEN sb.bookingStatus = 'in_progress' THEN sb.booking_id END) as in_progress_bookings,
            COUNT(DISTINCT CASE WHEN sb.bookingStatus = 'completed' THEN sb.booking_id END) as completed_bookings,
            COUNT(DISTINCT CASE WHEN en.is_read = 0 THEN en.notification_id END) as unread_notifications
        FROM company_employees ce
        LEFT JOIN employee_tasks et ON ce.employee_id = et.employee_id
        LEFT JOIN service_booking sb ON ce.employee_id = sb.assigned_employee_id
        LEFT JOIN employee_notifications en ON ce.employee_id = en.employee_id
        WHERE ce.employee_id = ?
    `,

    // Get available employees for assignment
    getAvailableEmployees: `
        SELECT 
            ce.employee_id,
            ce.first_name,
            ce.last_name,
            ce.email,
            ce.phone,
            ce.department,
            ce.position,
            ce.profile_image,
            COUNT(DISTINCT sb.booking_id) as current_bookings,
            COUNT(DISTINCT CASE WHEN et.status IN ('pending', 'in_progress') THEN et.task_id END) as active_tasks
        FROM company_employees ce
        LEFT JOIN service_booking sb ON ce.employee_id = sb.assigned_employee_id 
            AND sb.bookingStatus IN ('pending', 'assigned', 'in_progress')
        LEFT JOIN employee_tasks et ON ce.employee_id = et.employee_id
        WHERE ce.vendor_id = ? AND ce.is_active = 1
        GROUP BY ce.employee_id
        HAVING current_bookings < 5 -- Limit concurrent bookings
        ORDER BY current_bookings ASC, active_tasks ASC
    `
};

module.exports = employeeGetQueries;