const employeePutQueries = {
    // Update employee profile
    updateEmployeeProfile: `
        UPDATE company_employees 
        SET 
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            department = COALESCE(?, department),
            position = COALESCE(?, position),
            profile_image = COALESCE(?, profile_image),
            address = COALESCE(?, address),
            emergency_contact = COALESCE(?, emergency_contact),
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND vendor_id = ?
    `,

    // Update employee status
    updateEmployeeStatus: `
        UPDATE company_employees 
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND vendor_id = ?
    `,

    // Update task status
    updateTaskStatus: `
        UPDATE employee_tasks 
        SET 
            status = ?,
            started_at = CASE WHEN ? = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
            completed_at = CASE WHEN ? = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_id = ? AND employee_id = ?
    `,

    // Update booking status by employee
    updateBookingStatusByEmployee: `
        UPDATE service_booking 
        SET 
            bookingStatus = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ? AND assigned_employee_id = ?
    `,

    // Mark notification as read
    markNotificationAsRead: `
        UPDATE employee_notifications 
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE notification_id = ? AND employee_id = ?
    `,

    // Mark all notifications as read
    markAllNotificationsAsRead: `
        UPDATE employee_notifications 
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND is_read = FALSE
    `,

    // Update employee password
    updateEmployeePassword: `
        UPDATE company_employees 
        SET password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
    `,

    // Update employee FCM token
    updateEmployeeFCMToken: `
        UPDATE company_employees 
        SET fcmToken = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
    `,

    // Update employee availability
    updateEmployeeAvailability: `
        UPDATE employee_availability 
        SET 
            start_time = ?,
            end_time = ?,
            is_available = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND day_of_week = ?
    `,

    // Update task assignment
    updateTaskAssignment: `
        UPDATE employee_tasks 
        SET 
            employee_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_id = ? AND assigned_by = ? AND assigned_by_type = ?
    `,

    // Update booking assignment
    updateBookingAssignment: `
        UPDATE service_booking 
        SET 
            assigned_employee_id = ?,
            bookingStatus = CASE 
                WHEN ? IS NOT NULL THEN 'assigned'
                ELSE 'pending'
            END
        WHERE booking_id = ? AND vendor_id = ?
    `,

    // Update employee performance metrics
    updateEmployeePerformanceMetrics: `
        UPDATE employee_performance 
        SET 
            tasks_completed = ?,
            tasks_assigned = ?,
            average_rating = ?,
            total_bookings_handled = ?,
            on_time_completion_rate = ?,
            customer_satisfaction_score = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND review_period = ?
    `
};

module.exports = employeePutQueries;