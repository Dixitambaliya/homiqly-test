const cron = require("node-cron");
const { db } = require("../config/db"); // Update with your actual DB path
const moment = require("moment-timezone");

// Email function (non-blocking)
const sendPromoEmail = async (userEmail, user_name, promoCode) => {
    try {
        const subject = `You've received a new promo code!`

        const bodyHtml = `
   <div style="padding: 5px 30px 30px; font-size: 15px; color: #ffffff; text-align: left;
            font-family: Arial, sans-serif; background-color: #000;">


            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                <strong>Hi ${user_name || "there"},</strong><br><br>
                Great news! You’ve just completed the minimum number of bookings required to unlock your special reward on Homiqly.
                We appreciate your trust in our at-home beauty services.
            </p>

            <p style="margin-bottom: 10px; font-size: 14px;">
                As a thank-you for reaching this milestone, your reward is now active on your account.
                You can apply it automatically on your next eligible booking—no extra steps needed.
            </p>

            <h3 style="font-weight: 500; margin-bottom: 20px; font-size: 16px;">
                Keep exploring, keep glowing. More perks await as you continue booking with Homiqly!
            </h3>

            <p style="font-size: 14px; margin-top: 15px; line-height: 1.6;">
                This reward is available only to users who have completed the required number of bookings.
                It applies to eligible at-home beauty services booked through the Homiqly website.
                Rewards are non-transferable and cannot be combined with other promotions.
                Terms may change without prior notice.
            </p>

        </div>
 `;

        await sendMail({
            to: userEmail,
            subject,
            bodyHtml,
            layout: "adminCode",
            extraData: { promoCode }, // ✅ Add this line
        })

        console.log(`📧 Promo email sent to ${userEmail}`);
    } catch (err) {
        console.error(`❌ Error sending promo email to ${userEmail}:`, err.message);
    }
};

cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running promo assignment cron job at midnight...");

    try {
        const [promos] = await db.query("SELECT * FROM promo_codes WHERE requiredBookings IS NOT NULL");

        for (const promo of promos) {
            const [eligibleUsers] = await db.query(
                `SELECT 
                    service_booking.user_id,
                    email,
                    CONCAT(firstName, ' ', lastName) AS user_name,
                    COUNT(*) as completed_count
                 FROM service_booking
                 JOIN users ON users.user_id = service_booking.user_id
                 WHERE payment_status = 'completed'
                 GROUP BY user_id
                 HAVING completed_count >= ?`,
                [promo.requiredBookings]
            );

            for (const user of eligibleUsers) {
                const [exists] = await db.query(
                    "SELECT * FROM user_promo_codes WHERE user_id = ? AND code = ?",
                    [user.user_id, promo.code]
                );

                const assignedAtMT = moment().tz("America/Denver").format("YYYY-MM-DD HH:mm:ss");

                if (exists.length > 0) continue;

                await db.query(
                    `INSERT INTO user_promo_codes (user_id, code, assigned_at, maxUse, promo_id, source_type) 
                     VALUES (?, ?, ?, ?, ?, 'admin')`,
                    [user.user_id, promo.code, assignedAtMT, promo.maxUse, promo.promo_id]
                );

                console.log(`✅ Assigned promo ${promo.code} to user ${user.user_id}`);

                sendPromoEmail(user.email, user.user_name, promo.code, promo.discountValue);
            }
        }
    } catch (err) {
        console.error("❌ Error in promo cron job:", err.message);
    }
});


