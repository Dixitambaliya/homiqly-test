const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool with correct MySQL2 configuration
const db = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    charset: 'utf8mb4',
});


async function applySessionSettings(connection) {
    try {

        await connection.promise().query(
            "SET SESSION sql_mode = (SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''))"
        );

        await connection.promise().query(
            "SET SESSION group_concat_max_len = 1000000"
        );

    } catch (err) {
        console.error("❌ Failed to apply session settings:", err.message);
    }
}

// Apply on every new connection
db.on('connection', async (connection) => {
    await applySessionSettings(connection);
});

// Test connection function
async function testConnection() {
    try {
        const [rows] = await db.query("SELECT 1");
        console.log("✅ DB connected", rows);
        return true; // ✅ return true if successful
    } catch (error) {
        console.error("❌ Failed to connect to DB:", error.message);
        return false; // ❌ return false if error
    }
}


module.exports = { db, testConnection };
