# Homiqly Database Setup Guide

This directory contains the database schema and test data for the Homiqly platform.

## Setup Instructions

### Option 1: Using the Setup Script

The easiest way to set up the database is to use the provided setup script:

```bash
mysql -u your_username -p < database/homiqly_setup.sql
```

This script will:
1. Create all necessary tables
2. Populate them with test data
3. Set up admin, vendor, and user accounts

### Option 2: Manual Setup

If you prefer to set up the database manually:

1. Create the database:
```sql
CREATE DATABASE homiqly_db;
USE homiqly_db;
```

2. Run the schema creation script from the supabase migrations folder:
```bash
mysql -u your_username -p homiqly_db < supabase/migrations/20250629094544_pink_heart.sql
```

3. Add test data:
```bash
mysql -u your_username -p homiqly_db < supabase/migrations/20250629110651_divine_mud.sql
```

## Login Credentials

### Admin Panel
- **URL**: `http://localhost:8000/admin-panel`
- **Email**: `admin@homiqly.com`
- **Password**: `admin123`

### Vendor Panel
- **URL**: `http://localhost:8000/vendor-panel`
- **Individual Vendor**: `maya.sharma@vendor.com` / `password123`
- **Company Vendor**: `contact@beautypro.com` / `password123`

### Test Users
- **User 1**: `rajesh.kumar@email.com` / `password123`
- **User 2**: `priya.sharma@email.com` / `password123`

## Troubleshooting Login Issues

If you encounter login issues:

1. **Check Database Connection**
   - Verify your database connection settings in `.env` file
   - Make sure MySQL server is running
   - Test connection with: `mysql -u your_username -p -e "USE homiqly_db; SELECT 1;"`

2. **Verify User Credentials**
   - Check if the user exists in the database:
     ```sql
     USE homiqly_db;
     SELECT * FROM admin WHERE email = 'admin@homiqly.com';
     SELECT * FROM individual_details WHERE email = 'maya.sharma@vendor.com';
     ```
   - The password for all test accounts is hashed version of `password123`
   - Hash: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`

3. **Check Vendor Authentication Status**
   - For vendor accounts, check if they are approved:
     ```sql
     SELECT v.vendor_id, v.is_authenticated, i.name, i.email 
     FROM vendors v 
     JOIN individual_details i ON v.vendor_id = i.vendor_id;
     ```
   - `is_authenticated` should be `1` for approved vendors

4. **JWT Token Issues**
   - Make sure your `.env` file has a valid `JWT_SECRET` value
   - Try clearing browser localStorage and logging in again

5. **Server Issues**
   - Check if the server is running on port 8000
   - Restart the server: `npm run dev`
   - Check server logs for any errors

6. **Role Field**
   - Ensure the `role` field is set correctly in the vendors table:
     ```sql
     UPDATE vendors SET role = 'vendor' WHERE role IS NULL;
     ```

## Database Structure

The Homiqly database consists of several key components:

1. **User Management**
   - `users` - Customer accounts
   - `vendors` - Service provider accounts (individual or company)
   - `admin` - Administrative users

2. **Service Management**
   - `service_categories` - Categories of services
   - `services` - Specific services offered
   - `service_type` - Vendor-specific service types

3. **Booking System**
   - `service_booking` - Customer bookings
   - `packages` - Service packages offered by vendors
   - `package_items` - Components of service packages

4. **Supply Kit Management**
   - `supply_kits` - Kits available for vendors
   - `supply_kit_items` - Items within supply kits

5. **Payment System**
   - `vendor_payments` - Payment records for vendors

## Test Data

The test data includes:

- 5 users with complete profiles
- 4 vendors (2 individual, 2 company)
- 20+ services across 10 categories
- 25 bookings with varied dates for calendar testing
- 3 supply kits with items
- Payment records and ratings

## Calendar Testing

The test data is specifically designed to test the calendar functionality:

- **Past bookings**: To show booking history
- **Today's bookings**: For current day view
- **Tomorrow's bookings**: For immediate future planning
- **This week's bookings**: For week view testing
- **Next week's bookings**: For future planning
- **Future bookings**: For month view testing
- **Bookings with different statuses**: Pending, Approved, Cancelled

This provides comprehensive data for testing all calendar views and functionality.