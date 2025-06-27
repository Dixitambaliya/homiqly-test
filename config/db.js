const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool with correct MySQL2 configuration
const db = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    // Remove invalid options that cause warnings
    // acquireTimeout, timeout, and reconnect are not valid for mysql2
});

// Test connection function
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Connection details:', {
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT || 3306
        });
        return false;
    }
}

module.exports = { db, testConnection };