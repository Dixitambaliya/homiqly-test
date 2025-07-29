const cron = require('node-cron');
const db = require('../config/db'); // adjust to your db location

cron.schedule('* * * * *', async () => {
    try {
        const [rows] = await db.query(`
            UPDATE vendor_settings
            SET manual_assignment_enabled = 0
            WHERE manual_assignment_enabled = 1
              AND end_datetime IS NOT NULL
              AND NOW() > end_datetime
        `);
        if (rows.affectedRows > 0) {
            console.log(`[${new Date().toISOString()}] Auto-disabled ${rows.affectedRows} vendor(s) manual assignment`);
        }
    } catch (err) {
        console.error("Cron error:", err);
    }
});
