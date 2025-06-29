# Homiqly Database Setup Guide

This directory contains the database schema and fake data for the Homiqly platform.

## Files

1. **schema_setup.sql** - Complete database schema with all tables
2. **fake_data.sql** - Comprehensive fake data for testing

## Setup Instructions

### 1. Create Database Schema
```bash
mysql -u your_username -p < database/schema_setup.sql
```

### 2. Insert Fake Data
```bash
mysql -u your_username -p < database/fake_data.sql
```

## Login Credentials

### Admin Panel
- **URL**: `http://localhost:5000/admin-panel`
- **Email**: `admin@homiqly.com`
- **Password**: `admin123`

### Vendor Panel
- **URL**: `http://localhost:5000/vendor-panel`
- **Individual Vendor**: `maya.sharma@vendor.com` / `password123`
- **Company Vendor**: `contact@beautypro.com` / `password123`

### Test Users
- **User 1**: `rajesh.kumar@email.com` / `password123`
- **User 2**: `priya.sharma@email.com` / `password123`

## Database Statistics

After running the fake data script, you'll have:

- **10 Users** with complete profiles
- **10 Vendors** (6 individual, 4 company) with services
- **20+ Services** across 10 categories
- **20 Bookings** with varied dates for calendar testing
- **5 Supply Kits** with inventory
- **3 Contractors** with services
- **5 Employees** with tasks and performance data
- **Payment records** and **ratings**

## Calendar Data

The fake data includes bookings spread across:
- **Past bookings** (last 30 days)
- **Today's bookings** (current date)
- **Tomorrow's bookings**
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
- Analytics and reporting

### Vendor Panel
- Personal dashboard (different for individual vs company)
- Booking calendar with vendor-specific bookings
- Service management
- Profile management
- Supply kit ordering
- Payment history
- Customer ratings and reviews

### Individual vs Company Vendors

**Individual Vendors** get:
- Basic stats (Today's bookings, Pending, Approved, This month)
- Simple service management
- Personal profile management

**Company Vendors** get:
- Enhanced stats (Unique customers, Monthly growth)
- Team management capabilities
- Company profile management
- Advanced analytics

## Testing the Calendar

The calendar includes:
- **Color-coded bookings** (Pending=Yellow, Approved=Green, Cancelled=Red)
- **Multiple view modes** (Month, Week, Day)
- **Interactive booking details**
- **Status management** (Accept/Reject for vendors)
- **Real-time updates**

## Database Relationships

The schema includes proper foreign key relationships:
- Users → Bookings
- Vendors → Services → Service Types → Packages
- Bookings → Packages → Package Items
- Supply Kits → Inventory Management
- Contractors → Contractor Services
- Employees → Tasks → Performance

All tables are properly normalized and include appropriate indexes for performance.