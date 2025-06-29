# Homiqly Database Setup Guide

This directory contains the database schema and fake data for the Homiqly platform.

## Files

1. **homiqly_setup.sql** - Complete database schema with test data for calendar functionality

## Setup Instructions

### Create and Populate Database
```bash
mysql -u your_username -p < database/homiqly_setup.sql
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

## Database Statistics

After running the setup script, you'll have:

- **5 Users** with complete profiles
- **4 Vendors** (2 individual, 2 company) with services
- **16+ Services** across 10 categories
- **25 Bookings** with varied dates for calendar testing
- **3 Supply Kits** with inventory
- **Payment records** and **ratings**

## Calendar Data

The fake data includes bookings spread across:
- **Past bookings** (last 10 days)
- **Today's bookings** (current date)
- **Tomorrow's bookings**
- **This week bookings**
- **Next week bookings**
- **Future bookings** (next month)
- **Cancelled bookings**

This provides comprehensive data for testing the calendar functionality in both admin and vendor panels.

## Key Features Covered

### Admin Panel
- Dashboard with statistics
- Vendor management and approval
- User management
- Booking calendar with all vendor bookings
- Service and category management
- Supply kit management
- Payment processing

### Vendor Panel
- Personal dashboard
- Booking calendar with vendor-specific bookings
- Service management
- Profile management
- Supply kit ordering
- Payment history
- Customer ratings and reviews

## Testing the Calendar

The calendar includes:
- **Color-coded bookings** (Pending=Yellow, Approved=Green, Cancelled=Red)
- **Multiple view modes** (Month, Week, Day)
- **Interactive booking details**
- **Status management** (Accept/Reject for vendors)
- **Real-time updates**

## Troubleshooting

If you encounter login issues:
1. Check that the server is running (`npm run dev`)
2. Verify the database connection in `.env` file
3. Ensure the database has been properly populated
4. Clear browser cache and local storage
5. Check browser console for any errors

### Common Login Issues

1. **"Invalid credentials" error**:
   - Make sure you're using the correct email and password
   - Check if the user exists in the database
   - Verify the password hash in the database matches `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi` (for test accounts)
   - The plain text password for all test accounts is `password123`

2. **"Invalid Password" error**:
   - This usually means the user exists but the password is incorrect
   - Try clearing your browser cache and local storage
   - Verify the password hash in the database

3. **"Your account is pending approval" error**:
   - This means the vendor account exists but hasn't been approved by an admin
   - Log in as admin and approve the vendor account

4. **JWT Token issues**:
   - If you see errors related to JWT in the console, check that your `.env` file has a valid `JWT_SECRET` value
   - Try logging out and logging back in to get a fresh token

5. **Database connection issues**:
   - Verify your MySQL connection details in the `.env` file
   - Make sure the MySQL server is running
   - Check that the database exists and has been populated with the test data