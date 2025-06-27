const express = require("express")
const cors = require("cors")
const { db } = require("./config/db")

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
const PORT = process.env.PORT || 5000

app.use(cors({
    origin: "*", // allows all origins
}));

app.use(express.json())

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

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "OK", 
        message: "Homiqly Backend is running",
        timestamp: new Date().toISOString()
    });
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

async function testConnection() {
    try {
        const [rows] = await db.query("SELECT 1")
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Failed to connect to database:", error.message);
        process.exit(1)
    }
}

app.listen(PORT, async () => {
    await testConnection()
    console.log(`🚀 Homiqly Backend Server running on port ${PORT}`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
})