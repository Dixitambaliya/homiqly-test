-- Homiqly Database Corrected Data
-- This file contains realistic test data that works with existing database structure

-- First, check if service categories exist, if not insert them
INSERT IGNORE INTO service_categories (serviceCategory) VALUES
('Personal Care'),
('Support Care'),
('Home Maintenance'),
('Beauty Services'),
('Health & Wellness'),
('Cleaning Services'),
('Repair Services'),
('Installation Services'),
('Pet Care'),
('Tutoring & Education');

-- Insert Services (with proper foreign key references)
INSERT INTO services (service_categories_id, serviceName, serviceDescription, serviceImage, slug) VALUES
-- Personal Care
(1, 'Makeup Services', 'Professional makeup for weddings, parties, and special occasions', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'makeup-services'),
(1, 'Hair Styling', 'Professional hair styling, cutting, and treatments', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg', 'hair-styling'),
(1, 'Nail Services', 'Manicure, pedicure, and nail art services', 'https://images.pexels.com/photos/3997379/pexels-photo-3997379.jpeg', 'nail-services'),
(1, 'Spa Services', 'Relaxing spa treatments and massages', 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg', 'spa-services'),

-- Support Care
(2, 'Senior Care', 'Elderly care and assistance services', 'https://images.pexels.com/photos/7551667/pexels-photo-7551667.jpeg', 'senior-care'),
(2, 'Babysitting', 'Professional childcare services', 'https://images.pexels.com/photos/8613089/pexels-photo-8613089.jpeg', 'babysitting'),
(2, 'Nursing Care', 'Professional nursing and medical assistance', 'https://images.pexels.com/photos/7551608/pexels-photo-7551608.jpeg', 'nursing-care'),

-- Home Maintenance
(3, 'Plumbing', 'Plumbing repair and installation services', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'plumbing'),
(3, 'House Cleaning', 'Professional house cleaning services', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 'house-cleaning'),
(3, 'Electrical Work', 'Electrical repair and installation', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 'electrical-work'),
(3, 'Painting', 'Interior and exterior painting services', 'https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg', 'painting');

-- Insert Users if needed
INSERT IGNORE INTO users (firstName, lastName, email, phone, password, profileImage, address, state, postalcode, is_approved) VALUES
('Rajesh', 'Kumar', 'rajesh.kumar@email.com', '+91-9876543210', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', '123 MG Road, Bangalore', 'Karnataka', '560001', 1),
('Priya', 'Sharma', 'priya.sharma@email.com', '+91-9876543211', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', '456 Linking Road, Mumbai', 'Maharashtra', '400050', 1),
('Amit', 'Patel', 'amit.patel@email.com', '+91-9876543212', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', '789 CP, New Delhi', 'Delhi', '110001', 1);

-- Insert Vendors
INSERT IGNORE INTO vendors (vendorType, password, is_authenticated) VALUES
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- Insert Individual Vendor Details
INSERT IGNORE INTO individual_details (vendor_id, name, phone, email, profileImage, resume, otherInfo) VALUES
(1, 'Maya Sharma', '+91-9876543220', 'maya.sharma@vendor.com', 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg', 'https://example.com/resume1.pdf', 'Certified makeup artist with 5 years experience'),
(2, 'Ravi Kumar', '+91-9876543221', 'ravi.kumar@vendor.com', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg', 'https://example.com/resume2.pdf', 'Professional plumber with 8 years experience');

-- Insert Company Vendor Details
INSERT IGNORE INTO company_details (vendor_id, companyName, contactPerson, companyEmail, googleBusinessProfileLink, companyPhone, companyAddress, profileImage) VALUES
(3, 'BeautyPro Services', 'Anjali Verma', 'contact@beautypro.com', 'https://business.google.com/beautypro', '+91-9876543222', '123 Beauty Street, Mumbai, Maharashtra 400001', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg');

-- Insert Individual Service Categories
INSERT IGNORE INTO individual_service_categories (vendor_id, service_categories_id) VALUES
(1, 1), -- Maya: Personal Care
(2, 3); -- Ravi: Home Maintenance

-- Insert Company Service Categories
INSERT IGNORE INTO company_service_categories (vendor_id, service_categories_id) VALUES
(3, 1); -- BeautyPro: Personal Care

-- Insert Individual Services
INSERT IGNORE INTO individual_services (vendor_id, service_id, serviceLocation, serviceDescription) VALUES
(1, 1, 'Mumbai, Pune', 'Bridal makeup, party makeup, professional photoshoot makeup'),
(2, 8, 'Bangalore, Mysore', 'Residential and commercial plumbing services');

-- Insert Company Services
INSERT IGNORE INTO company_services (vendor_id, service_id, serviceLocation, serviceDescription) VALUES
(3, 1, 'Mumbai, Thane, Navi Mumbai', 'Complete beauty services for weddings and events');

-- Insert Service Types
INSERT IGNORE INTO service_type (service_id, vendor_id, serviceTypeName, serviceTypeMedia, is_approved) VALUES
(1, 1, 'Bridal Makeup Package', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 1),
(1, 3, 'Wedding Makeup Services', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 1),
(8, 2, 'Residential Plumbing', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 1);

-- Insert Packages
INSERT IGNORE INTO packages (service_type_id, vendor_id, packageName, description, totalPrice, totalTime, packageMedia) VALUES
-- Bridal Makeup Package
(1, 1, 'Basic Bridal Package', 'Basic bridal makeup with base and eyes', 5000.00, '3 hours', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'),
(1, 1, 'Premium Bridal Package', 'Complete bridal makeup with hair styling', 8000.00, '4 hours', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg'),
-- Wedding Makeup Services (Company)
(2, 3, 'Wedding Party Package', 'Makeup for bride and 2 family members', 15000.00, '5 hours', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg'),
-- Plumbing Services
(3, 2, 'Basic Plumbing Repair', 'Minor repairs and maintenance', 1500.00, '2 hours', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg');

-- Insert Package Items with unique IDs
INSERT IGNORE INTO package_items (package_id, vendor_id, itemName, itemMedia, description, price, timeRequired) VALUES
-- Basic Bridal Package items
(1, 1, 'Base Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Foundation, concealer, powder', 2000.00, '1 hour'),
(1, 1, 'Eye Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Eyeshadow, eyeliner, mascara', 2000.00, '1 hour'),
(1, 1, 'Lip Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Lip color and gloss', 1000.00, '30 minutes'),
-- Premium Bridal Package items
(2, 1, 'Complete Makeup', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 'Full face makeup', 5000.00, '2 hours'),
(2, 1, 'Hair Styling', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg', 'Bridal hair styling', 3000.00, '2 hours'),
-- Plumbing package items
(4, 2, 'Pipe Repair', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'Fix leaking pipes', 800.00, '1 hour'),
(4, 2, 'Faucet Installation', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'Install new faucets', 700.00, '1 hour');

-- Insert Booking Preferences
INSERT IGNORE INTO booking_preferences (package_id, preferenceValue) VALUES
(1, 'Morning (9 AM - 12 PM)'),
(1, 'Afternoon (12 PM - 5 PM)'),
(1, 'Evening (5 PM - 8 PM)'),
(2, 'Early Morning (7 AM - 10 AM)'),
(2, 'Late Morning (10 AM - 1 PM)'),
(3, 'Flexible Timing'),
(4, 'Emergency Service');

-- Insert Service Bookings (with varied dates for calendar testing)
INSERT IGNORE INTO service_booking (service_categories_id, service_id, vendor_id, user_id, bookingDate, bookingTime, bookingStatus, notes) VALUES
-- Recent bookings
(1, 1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 10 DAY), '10:00:00', 1, 'Bridal makeup for wedding ceremony'),
(1, 1, 3, 2, DATE_SUB(CURDATE(), INTERVAL 8 DAY), '14:00:00', 1, 'Party makeup for anniversary'),
(3, 8, 2, 3, DATE_SUB(CURDATE(), INTERVAL 7 DAY), '09:00:00', 1, 'Kitchen sink repair'),

-- Today's bookings
(1, 1, 1, 1, CURDATE(), '09:00:00', 0, 'Makeup for event'),
(3, 8, 2, 2, CURDATE(), '14:00:00', 0, 'Bathroom plumbing repair'),

-- Tomorrow's bookings
(1, 1, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '13:00:00', 0, 'Engagement makeup'),
(3, 8, 2, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:00:00', 0, 'Water heater repair'),

-- Next week bookings
(1, 1, 3, 3, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '11:00:00', 0, 'Wedding makeup trial'),

-- Cancelled bookings
(3, 8, 2, 1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '13:00:00', 2, 'Plumbing repair - cancelled by customer');

-- Insert Service Booking Types
INSERT IGNORE INTO service_booking_types (booking_id, service_type_id) VALUES
(1, 1), (2, 2), (3, 3), (4, 1), (5, 3), (6, 1), (7, 3), (8, 2), (9, 3);

-- Insert Service Booking Packages
INSERT IGNORE INTO service_booking_packages (booking_id, package_id) VALUES
(1, 1), (2, 3), (3, 4), (4, 1), (5, 4), (6, 2), (7, 4), (8, 3);

-- Insert Service Booking Sub Packages
INSERT IGNORE INTO service_booking_sub_packages (booking_id, sub_package_id, price) VALUES
(1, 1, 2000.00), (1, 2, 2000.00), (1, 3, 1000.00),
(3, 6, 800.00), (3, 7, 700.00),
(4, 1, 2000.00), (4, 2, 2000.00), (4, 3, 1000.00),
(5, 6, 800.00), (5, 7, 700.00);

-- Insert Service Preferences
INSERT IGNORE INTO service_preferences (booking_id, preference_id) VALUES
(1, 1), (2, 3), (3, 7), (4, 2), (5, 7), (6, 4), (7, 7), (8, 6);

-- Insert Supply Kits
INSERT IGNORE INTO supply_kits (kit_name, kit_description, kit_price, kit_image, service_categories_id, is_active) VALUES
('Beauty Essentials Kit', 'Complete makeup and beauty tools kit', 2500.00, 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 1, 1),
('Plumbing Tools Kit', 'Professional plumbing tools and supplies', 5000.00, 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 3, 1);

-- Insert Supply Kit Items with unique barcodes
INSERT IGNORE INTO supply_kit_items (kit_id, item_name, item_description, quantity, unit_price, barcode) VALUES
-- Beauty Essentials Kit (using timestamp to ensure uniqueness)
(1, 'Foundation Set', 'Professional foundation in multiple shades', 5, 300.00, CONCAT('HMQ1001_', UNIX_TIMESTAMP())),
(1, 'Makeup Brushes', 'Professional makeup brush set', 1, 800.00, CONCAT('HMQ1002_', UNIX_TIMESTAMP())),
-- Plumbing Tools Kit
(2, 'Pipe Wrench Set', 'Adjustable pipe wrenches', 3, 500.00, CONCAT('HMQ2001_', UNIX_TIMESTAMP())),
(2, 'Plumbing Tape', 'Teflon tape for pipe sealing', 10, 50.00, CONCAT('HMQ2002_', UNIX_TIMESTAMP()));

-- Insert Vendor Supply Kit Orders
INSERT IGNORE INTO vendor_supply_kits (vendor_id, kit_id, quantity_ordered, total_amount, order_status, order_date, delivery_date) VALUES
(1, 1, 2, 5000.00, 'delivered', DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(2, 2, 1, 5000.00, 'shipped', DATE_SUB(CURDATE(), INTERVAL 10 DAY), NULL);

-- Insert Ratings
INSERT IGNORE INTO ratings (booking_id, user_id, vendor_id, rating, review, created_at) VALUES
(1, 1, 1, 5, 'Excellent makeup service! Maya did an amazing job for my wedding.', DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(2, 2, 3, 4, 'Good service from BeautyPro. Professional and on time.', DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(3, 3, 2, 5, 'Ravi fixed our plumbing issue quickly and efficiently.', DATE_SUB(CURDATE(), INTERVAL 6 DAY));

-- Insert Notifications
INSERT IGNORE INTO notifications (user_type, user_id, title, body, data, is_read, sent_at) VALUES
('users', 1, 'Booking Confirmed', 'Your makeup service booking has been confirmed', '{"booking_id": 1}', 1, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
('users', 2, 'Service Completed', 'Your makeup service has been completed. Please rate your experience.', '{"booking_id": 2}', 0, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
('vendors', 1, 'New Booking Request', 'You have a new booking request for makeup', '{"booking_id": 4}', 0, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
('vendors', 2, 'New Booking Request', 'You have a new booking request for plumbing', '{"booking_id": 5}', 0, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Final message
SELECT 'Corrected data inserted successfully!' as Status;
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