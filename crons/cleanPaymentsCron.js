const cron = require("node-cron");
const { db } = require("../config/db"); // Update with your actual DB path

cron.schedule("0 0 * * *", async () => {
    console.log("🧹 CRON: Cleaning pending payments older than 24 hours...");

    try {
        const [result] = await db.query(`
            DELETE FROM payments
            WHERE status = 'pending'
        `);

        console.log(`✅ Deleted ${result.affectedRows} old pending payments`);
    } catch (err) {
        console.error("❌ Error deleting pending payments:", err.message);
    }
});

