const express = require("express")
const cors = require("cors")
const { db } = require("./config/db")
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

const app = express();
const PORT = 5000

app.use(cors({
    origin: "*", // allows all origins
}));

app.use(express.json())

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

async function testConnection() {
    try {
        const [rows] = await db.query("SELECT 1")
        console.log("DB connected");
    } catch (error) {
        console.error("Failed to connect", error.message);
        process.exit(1)
    }
}

app.listen(PORT, async () => {
    await testConnection()
    console.log(`Server running :${PORT}`);
})
