const employeePostQueries = {
    // Create new employee
    createEmployee: `
        INSERT INTO company_employees (
            first_name, 
            last_name, 
            email, 
            phone, 
            password, 
            vendor_id, 
            role, 
            department, 
            position, 
            hire_date, 
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    // Assign employee to booking
    assignEmployeeToBooking: `
        UPDATE service_booking 
        SET assigned_employee_id = ?, bookingStatus = 'assigned'
        WHERE booking_id = ? AND vendor_id = ?
    `,

    // Create booking assignment record
    createBookingAssignment: `
        INSERT INTO booking_assignments (
            booking_id, 
            employee_id, 
            assigned_by, 
            assigned_by_type, 
            notes
        ) VALUES (?, ?, ?, ?, ?)
    `,

    // Create employee task
    createEmployeeTask: `
        INSERT INTO employee_tasks (
            employee_id,
            assigned_by,
            assigned_by_type,
            booking_id,
            task_title,
            task_description,
            priority,
            due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,

    // Create employee notification
    createEmployeeNotification: `
        INSERT INTO employee_notifications (
            employee_id,
            title,
            message,
            type,
            related_booking_id,
            related_task_id
        ) VALUES (?, ?, ?, ?, ?, ?)
    `,

    // Update employee availability
    updateEmployeeAvailability: `
        INSERT INTO employee_availability (
            employee_id, 
            day_of_week, 
            start_time, 
            end_time, 
            is_available
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            start_time = VALUES(start_time),
            end_time = VALUES(end_time),
            is_available = VALUES(is_available),
            updated_at = CURRENT_TIMESTAMP
    `,

    // Record employee performance
    recordEmployeePerformance: `
        INSERT INTO employee_performance (
            employee_id,
            vendor_id,
            review_period,
            tasks_completed,
            tasks_assigned,
            average_rating,
            total_bookings_handled,
            on_time_completion_rate,
            customer_satisfaction_score,
            notes,
            reviewed_by,
            reviewed_by_type,
            review_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            tasks_completed = VALUES(tasks_completed),
            tasks_assigned = VALUES(tasks_assigned),
            average_rating = VALUES(average_rating),
            total_bookings_handled = VALUES(total_bookings_handled),
            on_time_completion_rate = VALUES(on_time_completion_rate),
            customer_satisfaction_score = VALUES(customer_satisfaction_score),
            notes = VALUES(notes),
            reviewed_by = VALUES(reviewed_by),
            reviewed_by_type = VALUES(reviewed_by_type),
            review_date = VALUES(review_date),
            updated_at = CURRENT_TIMESTAMP
    `,

    // Bulk assign employees to vendor packages
    assignEmployeeToPackages: `
        INSERT INTO employee_packages (employee_id, package_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE employee_id = employee_id
    `,

    // Assign employee to package items
    assignEmployeeToPackageItems: `
        INSERT INTO employee_package_items (employee_package_id, item_id)
        VALUES (?, ?)
    `,

    // Assign employee to package preferences
    assignEmployeeToPackagePreferences: `
        INSERT INTO employee_package_preferences (employee_package_id, preference_id, package_id)
        VALUES (?, ?, ?)
    `
};

module.exports = employeePostQueries;