-- Homiqly Database Setup Script
-- Run this script in your MySQL database to create the required tables

CREATE DATABASE IF NOT EXISTS homiqly_db;
USE homiqly_db;

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

-- Insert default admin user (password: admin123)
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