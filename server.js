const express = require("express")
const cors = require("cors")
const path = require("path")
const { db, testConnection } = require("./config/db")

// Import routes
const userAuthRoutes = require("./routes/userAuthRoutes")
const adminAuthRoutes = require("./routes/adminAuthRoutes")
const vendorAuthRoutes = require("./routes/vendorAuthRoutes")
const verificationRoutes = require("./routes/verificationRoutes")
const adminRoutes = require("./routes/adminRoutes")
const serviceRoutes = require("./routes/serviceRoutes")
const testRoutes = require("./routes/testRoutes")
const vendorRoutes = require("./routes/vendorRoutes")
const userRoutes = require("./routes/userRoutes")
const serviceBookingRoutes = require("./routes/serviceBookingRoutes")
const addToCartService = require("./routes/addToCartRoutes")
const supplykitRoutes = require("./routes/supplykitRoutes")
const contractorRoutes = require("./routes/contractorRoutes")
const employeeRoutes = require("./routes/employeeRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const ratingRoutes = require("./routes/ratingRoutes")

const app = express();
const PORT = process.env.PORT || 8000

app.use(cors({
    origin: "*", // allows all origins
}));

app.use(express.json())

// Serve static files for admin and vendor panels
app.use('/admin-panel', express.static(path.join(__dirname, 'admin-panel')));
app.use('/vendor-panel', express.static(path.join(__dirname, 'vendor-panel')));

// API Routes
app.use("/api/user", userAuthRoutes)
app.use("/api/admin", adminAuthRoutes)
app.use("/api/vendor", vendorAuthRoutes)
app.use("/api/approval", verificationRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/service", serviceRoutes)
app.use("/api/auth", testRoutes)
app.use("/api/vendor", vendorRoutes)
app.use("/api/user", userRoutes)
app.use("/api/booking", serviceBookingRoutes)
app.use("/api/cart", addToCartService)
app.use("/api/supplykit", supplykitRoutes)
app.use("/api/contractor", contractorRoutes)
app.use("/api/employee", employeeRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/notification", notificationRoutes)
app.use("/api/payment", paymentRoutes)
app.use("/api/rating", ratingRoutes)

// Root route - redirect to admin panel
app.get("/", (req, res) => {
    res.redirect("/admin-panel");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "OK", 
        message: "Homiqly Backend is running",
        timestamp: new Date().toISOString(),
        panels: {
            admin: `http://localhost:${PORT}/admin-panel`,
            vendor: `http://localhost:${PORT}/vendor-panel`
        }
    });
});

// Database health check endpoint
app.get("/api/health/db", async (req, res) => {
    try {
        const isConnected = await testConnection();
        if (isConnected) {
            res.status(200).json({ 
                status: "OK", 
                message: "Database connection successful",
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({ 
                status: "ERROR", 
                message: "Database connection failed",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({ 
            status: "ERROR", 
            message: "Database connection error",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: "Something went wrong!",
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({ 
        error: "Route not found",
        message: `The route ${req.originalUrl} does not exist`
    });
});

// Start server with proper database connection check
app.listen(PORT, async () => {
    console.log(`🚀 Homiqly Backend Server starting on port ${PORT}`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database health check at: http://localhost:${PORT}/api/health/db`);
    console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin-panel`);
    console.log(`🏪 Vendor Panel: http://localhost:${PORT}/vendor-panel`);
    
    // Test database connection
    const isConnected = await testConnection();
    if (isConnected) {
        console.log(`✅ Server is ready and database is connected!`);
    } else {
        console.log(`⚠️  Server started but database connection failed!`);
        console.log(`Please check your .env file and database credentials.`);
    }
});