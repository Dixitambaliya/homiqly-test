const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');


const recalculateCartTotals = asyncHandler(async (cart_id, user_id) => {
    try {
        const [[taxRow]] = await db.query(`
            SELECT taxName, taxPercentage
            FROM service_taxes
            WHERE status = '1'
            LIMIT 1
        `);

        const taxName = taxRow?.taxName || 'Service Tax';
        const serviceTaxRate = taxRow ? parseFloat(taxRow.taxPercentage) : 0;

        const [subPackages] = await db.query(`
            SELECT cpi.*, pi.itemName, pi.itemMedia, pi.timeRequired,
                   s.serviceName, s.serviceImage, st.service_type_id
            FROM cart_package_items cpi
            LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
            LEFT JOIN packages p ON cpi.package_id = p.package_id
            LEFT JOIN service_type st ON p.service_type_id = st.service_type_id
            LEFT JOIN services s ON st.service_id = s.service_id
            WHERE cpi.cart_id = ?
        `, [cart_id]);

        if (!subPackages.length) return null;

        const cartPackageItemIds = subPackages.map(sp => sp.cart_package_items_id);

        const [addons] = await db.query(`
            SELECT ca.*, a.addonName
            FROM cart_addons ca
            LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
            WHERE ca.cart_id = ? AND ca.cart_package_items_id IN (?)
        `, [cart_id, cartPackageItemIds]);

        const [preferences] = await db.query(`
            SELECT cp.*, bp.preferenceValue, bp.preferencePrice
            FROM cart_preferences cp
            LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
            WHERE cp.cart_id = ? AND cp.cart_package_items_id IN (?)
        `, [cart_id, cartPackageItemIds]);

        const groupBy = (arr, key) =>
            arr.reduce((acc, x) => {
                (acc[x[key]] = acc[x[key]] || []).push(x);
                return acc;
            }, {});

        const addonsByItem = groupBy(addons, 'cart_package_items_id');
        const prefsByItem = groupBy(preferences, 'cart_package_items_id');

        let totalAmount = 0;
        const detailedSubPackages = [];

        for (const item of subPackages) {
            const qty = parseInt(item.quantity) || 1;
            const basePrice = parseFloat(item.price) || 0;

            const subAddons = (addonsByItem[item.cart_package_items_id] || []).map(a => ({
                ...a,
                basePrice: parseFloat(a.price) || 0,
                price: (parseFloat(a.price) || 0) * qty
            }));

            const subPrefs = (prefsByItem[item.cart_package_items_id] || []).map(p => ({
                ...p,
                basePrice: parseFloat(p.preferencePrice) || 0,
                preferencePrice: (parseFloat(p.preferencePrice) || 0) * qty
            }));

            const addonTotal = subAddons.reduce((sum, a) => sum + a.price, 0);
            const prefTotal = subPrefs.reduce((sum, p) => sum + p.preferencePrice, 0);
            const baseTotal = basePrice * qty;

            const total = baseTotal + addonTotal + prefTotal;
            totalAmount += total;

            detailedSubPackages.push({
                ...item,
                quantity: qty,
                addons: subAddons,
                preferences: subPrefs,
                total
            });
        }

        // Promo, tax, etc. same as before
        let discountedTotal = totalAmount;
        let promoDiscount = 0;
        let promoDetails = null;

        // 1) Get promo assigned to this cart
        const [[cart]] = await db.query(`
                SELECT user_promo_code_id 
                FROM service_cart 
                WHERE cart_id = ? AND user_id = ?
            `, [cart_id, user_id]);

        let promoData = null;
        let promoType = null; // 'user' or 'system'

        if (cart?.user_promo_code_id) {

            const promoId = cart.user_promo_code_id;

            // 2️⃣ TRY USER PROMO (ADMIN PROMO)
            const [[userPromo]] = await db.query(`
                SELECT upc.user_promo_code_id, upc.promo_id, upc.usedCount, upc.maxUse,
                    pc.discount_type, pc.discountValue, pc.minSpend
                FROM user_promo_codes upc
                LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
                WHERE upc.user_promo_code_id = ?
                LIMIT 1
            `, [promoId]);

            if (userPromo) {
                promoData = userPromo;
                promoType = "user";
            }

            // 3️⃣ IF NOT FOUND → TRY SYSTEM PROMO (ASSIGNED TO USER)
            if (!promoData) {
                const [[systemPromo]] = await db.query(`
                    SELECT spc.system_promo_code_id AS user_promo_code_id,
                        st.discount_type, st.discountValue
                    FROM system_promo_codes spc
                    JOIN system_promo_code_templates st 
                        ON spc.template_id = st.system_promo_code_template_id
                    WHERE spc.system_promo_code_id = ?
                    LIMIT 1
                `, [promoId]);

                if (systemPromo) {
                    promoData = systemPromo;
                    promoType = "system";
                }

            }

            // 4️⃣ If still no promo found → bad ID
            if (!promoData) {
                console.warn("⚠️ Promo not found in ANY table");
            }
        }

        // 5️⃣ APPLY PROMO DISCOUNT IF FOUND
        if (promoData) {
            const { discount_type, discountValue} = promoData;

            // Calculate discount
            if (discount_type === "fixed") {
                promoDiscount = Number(discountValue);
            } else {
                promoDiscount = (totalAmount * Number(discountValue)) / 100;
            }

            // Apply discount
            discountedTotal = totalAmount - promoDiscount;

            // Save promo details for the response
            promoDetails = promoData;
        }

        const taxAmount = (discountedTotal * serviceTaxRate) / 100;
        const finalTotal = discountedTotal + taxAmount;

        await db.query(`
            INSERT INTO cart_totals (cart_id, subtotal, discounted_total, promo_discount, tax_amount, final_total)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                subtotal = VALUES(subtotal),
                discounted_total = VALUES(discounted_total),
                promo_discount = VALUES(promo_discount),
                tax_amount = VALUES(tax_amount),
                final_total = VALUES(final_total),
                last_calculated_at = NOW()
        `, [cart_id, totalAmount, discountedTotal, promoDiscount, taxAmount, finalTotal]);

        await db.query(`UPDATE service_cart SET needs_recalc = 0 WHERE cart_id = ?`, [cart_id]);

        return {
            totalAmount,
            discountedTotal,
            promoDiscount,
            taxAmount,
            finalTotal,
            taxName,
            taxPercentage: serviceTaxRate,
            detailedSubPackages,
            promoDetails
        };
    } catch (err) {
        console.error('❌ Cart Recalculation Error:', err);
        throw err;
    }
});



module.exports = { recalculateCartTotals }
