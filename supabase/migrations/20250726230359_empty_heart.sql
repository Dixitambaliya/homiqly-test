/*
  # Employee Management System Migration

  1. Database Schema Updates
    - Update company_employees table with authentication fields
    - Add employee_tasks table for task management
    - Add employee_performance table for tracking
    - Update service_booking status enum
    - Add employee_availability table

  2. Security
    - Enable proper constraints and indexes
    - Add foreign key relationships
    - Set up proper data types

  3. Data Integrity
    - Add validation constraints
    - Set up cascading deletes where appropriate
    - Ensure referential integrity
*/

-- Update company_employees table structure
ALTER TABLE company_employees 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee',
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS fcmToken TEXT,
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20),
ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create employee_tasks table for task management
CREATE TABLE IF NOT EXISTS employee_tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    assigned_by INT NOT NULL, -- admin_id or vendor_id who assigned the task
    assigned_by_type ENUM('admin', 'vendor') NOT NULL,
    booking_id INT NULL, -- if task is related to a booking
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    due_date DATETIME,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES company_employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id) ON DELETE SET NULL
);

-- Create employee_performance table for tracking
CREATE TABLE IF NOT EXISTS employee_performance (
    performance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    vendor_id INT NOT NULL,
    review_period VARCHAR(50) NOT NULL, -- e.g., "Q1 2025", "January 2025"
    tasks_completed INT DEFAULT 0,
    tasks_assigned INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_bookings_handled INT DEFAULT 0,
    on_time_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    notes TEXT,
    reviewed_by INT, -- admin_id or vendor_id
    reviewed_by_type ENUM('admin', 'vendor'),
    review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES company_employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
);

-- Create employee_availability table for scheduling
CREATE TABLE IF NOT EXISTS employee_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES company_employees(employee_id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_day (employee_id, day_of_week)
);

-- Create employee_sessions table for login tracking
CREATE TABLE IF NOT EXISTS employee_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (employee_id) REFERENCES company_employees(employee_id) ON DELETE CASCADE
);

-- Update service_booking table to improve status tracking
ALTER TABLE service_booking 
MODIFY COLUMN bookingStatus ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold') DEFAULT 'pending';

-- Add employee assignment tracking
CREATE TABLE IF NOT EXISTS booking_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    employee_id INT NULL,
    assigned_by INT NOT NULL, -- admin_id or vendor_id
    assigned_by_type ENUM('admin', 'vendor') NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES company_employees(employee_id) ON DELETE SET NULL
);

-- Create employee_notifications table
CREATE TABLE IF NOT EXISTS employee_notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('task_assigned', 'booking_assigned', 'status_update', 'general') DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    related_booking_id INT NULL,
    related_task_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES company_employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (related_booking_id) REFERENCES service_booking(booking_id) ON DELETE SET NULL,
    FOREIGN KEY (related_task_id) REFERENCES employee_tasks(task_id) ON DELETE SET NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee ON employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_due_date ON employee_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_employee_performance_employee ON employee_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_employee ON booking_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notifications_employee ON employee_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notifications_read ON employee_notifications(is_read);

-- Insert default employee roles and departments
INSERT IGNORE INTO service_categories (serviceCategory, created_by) VALUES 
('Employee Management', 'admin');

-- Update existing employees with default values
UPDATE company_employees 
SET 
    role = COALESCE(role, 'employee'),
    department = COALESCE(department, 'General'),
    position = COALESCE(position, 'Service Staff'),
    hire_date = COALESCE(hire_date, CURRENT_DATE),
    is_active = COALESCE(is_active, 1)
WHERE role IS NULL OR department IS NULL OR position IS NULL;

-- Add sample employee availability (9 AM to 6 PM, Monday to Saturday)
INSERT IGNORE INTO employee_availability (employee_id, day_of_week, start_time, end_time, is_available)
SELECT 
    employee_id,
    day_name,
    '09:00:00',
    '18:00:00',
    TRUE
FROM company_employees
CROSS JOIN (
    SELECT 'monday' as day_name UNION ALL
    SELECT 'tuesday' UNION ALL
    SELECT 'wednesday' UNION ALL
    SELECT 'thursday' UNION ALL
    SELECT 'friday' UNION ALL
    SELECT 'saturday'
) days
WHERE company_employees.is_active = 1;

-- Create view for employee dashboard data
CREATE OR REPLACE VIEW employee_dashboard_view AS
SELECT 
    e.employee_id,
    e.first_name,
    e.last_name,
    e.email,
    e.phone,
    e.role,
    e.department,
    e.position,
    e.is_active,
    v.vendor_id,
    CASE 
        WHEN v.vendorType = 'company' THEN cd.companyName
        ELSE CONCAT(id.name)
    END as company_name,
    COUNT(DISTINCT t.task_id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks,
    COUNT(DISTINCT sb.booking_id) as total_bookings,
    COUNT(DISTINCT CASE WHEN sb.bookingStatus = 'completed' THEN sb.booking_id END) as completed_bookings
FROM company_employees e
LEFT JOIN vendors v ON e.vendor_id = v.vendor_id
LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
LEFT JOIN employee_tasks t ON e.employee_id = t.employee_id
LEFT JOIN service_booking sb ON e.employee_id = sb.assigned_employee_id
GROUP BY e.employee_id;

-- Add triggers for automatic performance tracking
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_employee_performance_on_task_completion
AFTER UPDATE ON employee_tasks
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO employee_performance (
            employee_id, 
            vendor_id, 
            review_period, 
            tasks_completed,
            review_date
        ) 
        VALUES (
            NEW.employee_id,
            (SELECT vendor_id FROM company_employees WHERE employee_id = NEW.employee_id),
            CONCAT(MONTHNAME(NOW()), ' ', YEAR(NOW())),
            1,
            CURRENT_DATE
        )
        ON DUPLICATE KEY UPDATE 
            tasks_completed = tasks_completed + 1,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
END//

DELIMITER ;

-- Final message
SELECT 'Employee Management System migration completed successfully!' as Status;