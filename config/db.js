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
    charset: 'utf8mb4',
});

// Test connection function
async function testConnection() {
   try {
    const [rows] = await db.query("SELECT 1");
    console.log("DB connected", rows);
  } catch (error) {
    console.error("Failed to connect", error.message);
    process.exit(1);
  }
}

module.exports = { db, testConnection };