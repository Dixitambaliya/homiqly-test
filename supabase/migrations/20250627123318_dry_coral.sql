-- Homiqly Database Schema

-- Users table (enhanced)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255),
    profileImage TEXT,
    address TEXT,
    state VARCHAR(100),
    postalcode VARCHAR(20),
    is_approved TINYINT DEFAULT 1,
    fcmToken TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Supply Kits Management
CREATE TABLE IF NOT EXISTS supply_kits (
    kit_id INT AUTO_INCREMENT PRIMARY KEY,
    kit_name VARCHAR(255) NOT NULL,
    kit_description TEXT,
    kit_price DECIMAL(10,2) NOT NULL,
    kit_image TEXT,
    service_categories_id INT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id)
);

CREATE TABLE IF NOT EXISTS supply_kit_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    kit_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kit_id) REFERENCES supply_kits(kit_id) ON DELETE CASCADE
);

-- Vendor Supply Kit Orders
CREATE TABLE IF NOT EXISTS vendor_supply_kits (
    vendor_kit_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    kit_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (kit_id) REFERENCES supply_kits(kit_id)
);

-- Inventory Management
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    current_stock INT DEFAULT 0,
    reserved_stock INT DEFAULT 0,
    available_stock INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES supply_kit_items(item_id),
    UNIQUE KEY unique_item (item_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'reserved', 'released') NOT NULL,
    quantity INT NOT NULL,
    reference_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES supply_kit_items(item_id)
);

-- Contractors Management
CREATE TABLE IF NOT EXISTS contractors (
    contractor_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    business_license TEXT,
    insurance_certificate TEXT,
    is_verified TINYINT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contractor_services (
    contractor_service_id INT AUTO_INCREMENT PRIMARY KEY,
    contractor_id INT NOT NULL,
    service_id INT NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    is_available TINYINT DEFAULT 1,
    FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    UNIQUE KEY unique_contractor_service (contractor_id, service_id)
);

CREATE TABLE IF NOT EXISTS contractor_bookings (
    contractor_booking_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    contractor_id INT NOT NULL,
    estimated_hours DECIMAL(5,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    booking_status ENUM('assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'assigned',
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP NULL,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id),
    FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id)
);

-- Employee Management
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    employee_type ENUM('full_time', 'part_time', 'contract') NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    salary DECIMAL(10,2),
    hire_date DATE NOT NULL,
    manager_id INT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

CREATE TABLE IF NOT EXISTS employee_tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    due_date DATE,
    assigned_by INT,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (assigned_by) REFERENCES employees(employee_id)
);

CREATE TABLE IF NOT EXISTS employee_performance (
    performance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    review_period VARCHAR(50) NOT NULL,
    rating DECIMAL(3,2) NOT NULL,
    feedback TEXT,
    goals TEXT,
    review_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (reviewer_id) REFERENCES employees(employee_id)
);

-- Payment Management
CREATE TABLE IF NOT EXISTS vendor_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payout_date TIMESTAMP NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id)
);

CREATE TABLE IF NOT EXISTS contractor_payouts (
    payout_id INT AUTO_INCREMENT PRIMARY KEY,
    contractor_id INT NOT NULL,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    payout_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id),
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('vendor_payment', 'contractor_payment', 'supply_kit_payment') NOT NULL,
    reference_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gateway_response TEXT
);

-- Ratings and Reviews
CREATE TABLE IF NOT EXISTS ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    vendor_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    UNIQUE KEY unique_booking_rating (booking_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('users', 'vendors', 'admin', 'contractors') NOT NULL,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSON,
    is_read TINYINT DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL
);

-- Cart System Enhancement
CREATE TABLE IF NOT EXISTS service_cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vendor_id INT NOT NULL,
    service_id INT NOT NULL,
    service_type_id INT NOT NULL,
    service_categories_id INT NOT NULL,
    bookingDate DATE NOT NULL,
    bookingTime TIME NOT NULL,
    bookingStatus TINYINT DEFAULT 0,
    notes TEXT,
    bookingMedia TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (service_type_id) REFERENCES service_type(service_type_id),
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id)
);

CREATE TABLE IF NOT EXISTS cart_packages (
    cart_package_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    package_id INT NOT NULL,
    FOREIGN KEY (cart_id) REFERENCES service_cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(package_id)
);

CREATE TABLE IF NOT EXISTS cart_package_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    sub_package_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    package_id INT NOT NULL,
    item_id INT NOT NULL,
    FOREIGN KEY (cart_id) REFERENCES service_cart(cart_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_preferences (
    cart_preference_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    preference_id INT NOT NULL,
    FOREIGN KEY (cart_id) REFERENCES service_cart(cart_id) ON DELETE CASCADE
);

-- Enhanced Booking System
CREATE TABLE IF NOT EXISTS service_booking_packages (
    booking_package_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    package_id INT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id),
    FOREIGN KEY (package_id) REFERENCES packages(package_id)
);

CREATE TABLE IF NOT EXISTS service_booking_sub_packages (
    booking_sub_package_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    sub_package_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id)
);

CREATE TABLE IF NOT EXISTS service_preferences (
    service_preference_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    preference_id INT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id)
);

CREATE TABLE IF NOT EXISTS service_booking_types (
    booking_type_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    service_type_id INT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id),
    FOREIGN KEY (service_type_id) REFERENCES service_type(service_type_id)
);

-- Add FCM token support to existing tables
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fcmToken TEXT;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS fcmToken TEXT;

-- Indexes for better performance
CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX idx_contractor_bookings_contractor ON contractor_bookings(contractor_id);
CREATE INDEX idx_ratings_vendor ON ratings(vendor_id);
CREATE INDEX idx_notifications_user ON notifications(user_type, user_id);
CREATE INDEX idx_inventory_item ON inventory(item_id);
CREATE INDEX idx_supply_kit_orders_vendor ON vendor_supply_kits(vendor_id);