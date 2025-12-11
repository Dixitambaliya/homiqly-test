const express = require("express")
const cors = require("cors")
const path = require("path")
const { db, testConnection } = require("./config/db")
const bodyParser = require("body-parser");
const app = express();
const stripeController = require("./controller/stripeController");
require("./controller/reminder")


// 🟢 Stripe webhook (must come FIRST and use raw parser)
app.post(
    "/api/payment/stripe/webhook",
    express.raw({ type: "*/*" }),
    stripeController.stripeWebhook
);

app.use(express.json())


// Import routes
const userAuthRoutes = require("./routes/userAuthRoutes")
const adminAuthRoutes = require("./routes/adminAuthRoutes")
const vendorAuthRoutes = require("./routes/vendorAuthRoutes")
const employeeAuthRoutes = require("./routes/employeeAuthRoutes")
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
const stripeRoutes = require("./routes/stripeRoutes")
const ratingRoutes = require("./routes/ratingRoutes")
const settingsRoutes = require("./routes/settingsRoutes")
const ticketRoutes = require("./routes/ticketRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const notificationGetRoutes = require("./routes/notificationGetRoutes");
const promoRoutes = require("./routes/promoRoutes")
const otpRoutes = require("./routes/otpRoutes")
const serviceTaxRoutes = require("./routes/serviceTaxRoutes")
const vendorTemporaryRoutes = require("./routes/vendorTemporaryRoutes")
const vendorAvailabilityRoutes = require("./routes/vendorAvailabilityRoutes")
const blogRoutes = require("./routes/blogRoutes")
const postRoutes = require("./routes/postRoutes")
const superAdminRoutes = require("./routes/superAdminRoutes")

const PORT = process.env.PORT || 8000


app.use(cors({
    origin: "*",
}));
app.use("/public", express.static("public"));

// API Routes
app.use("/api/user", userAuthRoutes)
app.use("/api/admin", adminAuthRoutes)
app.use("/api/vendor", vendorAuthRoutes)
app.use("/api/employee", employeeAuthRoutes)
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
app.use("/api/payment", stripeRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/notification", notificationRoutes)
app.use("/api/settings", settingsRoutes)
app.use("/api/rating", ratingRoutes)
app.use("/api/payment", paymentRoutes)
app.use("/api", ticketRoutes)
app.use("/api/notifications", notificationGetRoutes)
app.use("/api", promoRoutes)
app.use("/verification", otpRoutes)
app.use("/api/tax", serviceTaxRoutes)
app.use("/api/vendor", vendorTemporaryRoutes)
app.use("/api/vendor", vendorAvailabilityRoutes)
app.use("/api/blog", blogRoutes)
app.use("/api/posts", postRoutes);
app.use("/api/superadmin", superAdminRoutes);

// Serve Vite build
app.use(express.static(path.join(__dirname, 'client/dist')));

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Homiqly Backend is running",
        timestamp: new Date().toISOString(),
    });
});

// Database health check endpoint
app.get("/api/health/db", async (req, res) => {
    try {
        const isConnected = await testConnection();

        // ✅ Update last_active ONLY if user is logged in
        if (req.user?.user_id) {
            const userId = req.user.user_id;

            // Fire-and-forget update (non-blocking)
            db.query(
                `
                UPDATE users
                SET last_active = NOW()
                WHERE user_id = ? AND last_active < (NOW() - INTERVAL 5 MINUTE)
            `
                [userId]
            ).catch(err => {
                console.error("Failed to update last_active:", err.message);
            });
        }

        if (isConnected) {
            return res.status(200).json({
                status: "OK",
                message: "Database connection successful",
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(500).json({
                status: "ERROR",
                message: "Database connection failed",
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        return res.status(500).json({
            status: "ERROR",
            message: "Database connection error",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});


// Serve React app for all other routes
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'client/dist/index.html'));
// });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Something went wrong!",
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server with proper database connection check
app.listen(PORT, async () => {
    console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database health check at: http://localhost:${PORT}/api/health/db`)

    // Test database connection
    const isConnected = await testConnection();
    if (isConnected) {
        console.log(`✅ Server is ready and database is connected!`);
    } else {
        console.log(`⚠️  Server started but database connection failed!`);
        console.log(`Please check your .env file and database credentials.`);
    }
});
