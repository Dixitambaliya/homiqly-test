/*
  # Homiqly Complete Database Schema

  This schema includes all tables for the Homiqly platform including:
  1. User Management (users, vendors, admin)
  2. Service Management (categories, services, service types)
  3. Booking System (bookings, packages, preferences)
  4. Supply Kit Management
  5. Contractor Network
  6. Employee Management
  7. Payment System
  8. Analytics and Reporting
  9. Notifications
  10. Ratings and Reviews
*/

-- Users table
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

-- Admin table
CREATE TABLE IF NOT EXISTS admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    phone VARCHAR(20),
    country VARCHAR(100),
    address TEXT,
    state VARCHAR(100),
    city VARCHAR(100),
    zip_code VARCHAR(20),
    about TEXT,
    fcmToken TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,
    vendorType ENUM('individual', 'company') NOT NULL,
    password VARCHAR(255),
    is_authenticated TINYINT DEFAULT 0 COMMENT '0=pending, 1=approved, 2=rejected',
    fcmToken TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Individual vendor details
CREATE TABLE IF NOT EXISTS individual_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profileImage TEXT,
    resume TEXT,
    otherInfo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
);

-- Company vendor details
CREATE TABLE IF NOT EXISTS company_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    companyName VARCHAR(200) NOT NULL,
    contactPerson VARCHAR(100) NOT NULL,
    companyEmail VARCHAR(255) NOT NULL,
    googleBusinessProfileLink TEXT,
    companyPhone VARCHAR(20) NOT NULL,
    companyAddress TEXT NOT NULL,
    profileImage TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
);

-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
    service_categories_id INT AUTO_INCREMENT PRIMARY KEY,
    serviceCategory VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services
CREATE TABLE IF NOT EXISTS services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_categories_id INT NOT NULL,
    serviceName VARCHAR(200) NOT NULL,
    serviceDescription TEXT,
    serviceImage TEXT,
    slug VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id) ON DELETE CASCADE
);

-- Service cities
CREATE TABLE IF NOT EXISTS service_city (
    service_city_id INT AUTO_INCREMENT PRIMARY KEY,
    serviceCityId INT,
    serviceCityName VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual service categories mapping
CREATE TABLE IF NOT EXISTS individual_service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    service_categories_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id) ON DELETE CASCADE
);

-- Company service categories mapping
CREATE TABLE IF NOT EXISTS company_service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    service_categories_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id) ON DELETE CASCADE
);

-- Individual services
CREATE TABLE IF NOT EXISTS individual_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    service_id INT NOT NULL,
    serviceLocation VARCHAR(255),
    serviceDescription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Company services
CREATE TABLE IF NOT EXISTS company_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    service_id INT NOT NULL,
    serviceLocation VARCHAR(255),
    serviceDescription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Service types
CREATE TABLE IF NOT EXISTS service_type (
    service_type_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    vendor_id INT NOT NULL,
    serviceTypeName VARCHAR(200) NOT NULL,
    serviceTypeMedia TEXT,
    is_approved TINYINT DEFAULT 0 COMMENT '0=pending, 1=approved, 2=rejected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
);

-- Packages
CREATE TABLE IF NOT EXISTS packages (
    package_id INT AUTO_INCREMENT PRIMARY KEY,
    service_type_id INT NOT NULL,
    vendor_id INT NOT NULL,
    packageName VARCHAR(200) NOT NULL,
    description TEXT,
    totalPrice DECIMAL(10,2) NOT NULL,
    totalTime VARCHAR(100),
    packageMedia TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_type_id) REFERENCES service_type(service_type_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
);

-- Package items
CREATE TABLE IF NOT EXISTS package_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    vendor_id INT NOT NULL,
    itemName VARCHAR(200) NOT NULL,
    itemMedia TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    timeRequired VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE
);

-- Booking preferences
CREATE TABLE IF NOT EXISTS booking_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    preferenceValue VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE
);

-- Service bookings
CREATE TABLE IF NOT EXISTS service_booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    service_categories_id INT NOT NULL,
    service_id INT NOT NULL,
    vendor_id INT NOT NULL,
    user_id INT NOT NULL,
    bookingDate DATE NOT NULL,
    bookingTime TIME NOT NULL,
    bookingStatus TINYINT DEFAULT 0 COMMENT '0=pending, 1=approved, 2=cancelled',
    notes TEXT,
    bookingMedia TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Service booking types
CREATE TABLE IF NOT EXISTS service_booking_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    service_type_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (service_type_id) REFERENCES service_type(service_type_id)
);

-- Service booking packages
CREATE TABLE IF NOT EXISTS service_booking_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    package_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(package_id)
);

-- Service booking sub packages
CREATE TABLE IF NOT EXISTS service_booking_sub_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    sub_package_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (sub_package_id) REFERENCES package_items(item_id)
);

-- Service preferences
CREATE TABLE IF NOT EXISTS service_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    preference_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES service_booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (preference_id) REFERENCES booking_preferences(preference_id)
);

-- Cart system
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
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (service_type_id) REFERENCES service_type(service_type_id),
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id)
);

-- Cart packages
CREATE TABLE IF NOT EXISTS cart_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    package_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES service_cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(package_id)
);

-- Cart package items
CREATE TABLE IF NOT EXISTS cart_package_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    sub_package_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    package_id INT NOT NULL,
    item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES service_cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (sub_package_id) REFERENCES package_items(item_id),
    FOREIGN KEY (package_id) REFERENCES packages(package_id),
    FOREIGN KEY (item_id) REFERENCES package_items(item_id)
);

-- Cart preferences
CREATE TABLE IF NOT EXISTS cart_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    preference_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES service_cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (preference_id) REFERENCES booking_preferences(preference_id)
);

-- Supply kits
CREATE TABLE IF NOT EXISTS supply_kits (
    kit_id INT AUTO_INCREMENT PRIMARY KEY,
    kit_name VARCHAR(200) NOT NULL,
    kit_description TEXT,
    kit_price DECIMAL(10,2) NOT NULL,
    kit_image TEXT,
    service_categories_id INT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_categories_id) REFERENCES service_categories(service_categories_id)
);

-- Supply kit items
CREATE TABLE IF NOT EXISTS supply_kit_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    kit_id INT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kit_id) REFERENCES supply_kits(kit_id) ON DELETE CASCADE
);

-- Vendor supply kit orders
CREATE TABLE IF NOT EXISTS vendor_supply_kits (
    vendor_kit_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    kit_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    FOREIGN KEY (kit_id) REFERENCES supply_kits(kit_id)
);

-- Inventory management
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    current_stock INT DEFAULT 0,
    reserved_stock INT DEFAULT 0,
    available_stock INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES supply_kit_items(item_id) ON DELETE CASCADE
);

-- Inventory movements
CREATE TABLE IF NOT EXISTS inventory_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'reserved', 'released') NOT NULL,
    quantity INT NOT NULL,
    reference_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES supply_kit_items(item_id) ON DELETE CASCADE
);

-- Contractors
CREATE TABLE IF NOT EXISTS contractors (
    contractor_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    business_license TEXT,
    insurance_certificate TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    is_verified TINYINT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractor services
CREATE TABLE IF NOT EXISTS contractor_services (
    contractor_service_id INT AUTO_INCREMENT PRIMARY KEY,
    contractor_id INT NOT NULL,
    service_id INT NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    is_available TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);

-- Contractor bookings
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

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    employee_type ENUM('full_time', 'part_time', 'contract') NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    salary DECIMAL(10,2),
    hire_date DATE NOT NULL,
    manager_id INT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);

-- Employee tasks
CREATE TABLE IF NOT EXISTS employee_tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    task_description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    due_date DATE,
    assigned_by INT,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES employees(employee_id)
);

-- Employee performance
CREATE TABLE IF NOT EXISTS employee_performance (
    performance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    review_period VARCHAR(50) NOT NULL,
    rating DECIMAL(3,2) CHECK (rating >= 1.00 AND rating <= 5.00),
    feedback TEXT,
    goals TEXT,
    reviewer_id INT,
    review_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES employees(employee_id)
);

-- Vendor payments
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

-- Contractor payouts
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

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('vendor_payment', 'contractor_payout', 'supply_kit_payment') NOT NULL,
    reference_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gateway_response TEXT
);

-- Ratings and reviews
CREATE TABLE IF NOT EXISTS ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    vendor_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
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
    user_type ENUM('users', 'vendors', 'admin') NOT NULL,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSON,
    is_read TINYINT DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL
);

-- Insert default admin user
INSERT IGNORE INTO admin (email, name, password, role) 
VALUES ('admin@homiqly.com', 'Admin User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert default service categories
INSERT IGNORE INTO service_categories (serviceCategory) VALUES 
('Personal Care'),
('Support Care'),
('Home Maintenance'),
('Beauty Services'),
('Health & Wellness'),
('Cleaning Services'),
('Repair Services'),
('Installation Services');

-- Insert default services
INSERT IGNORE INTO services (service_categories_id, serviceName, serviceDescription, slug) VALUES 
(1, 'Makeup Services', 'Professional makeup for all occasions', 'makeup-services'),
(1, 'Hair Styling', 'Professional hair styling and treatments', 'hair-styling'),
(1, 'Nail Services', 'Manicure, pedicure and nail art', 'nail-services'),
(2, 'Senior Care', 'Elderly care and assistance services', 'senior-care'),
(2, 'Babysitting', 'Professional childcare services', 'babysitting'),
(3, 'Plumbing', 'Plumbing repair and installation', 'plumbing'),
(3, 'House Cleaning', 'Professional house cleaning services', 'house-cleaning'),
(3, 'Electrical Work', 'Electrical repair and installation', 'electrical-work');

-- Insert default cities
INSERT IGNORE INTO service_city (serviceCityName) VALUES 
('Mumbai'),
('Delhi'),
('Bangalore'),
('Chennai'),
('Kolkata'),
('Hyderabad'),
('Pune'),
('Ahmedabad');