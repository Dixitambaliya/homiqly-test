-- Homiqly Database Fake Data (Corrected Version)
-- This file contains realistic test data for all tables in the Homiqly system
-- Run this after setting up the main database schema

USE homiqly_db;

-- Clear existing data (optional - uncomment if you want to start fresh)
SET FOREIGN_KEY_CHECKS = 0;
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
TRUNCATE TABLE services;
TRUNCATE TABLE service_categories;
TRUNCATE TABLE users;
TRUNCATE TABLE admin;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Admin Users (corrected - removed phone column)
INSERT INTO admin (email, name, password, role) VALUES
('admin@homiqly.com', 'Admin User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('manager@homiqly.com', 'Manager User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
('support@homiqly.com', 'Support User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'support');

-- Insert Service Categories
INSERT INTO service_categories (serviceCategory) VALUES
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

-- Insert Services
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
(3, 'Painting', 'Interior and exterior painting services', 'https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg', 'painting'),

-- Beauty Services
(4, 'Facial Treatment', 'Professional facial and skincare treatments', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 'facial-treatment'),
(4, 'Eyebrow Threading', 'Professional eyebrow shaping and threading', 'https://images.pexels.com/photos/3985329/pexels-photo-3985329.jpeg', 'eyebrow-threading'),

-- Health & Wellness
(5, 'Physiotherapy', 'Physical therapy and rehabilitation services', 'https://images.pexels.com/photos/7551544/pexels-photo-7551544.jpeg', 'physiotherapy'),
(5, 'Yoga Training', 'Personal yoga instruction and training', 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg', 'yoga-training'),

-- Cleaning Services
(6, 'Deep Cleaning', 'Comprehensive deep cleaning services', 'https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg', 'deep-cleaning'),
(6, 'Carpet Cleaning', 'Professional carpet and upholstery cleaning', 'https://images.pexels.com/photos/4239092/pexels-photo-4239092.jpeg', 'carpet-cleaning'),

-- Repair Services
(7, 'AC Repair', 'Air conditioning repair and maintenance', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 'ac-repair'),
(7, 'Appliance Repair', 'Home appliance repair services', 'https://images.pexels.com/photos/4239093/pexels-photo-4239093.jpeg', 'appliance-repair'),

-- Installation Services
(8, 'TV Installation', 'Professional TV mounting and setup', 'https://images.pexels.com/photos/1444416/pexels-photo-1444416.jpeg', 'tv-installation'),
(8, 'Furniture Assembly', 'Furniture assembly and installation', 'https://images.pexels.com/photos/6585751/pexels-photo-6585751.jpeg', 'furniture-assembly');

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
('Lucknow'),
('Kanpur'),
('Nagpur'),
('Indore'),
('Thane'),
('Bhopal'),
('Visakhapatnam'),
('Pimpri-Chinchwad'),
('Patna'),
('Vadodara'),
('Ghaziabad');

-- Insert Users
INSERT INTO users (firstName, lastName, email, phone, password, profileImage, address, state, postalcode, is_approved) VALUES
('Rajesh', 'Kumar', 'rajesh.kumar@email.com', '+91-9876543210', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg', '123 MG Road, Bangalore', 'Karnataka', '560001', 1),
('Priya', 'Sharma', 'priya.sharma@email.com', '+91-9876543211', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', '456 Linking Road, Mumbai', 'Maharashtra', '400050', 1),
('Amit', 'Patel', 'amit.patel@email.com', '+91-9876543212', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg', '789 CP, New Delhi', 'Delhi', '110001', 1),
('Sneha', 'Reddy', 'sneha.reddy@email.com', '+91-9876543213', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg', '321 Banjara Hills, Hyderabad', 'Telangana', '500034', 1),
('Vikram', 'Singh', 'vikram.singh@email.com', '+91-9876543214', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg', '654 Park Street, Kolkata', 'West Bengal', '700016', 1),
('Anita', 'Gupta', 'anita.gupta@email.com', '+91-9876543215', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg', '987 Anna Nagar, Chennai', 'Tamil Nadu', '600040', 1),
('Rohit', 'Joshi', 'rohit.joshi@email.com', '+91-9876543216', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg', '147 FC Road, Pune', 'Maharashtra', '411005', 1),
('Kavya', 'Nair', 'kavya.nair@email.com', '+91-9876543217', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg', '258 MG Road, Kochi', 'Kerala', '682016', 1),
('Arjun', 'Mehta', 'arjun.mehta@email.com', '+91-9876543218', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg', '369 CG Road, Ahmedabad', 'Gujarat', '380009', 1),
('Deepika', 'Agarwal', 'deepika.agarwal@email.com', '+91-9876543219', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', '741 MI Road, Jaipur', 'Rajasthan', '302001', 1);

-- Insert Vendors
INSERT INTO vendors (vendorType, password, is_authenticated) VALUES
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 0),
('individual', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('company', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- Insert Individual Vendor Details
INSERT INTO individual_details (vendor_id, name, phone, email, profileImage, resume, otherInfo) VALUES
(1, 'Maya Sharma', '+91-9876543220', 'maya.sharma@vendor.com', 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg', 'https://example.com/resume1.pdf', 'Certified makeup artist with 5 years experience'),
(2, 'Ravi Kumar', '+91-9876543221', 'ravi.kumar@vendor.com', 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg', 'https://example.com/resume2.pdf', 'Professional plumber with 8 years experience'),
(4, 'Sunita Devi', '+91-9876543223', 'sunita.devi@vendor.com', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg', 'https://example.com/resume4.pdf', 'Experienced house cleaner and organizer'),
(6, 'Kiran Patel', '+91-9876543225', 'kiran.patel@vendor.com', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', 'https://example.com/resume6.pdf', 'Licensed electrician with safety certifications'),
(7, 'Neha Gupta', '+91-9876543226', 'neha.gupta@vendor.com', 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', 'https://example.com/resume7.pdf', 'Beauty specialist and skincare expert'),
(9, 'Rajesh Yadav', '+91-9876543228', 'rajesh.yadav@vendor.com', 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg', 'https://example.com/resume9.pdf', 'Certified physiotherapist and wellness coach');

-- Insert Company Vendor Details
INSERT INTO company_details (vendor_id, companyName, contactPerson, companyEmail, googleBusinessProfileLink, companyPhone, companyAddress, profileImage) VALUES
(3, 'BeautyPro Services', 'Anjali Verma', 'contact@beautypro.com', 'https://business.google.com/beautypro', '+91-9876543222', '123 Beauty Street, Mumbai, Maharashtra 400001', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg'),
(5, 'HomeFix Solutions', 'Suresh Agarwal', 'info@homefix.com', 'https://business.google.com/homefix', '+91-9876543224', '456 Repair Avenue, Bangalore, Karnataka 560001', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg'),
(8, 'CleanMaster Pro', 'Meera Jain', 'hello@cleanmaster.com', 'https://business.google.com/cleanmaster', '+91-9876543227', '789 Clean Lane, Delhi, Delhi 110001', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg'),
(10, 'WellCare Services', 'Dr. Ashok Kumar', 'care@wellcare.com', 'https://business.google.com/wellcare', '+91-9876543229', '321 Health Street, Chennai, Tamil Nadu 600001', 'https://images.pexels.com/photos/7551667/pexels-photo-7551667.jpeg');

-- Insert Individual Service Categories
INSERT INTO individual_service_categories (vendor_id, service_categories_id) VALUES
(1, 1), (1, 4), -- Maya: Personal Care, Beauty Services
(2, 3), (2, 7), -- Ravi: Home Maintenance, Repair Services
(4, 6), -- Sunita: Cleaning Services
(6, 3), (6, 7), -- Kiran: Home Maintenance, Repair Services
(7, 1), (7, 4), -- Neha: Personal Care, Beauty Services
(9, 5); -- Rajesh: Health & Wellness

-- Insert Company Service Categories
INSERT INTO company_service_categories (vendor_id, service_categories_id) VALUES
(3, 1), (3, 4), -- BeautyPro: Personal Care, Beauty Services
(5, 3), (5, 7), (5, 8), -- HomeFix: Home Maintenance, Repair, Installation
(8, 6), -- CleanMaster: Cleaning Services
(10, 2), (10, 5); -- WellCare: Support Care, Health & Wellness

-- Insert Individual Services
INSERT INTO individual_services (vendor_id, service_id, serviceLocation, serviceDescription) VALUES
(1, 1, 'Mumbai, Pune', 'Bridal makeup, party makeup, professional photoshoot makeup'),
(1, 2, 'Mumbai, Pune', 'Hair styling for special occasions and everyday looks'),
(2, 8, 'Bangalore, Mysore', 'Residential and commercial plumbing services'),
(4, 9, 'Delhi, Gurgaon', 'Regular house cleaning, deep cleaning, move-in/out cleaning'),
(6, 10, 'Ahmedabad, Vadodara', 'Electrical installations, repairs, and maintenance'),
(7, 12, 'Jaipur, Udaipur', 'Facial treatments, skincare consultations'),
(9, 15, 'Chennai, Coimbatore', 'Physical therapy, sports injury rehabilitation');

-- Insert Company Services
INSERT INTO company_services (vendor_id, service_id, serviceLocation, serviceDescription) VALUES
(3, 1, 'Mumbai, Thane, Navi Mumbai', 'Complete beauty services for weddings and events'),
(3, 12, 'Mumbai, Thane, Navi Mumbai', 'Professional facial and skincare treatments'),
(5, 8, 'Bangalore, Mysore, Mangalore', 'Complete home maintenance and repair solutions'),
(5, 10, 'Bangalore, Mysore, Mangalore', 'Electrical work and installations'),
(8, 9, 'Delhi, Noida, Gurgaon', 'Professional cleaning services for homes and offices'),
(8, 17, 'Delhi, Noida, Gurgaon', 'Deep cleaning and specialized cleaning services'),
(10, 5, 'Chennai, Madurai, Coimbatore', 'Senior care and nursing services'),
(10, 15, 'Chennai, Madurai, Coimbatore', 'Physiotherapy and wellness services');

-- Insert Service Types
INSERT INTO service_type (service_id, vendor_id, serviceTypeName, serviceTypeMedia, is_approved) VALUES
(1, 1, 'Bridal Makeup Package', 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 1),
(1, 3, 'Wedding Makeup Services', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 1),
(2, 1, 'Hair Styling & Treatment', 'https://images.pexels.com/photos/3993456/pexels-photo-3993456.jpeg', 1),
(8, 2, 'Residential Plumbing', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 1),
(8, 5, 'Commercial Plumbing Solutions', 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 1),
(9, 4, 'House Cleaning Service', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 1),
(9, 8, 'Professional Cleaning', 'https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg', 1),
(10, 6, 'Electrical Repair & Installation', 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 1),
(12, 7, 'Facial & Skincare Treatment', 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 1),
(15, 9, 'Physiotherapy Sessions', 'https://images.pexels.com/photos/7551544/pexels-photo-7551544.jpeg', 1),
(5, 10, 'Senior Care Services', 'https://images.pexels.com/photos/7551667/pexels-photo-7551667.jpeg', 0);

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

-- House Cleaning
(6, 4, 'Regular Cleaning', 'Standard house cleaning service', 1200.00, '3 hours', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg'),
(6, 4, 'Deep Cleaning', 'Comprehensive deep cleaning', 2500.00, '6 hours', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg'),

-- Professional Cleaning (Company)
(7, 8, 'Office Cleaning', 'Professional office cleaning', 3000.00, '4 hours', 'https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg'),
(7, 8, 'Commercial Deep Clean', 'Complete commercial space cleaning', 8000.00, '8 hours', 'https://images.pexels.com/photos/4239119/pexels-photo-4239119.jpeg');

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

-- Cleaning package items
(9, 4, 'Living Room Cleaning', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 'Clean living areas', 400.00, '1 hour'),
(9, 4, 'Kitchen Cleaning', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 'Deep clean kitchen', 500.00, '1.5 hours'),
(9, 4, 'Bathroom Cleaning', 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 'Sanitize bathrooms', 300.00, '30 minutes');

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
(9, 'Regular Schedule'),
(10, 'One-time Service');

-- Insert Service Bookings (with varied dates for calendar testing)
INSERT INTO service_booking (service_categories_id, service_id, vendor_id, user_id, bookingDate, bookingTime, bookingStatus, notes, bookingMedia) VALUES
-- Recent bookings (last 30 days)
(1, 1, 1, 1, '2024-12-20', '10:00:00', 1, 'Bridal makeup for wedding ceremony', NULL),
(1, 1, 3, 2, '2024-12-22', '14:00:00', 1, 'Party makeup for anniversary', NULL),
(3, 8, 2, 3, '2024-12-23', '09:00:00', 1, 'Kitchen sink repair', NULL),
(6, 9, 4, 4, '2024-12-24', '11:00:00', 0, 'Regular house cleaning', NULL),
(3, 10, 6, 5, '2024-12-25', '15:00:00', 0, 'Electrical outlet installation', NULL),

-- Today's bookings (adjust date as needed)
(1, 2, 1, 6, CURDATE(), '09:00:00', 0, 'Hair styling for event', NULL),
(4, 12, 7, 7, CURDATE(), '11:00:00', 1, 'Facial treatment', NULL),
(3, 8, 5, 8, CURDATE(), '14:00:00', 0, 'Bathroom plumbing repair', NULL),
(6, 9, 8, 9, CURDATE(), '16:00:00', 1, 'Office cleaning service', NULL),

-- Tomorrow's bookings
(5, 15, 9, 10, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 1, 'Physiotherapy session', NULL),
(1, 1, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '13:00:00', 0, 'Engagement makeup', NULL),
(3, 8, 2, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:00:00', 1, 'Water heater repair', NULL),

-- Next week bookings
(1, 1, 3, 3, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '11:00:00', 0, 'Wedding makeup trial', NULL),
(6, 9, 4, 4, DATE_ADD(CURDATE(), INTERVAL 8 DAY), '09:00:00', 1, 'Deep cleaning service', NULL),
(3, 10, 6, 5, DATE_ADD(CURDATE(), INTERVAL 9 DAY), '14:00:00', 0, 'Ceiling fan installation', NULL),

-- Future bookings (next month)
(1, 2, 1, 6, DATE_ADD(CURDATE(), INTERVAL 15 DAY), '10:00:00', 1, 'Hair styling for wedding', NULL),
(4, 12, 7, 7, DATE_ADD(CURDATE(), INTERVAL 20 DAY), '12:00:00', 0, 'Skincare consultation', NULL),
(5, 15, 9, 8, DATE_ADD(CURDATE(), INTERVAL 25 DAY), '16:00:00', 1, 'Sports injury therapy', NULL),

-- Cancelled bookings
(3, 8, 2, 9, '2024-12-21', '13:00:00', 2, 'Plumbing repair - cancelled by customer', NULL),
(6, 9, 8, 10, '2024-12-19', '10:00:00', 2, 'Cleaning service - vendor unavailable', NULL);

-- Insert Service Booking Types
INSERT INTO service_booking_types (booking_id, service_type_id) VALUES
(1, 1), (2, 2), (3, 4), (4, 6), (5, 8), (6, 3), (7, 9), (8, 5), (9, 7), (10, 10), (11, 1), (12, 4), (13, 2), (14, 6), (15, 8), (16, 3), (17, 9), (18, 10), (19, 4), (20, 7);

-- Insert Service Booking Packages
INSERT INTO service_booking_packages (booking_id, package_id) VALUES
(1, 1), (2, 4), (3, 8), (4, 9), (6, 6), (7, 1), (9, 11), (10, 1), (11, 8), (12, 2), (14, 9), (16, 6), (17, 1), (18, 1);

-- Insert Service Booking Sub Packages
INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, price) VALUES
(1, 1, 2000.00), (1, 2, 2000.00), (1, 3, 1000.00),
(3, 8, 800.00), (3, 9, 700.00),
(4, 10, 400.00), (4, 11, 500.00), (4, 12, 300.00),
(6, 6, 2000.00), (6, 7, 3500.00);

-- Insert Service Preferences
INSERT INTO service_preferences (booking_id, preference_id) VALUES
(1, 1), (2, 2), (3, 8), (4, 9), (5, 10), (6, 1), (7, 2), (8, 8), (9, 9), (10, 3);

-- Insert Supply Kits
INSERT INTO supply_kits (kit_name, kit_description, kit_price, kit_image, service_categories_id, is_active) VALUES
('Beauty Essentials Kit', 'Complete makeup and beauty tools kit', 2500.00, 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg', 1, 1),
('Plumbing Tools Kit', 'Professional plumbing tools and supplies', 5000.00, 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg', 3, 1),
('Cleaning Supplies Kit', 'Professional cleaning chemicals and tools', 1800.00, 'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg', 6, 1),
('Electrical Tools Kit', 'Basic electrical repair tools', 3200.00, 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg', 3, 1),
('Skincare Professional Kit', 'Professional skincare products and tools', 4500.00, 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg', 4, 1);

-- Insert Supply Kit Items
INSERT INTO supply_kit_items (kit_id, item_name, item_description, quantity, unit_price, barcode) VALUES
-- Beauty Essentials Kit
(1, 'Foundation Set', 'Professional foundation in multiple shades', 5, 300.00, 'HMQ1001'),
(1, 'Makeup Brushes', 'Professional makeup brush set', 1, 800.00, 'HMQ1002'),
(1, 'Eyeshadow Palette', 'Professional eyeshadow palette', 2, 600.00, 'HMQ1003'),
(1, 'Lipstick Collection', 'Assorted lipstick colors', 10, 80.00, 'HMQ1004'),

-- Plumbing Tools Kit
(2, 'Pipe Wrench Set', 'Adjustable pipe wrenches', 3, 500.00, 'HMQ2001'),
(2, 'Plumbing Tape', 'Teflon tape for pipe sealing', 10, 50.00, 'HMQ2002'),
(2, 'Pipe Cutter', 'Professional pipe cutting tool', 1, 1200.00, 'HMQ2003'),
(2, 'Drain Snake', 'Flexible drain cleaning tool', 1, 800.00, 'HMQ2004'),

-- Cleaning Supplies Kit
(3, 'All-Purpose Cleaner', 'Multi-surface cleaning solution', 5, 120.00, 'HMQ3001'),
(3, 'Microfiber Cloths', 'Professional cleaning cloths', 20, 25.00, 'HMQ3002'),
(3, 'Vacuum Bags', 'Universal vacuum cleaner bags', 10, 30.00, 'HMQ3003'),
(3, 'Disinfectant Spray', 'Hospital-grade disinfectant', 3, 200.00, 'HMQ3004');

-- Insert Vendor Supply Kit Orders
INSERT INTO vendor_supply_kits (vendor_id, kit_id, quantity_ordered, total_amount, order_status, order_date, delivery_date) VALUES
(1, 1, 2, 5000.00, 'delivered', '2024-12-15', '2024-12-18'),
(2, 2, 1, 5000.00, 'shipped', '2024-12-20', NULL),
(3, 1, 3, 7500.00, 'confirmed', '2024-12-22', NULL),
(4, 3, 2, 3600.00, 'pending', '2024-12-23', NULL),
(6, 4, 1, 3200.00, 'delivered', '2024-12-10', '2024-12-14'),
(7, 5, 1, 4500.00, 'shipped', '2024-12-21', NULL);

-- Insert Contractors
INSERT INTO contractors (company_name, contact_person, email, phone, address, business_license, insurance_certificate, commission_rate, is_verified, is_active) VALUES
('TechFix Solutions', 'Ramesh Kumar', 'contact@techfix.com', '+91-9876543230', '123 Tech Street, Bangalore', 'https://example.com/license1.pdf', 'https://example.com/insurance1.pdf', 25.00, 1, 1),
('HomeRepair Pro', 'Sunil Sharma', 'info@homerepair.com', '+91-9876543231', '456 Repair Avenue, Mumbai', 'https://example.com/license2.pdf', 'https://example.com/insurance2.pdf', 20.00, 1, 1),
('CleanCorp Services', 'Meera Patel', 'hello@cleancorp.com', '+91-9876543232', '789 Clean Road, Delhi', 'https://example.com/license3.pdf', 'https://example.com/insurance3.pdf', 22.50, 0, 1);

-- Insert Contractor Services
INSERT INTO contractor_services (contractor_id, service_id, hourly_rate, is_available) VALUES
(1, 10, 800.00, 1), -- TechFix - Electrical Work
(1, 19, 600.00, 1), -- TechFix - AC Repair
(2, 8, 700.00, 1),  -- HomeRepair - Plumbing
(2, 11, 500.00, 1), -- HomeRepair - Painting
(3, 9, 400.00, 1),  -- CleanCorp - House Cleaning
(3, 17, 600.00, 1); -- CleanCorp - Deep Cleaning

-- Insert Employees
INSERT INTO employees (first_name, last_name, email, phone, employee_type, department, position, salary, hire_date, manager_id, is_active) VALUES
('Amit', 'Sharma', 'amit.sharma@homiqly.com', '+91-9876543240', 'full_time', 'Operations', 'Operations Manager', 75000.00, '2024-01-15', NULL, 1),
('Priya', 'Gupta', 'priya.gupta@homiqly.com', '+91-9876543241', 'full_time', 'Customer Support', 'Support Specialist', 35000.00, '2024-02-01', 1, 1),
('Rahul', 'Singh', 'rahul.singh@homiqly.com', '+91-9876543242', 'full_time', 'Marketing', 'Marketing Executive', 45000.00, '2024-03-10', 1, 1),
('Sneha', 'Patel', 'sneha.patel@homiqly.com', '+91-9876543243', 'part_time', 'Quality Assurance', 'QA Tester', 25000.00, '2024-04-05', 1, 1),
('Vikash', 'Kumar', 'vikash.kumar@homiqly.com', '+91-9876543244', 'contract', 'IT', 'Developer', 60000.00, '2024-05-20', NULL, 1);

-- Insert Employee Tasks
INSERT INTO employee_tasks (employee_id, task_title, task_description, priority, status, due_date, assigned_by, assigned_date) VALUES
(2, 'Handle Customer Complaints', 'Resolve pending customer service tickets', 'high', 'in_progress', '2024-12-30', 1, '2024-12-20'),
(3, 'Social Media Campaign', 'Create content for New Year promotion', 'medium', 'pending', '2024-12-28', 1, '2024-12-22'),
(4, 'Test New Features', 'QA testing for calendar functionality', 'high', 'completed', '2024-12-25', 1, '2024-12-18'),
(5, 'Database Optimization', 'Optimize booking queries for better performance', 'medium', 'in_progress', '2025-01-05', 1, '2024-12-15');

-- Insert Vendor Payments
INSERT INTO vendor_payments (vendor_id, booking_id, amount, commission_rate, commission_amount, net_amount, payment_status, payment_date, payout_date) VALUES
(1, 1, 5000.00, 15.00, 750.00, 4250.00, 'completed', '2024-12-21', '2024-12-22'),
(3, 2, 15000.00, 15.00, 2250.00, 12750.00, 'completed', '2024-12-23', '2024-12-24'),
(2, 3, 1500.00, 10.00, 150.00, 1350.00, 'pending', '2024-12-24', NULL),
(4, 4, 1200.00, 12.00, 144.00, 1056.00, 'pending', '2024-12-25', NULL),
(1, 6, 2000.00, 15.00, 300.00, 1700.00, 'completed', '2024-12-26', '2024-12-27');

-- Insert Contractor Payouts
INSERT INTO contractor_payouts (contractor_id, booking_id, amount, commission_rate, commission_amount, net_amount, payout_status, payout_date) VALUES
(1, 5, 2400.00, 25.00, 600.00, 1800.00, 'pending', '2024-12-26'),
(2, 11, 1400.00, 20.00, 280.00, 1120.00, 'completed', '2024-12-24');

-- Insert Ratings
INSERT INTO ratings (booking_id, user_id, vendor_id, rating, review, created_at) VALUES
(1, 1, 1, 5, 'Excellent makeup service! Maya did an amazing job for my wedding.', '2024-12-21'),
(2, 2, 3, 4, 'Good service from BeautyPro. Professional and on time.', '2024-12-23'),
(3, 3, 2, 5, 'Ravi fixed our plumbing issue quickly and efficiently.', '2024-12-24'),
(7, 7, 7, 4, 'Nice facial treatment. Skin feels much better.', '2024-12-26'),
(9, 9, 8, 5, 'CleanMaster did an excellent job cleaning our office.', '2024-12-27'),
(10, 10, 9, 5, 'Great physiotherapy session. Very professional.', '2024-12-28'),
(16, 6, 1, 4, 'Good hair styling service for the event.', '2024-12-29');

-- Insert Notifications
INSERT INTO notifications (user_type, user_id, title, body, data, is_read, sent_at) VALUES
('users', 1, 'Booking Confirmed', 'Your makeup service booking has been confirmed for Dec 20', '{"booking_id": 1}', 1, '2024-12-19'),
('users', 2, 'Service Completed', 'Your makeup service has been completed. Please rate your experience.', '{"booking_id": 2}', 0, '2024-12-22'),
('vendors', 1, 'New Booking Request', 'You have a new booking request for hair styling', '{"booking_id": 6}', 0, '2024-12-25'),
('vendors', 2, 'Payment Processed', 'Your payment of ₹1350 has been processed', '{"payment_id": 3}', 1, '2024-12-24'),
('admin', NULL, 'New Vendor Registration', 'A new vendor has registered and is pending approval', '{"vendor_id": 7}', 0, '2024-12-23');

-- Insert some cart data for testing
INSERT INTO service_cart (user_id, vendor_id, service_id, service_type_id, service_categories_id, bookingDate, bookingTime, bookingStatus, notes) VALUES
(1, 1, 1, 1, 1, '2024-12-30', '10:00:00', 0, 'Test cart booking for makeup service');

INSERT INTO cart_packages (cart_id, package_id) VALUES (1, 1);

INSERT INTO cart_package_items (cart_id, sub_package_id, price, package_id, item_id) VALUES
(1, 1, 2000.00, 1, 1),
(1, 2, 2000.00, 1, 2);

-- Update some statistics for better dashboard display
UPDATE service_booking SET bookingStatus = 1 WHERE booking_id IN (1, 2, 3, 7, 9, 10, 12, 15, 16, 18);
UPDATE service_booking SET bookingStatus = 0 WHERE booking_id IN (4, 5, 6, 8, 11, 13, 14, 17);
UPDATE service_booking SET bookingStatus = 2 WHERE booking_id IN (19, 20);

-- Add some inventory data
INSERT INTO inventory (item_id, current_stock, reserved_stock, available_stock) VALUES
(1, 100, 10, 90),
(2, 50, 5, 45),
(3, 200, 20, 180),
(4, 500, 50, 450),
(5, 75, 8, 67),
(6, 30, 3, 27),
(7, 150, 15, 135),
(8, 80, 8, 72);

-- Add inventory movements
INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_id, notes) VALUES
(1, 'in', 50, 1, 'New stock received'),
(2, 'out', 10, 1, 'Used for vendor kit order'),
(3, 'in', 100, 2, 'Bulk purchase'),
(4, 'out', 20, 2, 'Vendor kit assembly'),
(5, 'in', 25, 3, 'Restocking');

-- Add some payment transactions
INSERT INTO payment_transactions (transaction_type, reference_id, amount, payment_method, transaction_status, transaction_date, gateway_response) VALUES
('vendor_payment', 1, 4250.00, 'bank_transfer', 'completed', '2024-12-22', '{"status": "success", "transaction_id": "TXN123456"}'),
('vendor_payment', 2, 12750.00, 'bank_transfer', 'completed', '2024-12-24', '{"status": "success", "transaction_id": "TXN123457"}'),
('contractor_payout', 1, 1800.00, 'bank_transfer', 'pending', '2024-12-26', '{"status": "pending", "transaction_id": "TXN123458"}'),
('supply_kit_payment', 1, 5000.00, 'credit_card', 'completed', '2024-12-15', '{"status": "success", "transaction_id": "TXN123459"}');

-- Add employee performance records
INSERT INTO employee_performance (employee_id, review_period, rating, feedback, goals, reviewer_id, review_date) VALUES
(2, 'Q4 2024', 4.5, 'Excellent customer service skills. Handles complaints professionally.', 'Improve response time by 10%', 1, '2024-12-15'),
(3, 'Q4 2024', 4.0, 'Good marketing campaigns. Creative content creation.', 'Increase social media engagement', 1, '2024-12-15'),
(4, 'Q4 2024', 4.8, 'Outstanding QA work. Finds bugs efficiently.', 'Learn automation testing', 1, '2024-12-15'),
(5, 'Q4 2024', 4.2, 'Good development skills. Delivers on time.', 'Improve code documentation', 1, '2024-12-15');

-- Final message
SELECT 'Fake data insertion completed successfully!' as Status;
SELECT 
    'Admin Login: admin@homiqly.com / admin123' as AdminCredentials,
    'Vendor Login: maya.sharma@vendor.com / password123' as VendorCredentials,
    'User Login: rajesh.kumar@email.com / password123' as UserCredentials;

-- Show some statistics
SELECT 
    (SELECT COUNT(*) FROM users) as TotalUsers,
    (SELECT COUNT(*) FROM vendors) as TotalVendors,
    (SELECT COUNT(*) FROM service_booking) as TotalBookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingStatus = 0) as PendingBookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingStatus = 1) as ApprovedBookings,
    (SELECT COUNT(*) FROM service_booking WHERE bookingDate >= CURDATE()) as UpcomingBookings;