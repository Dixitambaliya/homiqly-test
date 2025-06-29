-- Homiqly Database Complete Setup
-- This script will clear all existing data and populate the database with test data
-- Focused on calendar functionality for admin and vendor panels

-- Use the database
USE homiqly_db;

-- Disable foreign key checks to allow truncating tables
SET FOREIGN_KEY_CHECKS = 0;

-- Clear all tables in reverse order of dependencies
TRUNCATE TABLE service_booking_sub_packages;
TRUNCATE TABLE service_booking_packages;
TRUNCATE TABLE service_booking_types;
TRUNCATE TABLE service_preferences;
TRUNCATE TABLE service_booking;
TRUNCATE TABLE cart_package_items;
TRUNCATE TABLE cart_preferences;
TRUNCATE TABLE cart_packages;
TRUNCATE TABLE service_cart;
TRUNCATE TABLE booking_preferences;
TRUNCATE TABLE package_items;
TRUNCATE TABLE packages;
TRUNCATE TABLE service_type;
TRUNCATE TABLE individual_services;
TRUNCATE TABLE company_services;
TRUNCATE TABLE individual_service_categories;
TRUNCATE TABLE company_service_categories;
TRUNCATE TABLE individual_details;
TRUNCATE TABLE company_details;
TRUNCATE TABLE vendors;
TRUNCATE TABLE inventory_movements;
TRUNCATE TABLE inventory;
TRUNCATE TABLE vendor_supply_kits;
TRUNCATE TABLE supply_kit_items;
TRUNCATE TABLE supply_kits;
TRUNCATE TABLE contractor_bookings;
TRUNCATE TABLE contractor_services;
TRUNCATE TABLE contractors;
TRUNCATE TABLE employee_performance;
TRUNCATE TABLE employee_tasks;
TRUNCATE TABLE employees;
TRUNCATE TABLE payment_transactions;
TRUNCATE TABLE contractor_payouts;
TRUNCATE TABLE vendor_payments;
TRUNCATE TABLE ratings;
TRUNCATE TABLE notifications;
TRUNCATE TABLE services;
TRUNCATE TABLE service_categories;
TRUNCATE TABLE users;
TRUNCATE TABLE admin;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Admin Users
INSERT INTO admin (email, name, password, role) VALUES
('admin@homiqly.com', 'Admin User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('manager@homiqly.com', 'Manager User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
('support@homiqly.com', 'Support User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'support');

-- Insert Service Categories
INSERT INTO service_categories (serviceCategory, created_by) VALUES
('Personal Care', 'admin'),
('Support Care', 'admin'),
('Home Maintenance', 'admin'),
('Beauty Services', 'admin'),
('Health & Wellness', 'admin'),
('Cleaning Services', 'admin'),
('Repair Services', 'admin'),
('Installation Services', 'admin'),
('Pet Care', 'admin'),
('Tutoring & Education', 'admin');

-- Insert Services
INSERT INTO services (service_categories_id, serviceName, serviceDescription, serviceImage, slug, created_by) VALUES
-- Personal Care
(1, 'Makeup Services', 'Professional makeup for weddings, parties, and special occasions', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'makeup-services', 'admin'),
(1, 'Hair Styling', 'Professional hair styling, cutting, and treatments', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg', 'hair-styling', 'admin'),
(1, 'Nail Services', 'Manicure, pedicure, and nail art services', 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg', 'nail-services', 'admin'),
(1, 'Spa Services', 'Relaxing spa treatments and massages', 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg', 'spa-services', 'admin'),

-- Support Care
(2, 'Senior Care', 'Elderly care and assistance services', 'https://images.pexels.com/photos/7551667/pexels-photo-7551667.jpeg', 'senior-care', 'admin'),
(2, 'Babysitting', 'Professional childcare services', 'https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg', 'babysitting', 'admin'),
(2, 'Nursing Care', 'Professional nursing and medical assistance', 'https://images.pexels.com/photos/7551608/pexels-photo-7551608.jpeg', 'nursing-care', 'admin'),

-- Home Maintenance
(3, 'Plumbing', 'Plumbing repair and installation services', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'plumbing', 'admin'),
(3, 'House Cleaning', 'Professional house cleaning services', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 'house-cleaning', 'admin'),
(3, 'Electrical Work', 'Electrical repair and installation', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 'electrical-work', 'admin'),
(3, 'Painting', 'Interior and exterior painting services', 'https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg', 'painting', 'admin'),

-- Beauty Services
(4, 'Facial Treatment', 'Professional facial and skincare treatments', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 'facial-treatment', 'admin'),
(4, 'Eyebrow Threading', 'Professional eyebrow shaping and threading', 'https://images.pexels.com/photos/3985329/pexels-photo-3985329.jpeg', 'eyebrow-threading', 'admin'),

-- Health & Wellness
(5, 'Physiotherapy', 'Physical therapy and rehabilitation services', 'https://images.pexels.com/photos/7551544/pexels-photo-7551544.jpeg', 'physiotherapy', 'admin'),
(5, 'Yoga Training', 'Personal yoga instruction and training', 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg', 'yoga-training', 'admin'),

-- Cleaning Services
(6, 'Deep Cleaning', 'Comprehensive deep cleaning services', 'https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg', 'deep-cleaning', 'admin'),
(6, 'Carpet Cleaning', 'Professional carpet and upholstery cleaning', 'https://images.pexels.com/photos/4239092/pexels-photo-4239092.jpeg', 'carpet-cleaning', 'admin');

-- Insert Service Cities
INSERT INTO service_city (serviceCityName) VALUES
('Mumbai'),
('Delhi'),
('Bangalore'),
('Chennai'),
('Kolkata'),
('Hyderabad'),
('Pune'),
('Ahmedabad'),
('Jaipur'),
('Lucknow');

-- Insert Users
INSERT INTO users (firstName, lastName, email, phone, password, profileImage, address, state, postalcode, is_approved) VALUES
('Rajesh', 'Kumar', 'rajesh.kumar@email.com', '+91-9876543210', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', '123 MG Road, Bangalore', 'Karnataka', '560001', 1),
('Priya', 'Sharma', 'priya.sharma@email.com', '+91-9876543211', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', '456 Linking Road, Mumbai', 'Maharashtra', '400050', 1),
('Amit', 'Patel', 'amit.patel@email.com', '+91-9876543212', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', '789 CP, New Delhi', 'Delhi', '110001', 1),
('Sneha', 'Reddy', 'sneha.reddy@email.com', '+91-9876543213', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg', '321 Banjara Hills, Hyderabad', 'Telangana', '500034', 1),
('Vikram', 'Singh', 'vikram.singh@email.com', '+91-9876543214', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg', '654 Park Street, Kolkata', 'West Bengal', '700016', 1);

-- Insert Vendors
INSERT INTO vendors (vendorType, password, is_authenticated, role) VALUES
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'vendor'),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'vendor'),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'vendor'),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'vendor');

-- Insert Individual Vendor Details
INSERT INTO individual_details (vendor_id, name, phone, email, profileImage, resume, otherInfo) VALUES
(1, 'Maya Sharma', '+91-9876543220', 'maya.sharma@vendor.com', 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg', 'https://example.com/resume1.pdf', 'Certified makeup artist with 5 years experience'),
(2, 'Ravi Kumar', '+91-9876543221', 'ravi.kumar@vendor.com', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg', 'https://example.com/resume2.pdf', 'Professional plumber with 8 years experience');

-- Insert Company Vendor Details
INSERT INTO company_details (vendor_id, companyName, contactPerson, companyEmail, googleBusinessProfileLink, companyPhone, companyAddress, profileImage) VALUES
(3, 'BeautyPro Services', 'Anjali Verma', 'contact@beautypro.com', 'https://business.google.com/beautypro', '+91-9876543222', '123 Beauty Street, Mumbai, Maharashtra 400001', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg'),
(4, 'HomeFix Solutions', 'Suresh Agarwal', 'info@homefix.com', 'https://business.google.com/homefix', '+91-9876543224', '456 Repair Avenue, Bangalore, Karnataka 560001', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg');

-- Insert Individual Service Categories
INSERT INTO individual_service_categories (vendor_id, service_categories_id) VALUES
(1, 1), -- Maya: Personal Care
(1, 4), -- Maya: Beauty Services
(2, 3), -- Ravi: Home Maintenance
(2, 7); -- Ravi: Repair Services

-- Insert Company Service Categories
INSERT INTO company_service_categories (vendor_id, service_categories_id) VALUES
(3, 1), -- BeautyPro: Personal Care
(3, 4), -- BeautyPro: Beauty Services
(4, 3), -- HomeFix: Home Maintenance
(4, 7); -- HomeFix: Repair Services

-- Insert Individual Services
INSERT INTO individual_services (vendor_id, service_id, serviceLocation, serviceDescription) VALUES
(1, 1, 'Mumbai, Pune', 'Bridal makeup, party makeup, professional photoshoot makeup'),
(1, 2, 'Mumbai, Pune', 'Hair styling for special occasions and everyday looks'),
(2, 8, 'Bangalore, Mysore', 'Residential and commercial plumbing services'),
(2, 10, 'Bangalore, Mysore', 'Electrical installations, repairs, and maintenance');

-- Insert Company Services
INSERT INTO company_services (vendor_id, service_id, serviceLocation, serviceDescription) VALUES
(3, 1, 'Mumbai, Thane, Navi Mumbai', 'Complete beauty services for weddings and events'),
(3, 12, 'Mumbai, Thane, Navi Mumbai', 'Professional facial and skincare treatments'),
(4, 8, 'Bangalore, Mysore, Mangalore', 'Complete home maintenance and repair solutions'),
(4, 10, 'Bangalore, Mysore, Mangalore', 'Electrical work and installations');

-- Insert Service Types
INSERT INTO service_type (service_id, vendor_id, serviceTypeName, serviceTypeMedia, is_approved) VALUES
(1, 1, 'Bridal Makeup Package', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 1),
(1, 3, 'Wedding Makeup Services', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 1),
(2, 1, 'Hair Styling & Treatment', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg', 1),
(8, 2, 'Residential Plumbing', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 1),
(8, 4, 'Commercial Plumbing Solutions', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 1),
(10, 2, 'Electrical Repair & Installation', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 1),
(10, 4, 'Commercial Electrical Services', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 1),
(12, 3, 'Facial & Skincare Treatment', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 1);

-- Insert Packages
INSERT INTO packages (service_type_id, vendor_id, packageName, description, totalPrice, totalTime, packageMedia) VALUES
-- Bridal Makeup Package
(1, 1, 'Basic Bridal Package', 'Basic bridal makeup with base and eyes', 5000.00, '3 hours', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'),
(1, 1, 'Premium Bridal Package', 'Complete bridal makeup with hair styling', 8000.00, '4 hours', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'),
(1, 1, 'Luxury Bridal Package', 'Full bridal makeover with trial session', 12000.00, '6 hours', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'),

-- Wedding Makeup Services (Company)
(2, 3, 'Wedding Party Package', 'Makeup for bride and 2 family members', 15000.00, '5 hours', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg'),
(2, 3, 'Complete Wedding Package', 'Full wedding party makeup and hair', 25000.00, '8 hours', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg'),

-- Hair Styling
(3, 1, 'Basic Hair Styling', 'Simple hair styling for events', 2000.00, '2 hours', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg'),
(3, 1, 'Advanced Hair Styling', 'Complex styling with accessories', 3500.00, '3 hours', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg'),

-- Plumbing Services
(4, 2, 'Basic Plumbing Repair', 'Minor repairs and maintenance', 1500.00, '2 hours', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg'),
(4, 2, 'Complete Plumbing Service', 'Major repairs and installations', 5000.00, '1 day', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg'),

-- Electrical Services
(6, 2, 'Basic Electrical Repair', 'Minor electrical repairs', 1200.00, '2 hours', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg'),
(6, 2, 'Electrical Installation', 'New electrical installations', 3000.00, '4 hours', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg');

-- Insert Package Items
INSERT INTO package_items (package_id, vendor_id, itemName, itemMedia, description, price, timeRequired) VALUES
-- Basic Bridal Package items
(1, 1, 'Base Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Foundation, concealer, powder', 2000.00, '1 hour'),
(1, 1, 'Eye Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Eyeshadow, eyeliner, mascara', 2000.00, '1 hour'),
(1, 1, 'Lip Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Lip color and gloss', 1000.00, '30 minutes'),

-- Premium Bridal Package items
(2, 1, 'Complete Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Full face makeup', 5000.00, '2 hours'),
(2, 1, 'Hair Styling', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg', 'Bridal hair styling', 3000.00, '2 hours'),

-- Plumbing package items
(8, 2, 'Pipe Repair', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'Fix leaking pipes', 800.00, '1 hour'),
(8, 2, 'Faucet Installation', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'Install new faucets', 700.00, '1 hour'),

-- Electrical package items
(10, 2, 'Switch Repair', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 'Fix electrical switches', 500.00, '1 hour'),
(10, 2, 'Outlet Installation', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 'Install new outlets', 700.00, '1 hour');

-- Insert Booking Preferences
INSERT INTO booking_preferences (package_id, preferenceValue) VALUES
(1, 'Morning (9 AM - 12 PM)'),
(1, 'Afternoon (12 PM - 5 PM)'),
(1, 'Evening (5 PM - 8 PM)'),
(2, 'Early Morning (7 AM - 10 AM)'),
(2, 'Late Morning (10 AM - 1 PM)'),
(3, 'Flexible Timing'),
(4, 'Weekend Preferred'),
(5, 'Weekday Only'),
(6, 'Morning Preferred'),
(7, 'Evening Preferred'),
(8, 'Emergency Service'),
(9, 'Regular Schedule');

-- Insert Service Bookings (with varied dates for calendar testing)
INSERT INTO service_booking (service_categories_id, service_id, vendor_id, user_id, bookingDate, bookingTime, bookingStatus, notes) VALUES
-- Past bookings
(1, 1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 10 DAY), '10:00:00', 1, 'Bridal makeup for wedding ceremony'),
(1, 1, 3, 2, DATE_SUB(CURDATE(), INTERVAL 8 DAY), '14:00:00', 1, 'Party makeup for anniversary'),
(3, 8, 2, 3, DATE_SUB(CURDATE(), INTERVAL 7 DAY), '09:00:00', 1, 'Kitchen sink repair'),
(3, 10, 2, 4, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '13:00:00', 2, 'Electrical repair - cancelled by customer'),
(3, 8, 4, 5, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '11:00:00', 1, 'Bathroom plumbing installation'),

-- Today's bookings
(1, 1, 1, 1, CURDATE(), '09:00:00', 0, 'Makeup for event'),
(1, 2, 1, 2, CURDATE(), '11:00:00', 1, 'Hair styling for party'),
(3, 8, 2, 3, CURDATE(), '14:00:00', 0, 'Bathroom plumbing repair'),
(3, 10, 4, 4, CURDATE(), '16:00:00', 1, 'Electrical panel upgrade'),

-- Tomorrow's bookings
(1, 1, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 0, 'Engagement makeup'),
(1, 1, 3, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '13:00:00', 0, 'Professional photoshoot makeup'),
(3, 8, 2, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:00:00', 0, 'Water heater repair'),
(3, 10, 4, 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '17:00:00', 0, 'Ceiling fan installation'),

-- This week bookings
(1, 1, 1, 5, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', 0, 'Wedding guest makeup'),
(3, 8, 2, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00:00', 0, 'Sink installation'),
(1, 2, 1, 2, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00:00', 0, 'Hair coloring and styling'),
(3, 10, 4, 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '16:00:00', 0, 'Electrical wiring check'),

-- Next week bookings
(1, 1, 3, 4, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '10:00:00', 0, 'Wedding makeup trial'),
(1, 2, 1, 5, DATE_ADD(CURDATE(), INTERVAL 8 DAY), '13:00:00', 0, 'Hair treatment and styling'),
(3, 8, 4, 1, DATE_ADD(CURDATE(), INTERVAL 9 DAY), '15:00:00', 0, 'Bathroom renovation plumbing'),
(3, 10, 2, 2, DATE_ADD(CURDATE(), INTERVAL 10 DAY), '17:00:00', 0, 'Home electrical safety inspection'),

-- Future bookings
(1, 1, 1, 3, DATE_ADD(CURDATE(), INTERVAL 14 DAY), '09:00:00', 0, 'Bridal makeup'),
(1, 1, 3, 4, DATE_ADD(CURDATE(), INTERVAL 21 DAY), '11:00:00', 0, 'Wedding party makeup'),
(3, 8, 2, 5, DATE_ADD(CURDATE(), INTERVAL 28 DAY), '14:00:00', 0, 'Complete plumbing overhaul'),
(3, 10, 4, 1, DATE_ADD(CURDATE(), INTERVAL 35 DAY), '16:00:00', 0, 'Home electrical upgrade');

-- Insert Service Booking Types
INSERT INTO service_booking_types (booking_id, service_type_id) VALUES
(1, 1), (2, 2), (3, 4), (4, 6), (5, 5),
(6, 1), (7, 3), (8, 4), (9, 7),
(10, 1), (11, 2), (12, 4), (13, 7),
(14, 1), (15, 4), (16, 3), (17, 7),
(18, 2), (19, 3), (20, 5), (21, 6),
(22, 1), (23, 2), (24, 4), (25, 7);

-- Insert Service Booking Packages
INSERT INTO service_booking_packages (booking_id, package_id) VALUES
(1, 1), (2, 4), (3, 8), (4, 10), (5, 9),
(6, 1), (7, 6), (8, 8), (9, 11),
(10, 2), (11, 4), (12, 9), (13, 11),
(14, 3), (15, 8), (16, 7), (17, 10),
(18, 5), (19, 6), (20, 9), (21, 10),
(22, 1), (23, 5), (24, 9), (25, 11);

-- Insert Service Booking Sub Packages
INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, price) VALUES
-- Booking 1: Basic Bridal Package
(1, 1, 2000.00), (1, 2, 2000.00), (1, 3, 1000.00),
-- Booking 3: Basic Plumbing Repair
(3, 6, 800.00), (3, 7, 700.00),
-- Booking 4: Basic Electrical Repair
(4, 8, 500.00), (4, 9, 700.00),
-- Booking 6: Basic Bridal Package
(6, 1, 2000.00), (6, 2, 2000.00), (6, 3, 1000.00),
-- Booking 8: Basic Plumbing Repair
(8, 6, 800.00), (8, 7, 700.00),
-- Booking 10: Premium Bridal Package
(10, 4, 5000.00), (10, 5, 3000.00),
-- Booking 12: Complete Plumbing Service
(12, 6, 800.00), (12, 7, 700.00);

-- Insert Service Preferences
INSERT INTO service_preferences (booking_id, preference_id) VALUES
(1, 1), (2, 7), (3, 11), (4, 9), (5, 12),
(6, 2), (7, 10), (8, 11), (9, 9),
(10, 4), (11, 7), (12, 11), (13, 9),
(14, 3), (15, 12), (16, 10), (17, 9),
(18, 7), (19, 10), (20, 11), (21, 9);

-- Insert Supply Kits
INSERT INTO supply_kits (kit_name, kit_description, kit_price, kit_image, service_categories_id, is_active) VALUES
('Beauty Essentials Kit', 'Complete makeup and beauty tools kit', 2500.00, 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 1, 1),
('Plumbing Tools Kit', 'Professional plumbing tools and supplies', 5000.00, 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 3, 1),
('Electrical Tools Kit', 'Basic electrical repair tools', 3200.00, 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 3, 1);

-- Insert Supply Kit Items with unique barcodes
INSERT INTO supply_kit_items (kit_id, item_name, item_description, quantity, unit_price, barcode) VALUES
-- Beauty Essentials Kit
(1, 'Foundation Set', 'Professional foundation in multiple shades', 5, 300.00, CONCAT('HMQ1001_', UNIX_TIMESTAMP())),
(1, 'Makeup Brushes', 'Professional makeup brush set', 1, 800.00, CONCAT('HMQ1002_', UNIX_TIMESTAMP())),
(1, 'Eyeshadow Palette', 'Professional eyeshadow palette', 2, 600.00, CONCAT('HMQ1003_', UNIX_TIMESTAMP())),
-- Plumbing Tools Kit
(2, 'Pipe Wrench Set', 'Adjustable pipe wrenches', 3, 500.00, CONCAT('HMQ2001_', UNIX_TIMESTAMP())),
(2, 'Plumbing Tape', 'Teflon tape for pipe sealing', 10, 50.00, CONCAT('HMQ2002_', UNIX_TIMESTAMP())),
(2, 'Pipe Cutter', 'Professional pipe cutting tool', 1, 1200.00, CONCAT('HMQ2003_', UNIX_TIMESTAMP())),
-- Electrical Tools Kit
(3, 'Screwdriver Set', 'Insulated screwdrivers for electrical work', 1, 800.00, CONCAT('HMQ3001_', UNIX_TIMESTAMP())),
(3, 'Voltage Tester', 'Non-contact voltage tester', 1, 400.00, CONCAT('HMQ3002_', UNIX_TIMESTAMP())),
(3, 'Wire Stripper', 'Professional wire stripping tool', 1, 350.00, CONCAT('HMQ3003_', UNIX_TIMESTAMP()));

-- Insert Vendor Supply Kit Orders
INSERT INTO vendor_supply_kits (vendor_id, kit_id, quantity_ordered, total_amount, order_status, order_date, delivery_date) VALUES
(1, 1, 2, 5000.00, 'delivered', DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(2, 2, 1, 5000.00, 'shipped', DATE_SUB(CURDATE(), INTERVAL 10 DAY), NULL),
(3, 1, 3, 7500.00, 'confirmed', DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL),
(4, 3, 1, 3200.00, 'pending', DATE_SUB(CURDATE(), INTERVAL 2 DAY), NULL);

-- Insert Ratings
INSERT INTO ratings (booking_id, user_id, vendor_id, rating, review, created_at) VALUES
(1, 1, 1, 5, 'Excellent makeup service! Maya did an amazing job for my wedding.', DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(2, 2, 3, 4, 'Good service from BeautyPro. Professional and on time.', DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(3, 3, 2, 5, 'Ravi fixed our plumbing issue quickly and efficiently.', DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(5, 5, 4, 4, 'Good plumbing service, but took a bit longer than expected.', DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(7, 2, 1, 5, 'Amazing hair styling! Exactly what I wanted.', CURDATE());

-- Insert Notifications
INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at) VALUES
('users', 1, 'Booking Confirmed', 'Your makeup service booking has been confirmed', '{"booking_id": 1}', 1, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
('users', 2, 'Service Completed', 'Your makeup service has been completed. Please rate your experience.', '{"booking_id": 2}', 0, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
('vendors', 1, 'New Booking Request', 'You have a new booking request for makeup', '{"booking_id": 6}', 0, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
('vendors', 2, 'New Booking Request', 'You have a new booking request for plumbing', '{"booking_id": 8}', 0, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
('admin', NULL, 'New Vendor Registration', 'A new vendor has registered and is pending approval', '{"vendor_id": 7}', 0, DATE_SUB(CURDATE(), INTERVAL 3 DAY));

-- Insert Vendor Payments
INSERT INTO vendor_payments (vendor_id, booking_id, amount, commission_rate, commission_amount, net_amount, payment_status, payment_date, payout_date) VALUES
(1, 1, 5000.00, 15.00, 750.00, 4250.00, 'completed', DATE_SUB(CURDATE(), INTERVAL 9 DAY), DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(3, 2, 15000.00, 15.00, 2250.00, 12750.00, 'completed', DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(2, 3, 1500.00, 10.00, 150.00, 1350.00, 'pending', DATE_SUB(CURDATE(), INTERVAL 6 DAY), NULL),
(4, 5, 5000.00, 12.00, 600.00, 4400.00, 'pending', DATE_SUB(CURDATE(), INTERVAL 2 DAY), NULL);

-- Final message
SELECT 'Database setup completed successfully!' as Status;
SELECT 
    'Admin Login: admin@homiqly.com / admin123' as AdminCredentials,
    'Vendor Login: maya.sharma@vendor.com / password123' as VendorCredentials,
    'User Login: rajesh.kumar@email.com / password123' as UserCredentials;

-- Show statistics
SELECT 
    (SELECT COUNT(*) FROM users) as TotalUsers,
    (SELECT COUNT(*) FROM vendors) as TotalVendors,
    (SELECT COUNT(*) FROM service_booking) as TotalBookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingStatus = 0) as PendingBookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingStatus = 1) as ApprovedBookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingDate >= CURDATE()) as UpcomingBookings;