# Homiqly Backend

A comprehensive Node.js backend for the Homiqly doorstep service platform, connecting customers with verified service providers in personal care, support care, and home maintenance sectors.

## 🚀 Features

### Core Functionality
- **User Management**: Customer registration, authentication, and profile management
- **Vendor Management**: Individual and company vendor onboarding with verification
- **Service Management**: Comprehensive service catalog with categories and types
- **Booking System**: Advanced booking with packages, preferences, and cart functionality
- **Payment Processing**: Commission-based payments with automated calculations
- **Rating & Reviews**: Customer feedback system for service quality

### Advanced Features
- **Supply Kit Management**: Branded supply kit ordering and inventory tracking
- **Contractor Network**: B2B contractor partnerships with specialized services
- **Employee Management**: Internal staff management with task assignment
- **Analytics Dashboard**: Comprehensive business intelligence and reporting
- **Real-time Notifications**: FCM-based push notifications
- **File Upload**: Firebase Storage integration for media files

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: JWT tokens
- **File Storage**: Firebase Storage
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Email**: Nodemailer with Gmail SMTP
- **Security**: bcrypt for password hashing

## 📁 Project Structure

```
homiqly-backend/
├── config/
│   ├── adminQueries/          # Admin-related database queries
│   ├── bookingQueries/        # Booking system queries
│   ├── serviceQueries/        # Service management queries
│   ├── userQueries/           # User management queries
│   ├── vendorQueries/         # Vendor management queries
│   ├── supplykitQueries/      # Supply kit management queries
│   ├── contractorQueries/     # Contractor management queries
│   ├── employeeQueries/       # Employee management queries
│   ├── analyticsQueries/      # Analytics and reporting queries
│   ├── paymentQueries/        # Payment processing queries
│   ├── ratingQueries/         # Rating and review queries
│   ├── db.js                  # Database connection
│   └── firebaseConfig.js      # Firebase configuration
├── controller/                # Business logic controllers
├── middleware/                # Authentication and upload middleware
├── routes/                    # API route definitions
├── database/                  # Database schema and migrations
└── server.js                  # Application entry point
```

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd homiqly-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   # Database Configuration
   MYSQL_HOST=your_mysql_host
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DATABASE=your_database_name

   # JWT Secret
   JWT_SECRET=your_jwt_secret_key

   # Email Configuration
   EMAIL_USER=your_gmail_address
   EMAIL_PASS=your_gmail_app_password

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

4. **Firebase Setup**
   - Place your Firebase service account JSON file in the root directory
   - Update the path in `config/firebaseConfig.js`

5. **Database Setup**
   ```bash
   # Run the database schema
   mysql -u your_user -p your_database < database/schema.sql
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/user/register` - User registration
- `POST /api/user/login` - User login
- `POST /api/vendor/register` - Vendor registration
- `POST /api/vendor/login` - Vendor login
- `POST /api/admin/login` - Admin login

### Service Management
- `GET /api/service/getservicecategories` - Get all service categories
- `GET /api/user/servicesbycategories` - Get services by category
- `POST /api/service/addservice` - Add new service (Admin)
- `POST /api/vendor/applyservicetype` - Vendor applies for service type

### Booking System
- `POST /api/booking/bookservice` - Create service booking
- `GET /api/booking/userbookedservices` - Get user bookings
- `GET /api/booking/vendorbookedservices` - Get vendor bookings
- `POST /api/cart/addtocart` - Add service to cart
- `POST /api/cart/checkout` - Checkout cart

### Supply Kit Management
- `GET /api/supplykit/all` - Get all supply kits
- `POST /api/supplykit/create` - Create supply kit (Admin)
- `POST /api/supplykit/order` - Order supply kit (Vendor)

### Analytics & Reporting
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/booking-trends` - Booking trends
- `GET /api/analytics/revenue` - Revenue analytics

### Notifications
- `POST /api/notification/send` - Send notification (Admin)
- `GET /api/notification/user` - Get user notifications

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: Restricted file types and Firebase storage
- **CORS Configuration**: Cross-origin resource sharing setup

## 💳 Payment Integration

The system supports commission-based revenue model:
- Automatic commission calculation (10-30% based on service category)
- Vendor payment tracking and reconciliation
- Contractor payout management
- Supply kit sales revenue

## 📊 Business Intelligence

- Real-time dashboard with key metrics
- Booking trends and patterns analysis
- Vendor performance tracking
- Revenue analytics and forecasting
- Service category performance

## 🔔 Notification System

- Firebase Cloud Messaging integration
- Real-time notifications for:
  - Booking confirmations and updates
  - Vendor approvals
  - Payment notifications
  - Service reminders

## 🏗 Database Schema

The system uses a comprehensive MySQL schema with:
- User and vendor management tables
- Service catalog and booking system
- Supply kit and inventory management
- Payment and commission tracking
- Analytics and reporting tables

## 🚀 Deployment

1. **Environment Setup**
   - Configure production environment variables
   - Set up MySQL database
   - Configure Firebase project

2. **Build & Deploy**
   ```bash
   npm install --production
   npm start
   ```

3. **Health Check**
   - Access `/api/health` endpoint to verify deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is proprietary software for Homiqly platform.

## 📞 Support

For technical support or questions, please contact the development team.

---

**Homiqly** - Revolutionizing doorstep services through technology and trust.