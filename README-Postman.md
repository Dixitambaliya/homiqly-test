# Homiqly API Postman Collection

This repository contains a Postman collection for testing and interacting with the Homiqly API.

## Getting Started

### Prerequisites

- [Postman](https://www.postman.com/downloads/) installed on your machine
- Homiqly backend server running (default: http://localhost:8000)

### Importing the Collection

1. Open Postman
2. Click on "Import" in the top left corner
3. Select the `Homiqly-API.postman_collection.json` file
4. Also import the `Homiqly-API-Environment.postman_environment.json` environment file
5. Select the "Homiqly API Environment" from the environment dropdown in the top right corner

## Collection Structure

The collection is organized into the following folders:

1. **Authentication** - User, vendor, and admin authentication endpoints
2. **User** - User profile and service browsing endpoints
3. **Vendor** - Vendor profile and service management endpoints
4. **Booking** - Service booking endpoints
5. **Cart** - Shopping cart endpoints
6. **Service** - Service management endpoints
7. **Admin** - Admin management endpoints
8. **Approval** - Vendor and service approval endpoints
9. **Supply Kit** - Supply kit management endpoints
10. **Contractor** - Contractor management endpoints
11. **Employee** - Employee management endpoints
12. **Analytics** - Analytics and reporting endpoints
13. **Notification** - Notification management endpoints
14. **Payment** - Payment management endpoints
15. **Rating** - Rating and review endpoints

## Authentication Flow

### User Authentication

1. Register a new user using the "User Register" endpoint
2. Verify the OTP code using the "User Verify Code" endpoint
3. Set a password using the "User Set Password" endpoint
4. Login using the "User Login" endpoint
5. Copy the token from the response and set it as the `userToken` environment variable

### Vendor Authentication

1. Register a new vendor using the "Vendor Register" endpoint
2. Wait for admin approval (or use an existing approved vendor account)
3. Login using the "Vendor Login" endpoint
4. Copy the token from the response and set it as the `vendorToken` environment variable

### Admin Authentication

1. Login using the "Admin Login" endpoint with the default credentials:
   - Email: admin@homiqly.com
   - Password: admin123
2. Copy the token from the response and set it as the `adminToken` environment variable

## Testing Workflows

### User Workflow

1. Browse service categories
2. View services by category
3. View service types for a specific service
4. View vendor services for a specific service
5. Add a service to cart
6. Checkout and create a booking
7. View bookings
8. Add a rating after service completion

### Vendor Workflow

1. View profile
2. Update profile
3. Apply for a new service type
4. View service types
5. View bookings
6. Approve or reject bookings
7. Order supply kits
8. View payments
9. View ratings

### Admin Workflow

1. View vendors
2. Approve vendors
3. View service types
4. Approve service types
5. Manage services and categories
6. View bookings
7. View users
8. Create supply kits
9. Process payments
10. View analytics

## Environment Variables

The collection uses the following environment variables:

- `baseUrl` - The base URL of the API (default: http://localhost:8000)
- `userToken` - JWT token for user authentication
- `vendorToken` - JWT token for vendor authentication
- `adminToken` - JWT token for admin authentication
- `resetToken` - Token for password reset

## Tips for Testing

1. **Authentication**: Always make sure you have the correct token set in the environment variables before making authenticated requests.

2. **File Uploads**: For endpoints that require file uploads, make sure to select actual files when testing in Postman.

3. **Request Order**: Some endpoints depend on data created by other endpoints. Follow the logical order of operations when testing.

4. **Error Handling**: Check the response body for error messages if a request fails.

5. **Environment Variables**: Use the "Quick Look" feature (eye icon in the top right) to verify your environment variables are set correctly.

## Troubleshooting

- **401 Unauthorized**: Your token may be missing, invalid, or expired. Try logging in again to get a new token.
- **400 Bad Request**: Check the request body for missing or invalid parameters.
- **404 Not Found**: Verify the endpoint URL and resource IDs.
- **500 Internal Server Error**: Check the server logs for more details.

## Contributing

Feel free to modify and extend this collection to suit your testing needs. If you find any issues or have suggestions for improvement, please create an issue or pull request.