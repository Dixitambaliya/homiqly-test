const mysql = require('mysql2/promise');
require('dotenv').config();

// Use connection pool instead of a single connection
const db = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'homiqly_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
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
        console.error('📋 Connection details:', {
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            database: process.env.MYSQL_DATABASE || 'homiqly_db'
        });
        return false;
    }
}

module.exports = { db, testConnection };