const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');


const recalculateCartTotals = asyncHandler(async (cart_id, user_id) => {
    try {
        // 1️⃣ Fetch active tax info
        const [[taxRow]] = await db.query(`
            SELECT taxName, taxPercentage
            FROM service_taxes
            WHERE status = '1'
            LIMIT 1
        `);
        const serviceTaxRate = taxRow ? parseFloat(taxRow.taxPercentage) : 0;

        // 2️⃣ Fetch all cart items
        const [subPackages] = await db.query(`
            SELECT cpi.cart_package_items_id, cpi.price, cpi.quantity, cpi.package_id
            FROM cart_package_items cpi
            WHERE cpi.cart_id = ?
        `, [cart_id]);

        if (!subPackages.length) return null;

        const cartPackageItemIds = subPackages.map(sp => sp.cart_package_items_id);

        const [addons] = await db.query(`
            SELECT ca.cart_package_items_id, ca.price
            FROM cart_addons ca
            WHERE ca.cart_id = ? AND ca.cart_package_items_id IN (?)
        `, [cart_id, cartPackageItemIds]);

        const [preferences] = await db.query(`
            SELECT cp.cart_package_items_id, bp.preferencePrice
            FROM cart_preferences cp
            JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
            WHERE cp.cart_id = ? AND cp.cart_package_items_id IN (?)
        `, [cart_id, cartPackageItemIds]);

        const groupBy = (arr, key) =>
            arr.reduce((acc, x) => {
                (acc[x[key]] = acc[x[key]] || []).push(x);
                return acc;
            }, {});

        const addonsByItem = groupBy(addons, "cart_package_items_id");
        const prefsByItem = groupBy(preferences, "cart_package_items_id");

        // 3️⃣ Core subtotal calculation
        let totalAmount = 0;
        for (const item of subPackages) {
            const base = parseFloat(item.price) || 0;
            const qty = parseInt(item.quantity) || 1;
            const addonsTotal = (addonsByItem[item.cart_package_items_id] || [])
                .reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
            const prefsTotal = (prefsByItem[item.cart_package_items_id] || [])
                .reduce((sum, p) => sum + (parseFloat(p.preferencePrice) || 0), 0);

            totalAmount += (base + addonsTotal + prefsTotal) * qty;
        }

        // 4️⃣ Fetch promo details from user cart
        let discountedTotal = totalAmount;
        let promoDiscount = 0;

        const [[cart]] = await db.query(`
            SELECT user_promo_code_id
            FROM service_cart
            WHERE cart_id = ? AND user_id = ?
        `, [cart_id, user_id]);

        if (cart?.user_promo_code_id) {
            let appliedPromo = null;

            // 🅰️ Check if user promo is admin-defined
            const [userPromoRows] = await db.query(`
                SELECT *
                FROM user_promo_codes
                WHERE user_id = ? AND user_promo_code_id = ?
                LIMIT 1
            `, [user_id, cart.user_promo_code_id]);

            if (userPromoRows.length) {
                const promo = userPromoRows[0];

                if (promo.promo_id) {
                    const [adminPromo] = await db.query(`
                        SELECT discountValue, discount_type
                        FROM promo_codes
                        WHERE promo_id = ?
                        LIMIT 1
                    `, [promo.promo_id]);

                    if (adminPromo.length) {
                        const { discountValue, discount_type } = adminPromo[0];
                        const value = parseFloat(discountValue) || 0;

                        discountedTotal =
                            discount_type === "fixed"
                                ? Math.max(0, totalAmount - value)
                                : totalAmount - (totalAmount * value) / 100;

                        promoDiscount = totalAmount - discountedTotal;
                        appliedPromo = { source_type: "admin" };
                    }
                }
            }

            // 🅱️ If not found in admin promos, check system promos
            if (!appliedPromo) {
                const [systemPromoRows] = await db.query(`
                    SELECT sc.system_promo_code_id, st.discountValue, st.discount_type
                    FROM system_promo_codes sc
                    JOIN system_promo_code_templates st
                      ON sc.template_id = st.system_promo_code_template_id
                    WHERE sc.system_promo_code_id = ?
                    LIMIT 1
                `, [cart.user_promo_code_id]);

                if (systemPromoRows.length) {
                    const { discountValue, discount_type } = systemPromoRows[0];
                    const value = parseFloat(discountValue) || 0;

                    discountedTotal =
                        discount_type === "fixed"
                            ? Math.max(0, totalAmount - value)
                            : totalAmount - (totalAmount * value) / 100;

                    promoDiscount = totalAmount - discountedTotal;
                    appliedPromo = { source_type: "system" };
                }
            }
        }

        // 5️⃣ Tax calculation
        const taxAmount = (discountedTotal * serviceTaxRate) / 100;
        const finalTotal = discountedTotal + taxAmount;

        // 6️⃣ Store computed totals
        await db.query(`
            INSERT INTO cart_totals (
                cart_id, subtotal, discounted_total, promo_discount, tax_amount, final_total
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                subtotal = VALUES(subtotal),
                discounted_total = VALUES(discounted_total),
                promo_discount = VALUES(promo_discount),
                tax_amount = VALUES(tax_amount),
                final_total = VALUES(final_total),
                last_calculated_at = NOW()
        `, [cart_id, totalAmount, discountedTotal, promoDiscount, taxAmount, finalTotal]);

        // 7️⃣ Mark cart as up-to-date
        await db.query(`
            UPDATE service_cart
            SET needs_recalc = 0
            WHERE cart_id = ?
        `, [cart_id]);

        // Return computed values
        return {
            totalAmount,
            discountedTotal,
            promoDiscount,
            taxAmount,
            finalTotal
        };

    } catch (err) {
        console.error("❌ Cart Recalculation Error:", err);
        throw err;
    }
});


module.exports = { recalculateCartTotals }
