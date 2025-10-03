const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');

const addToCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { service_id, packages, preferences, consents } = req.body;

    if (!service_id) return res.status(400).json({ message: "service_id is required" });

    let parsedPackages = [];
    try {
        if (packages !== undefined) {
            parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
        }
    } catch (e) {
        return res.status(400).json({ message: "'packages' must be valid JSON", error: e.message });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const createdOrUpdatedCarts = [];

        for (const pkg of parsedPackages) {
            const { package_id, sub_packages, addons, preferences: pkgPreferences, consents: pkgConsents } = pkg;

            // Check if cart exists
            const [existingCart] = await connection.query(
                `SELECT cart_id FROM service_cart 
                 WHERE user_id = ? AND service_id = ? AND package_id = ? AND bookingStatus = 0 LIMIT 1`,
                [user_id, service_id, package_id]
            );

            let cart_id = existingCart.length ? existingCart[0].cart_id : null;

            if (!cart_id) {
                const [insertCart] = await connection.query(
                    `INSERT INTO service_cart (user_id, service_id, package_id, bookingStatus) VALUES (?, ?, ?, 0)`,
                    [user_id, service_id, package_id]
                );
                cart_id = insertCart.insertId;
            }

            // Fetch existing data
            const [existingItems] = await connection.query(
                "SELECT cart_package_items_id, sub_package_id FROM cart_package_items WHERE cart_id = ?", [cart_id]
            );
            const existingItemMap = {};
            existingItems.forEach(i => existingItemMap[i.sub_package_id] = i.cart_package_items_id);

            const [existingAddons] = await connection.query(
                "SELECT addon_id, sub_package_id FROM cart_addons WHERE cart_id = ?", [cart_id]
            );
            const existingAddonMap = {};
            existingAddons.forEach(a => existingAddonMap[`${a.sub_package_id}_${a.addon_id}`] = true);

            const [existingPrefs] = await connection.query(
                "SELECT preference_id, sub_package_id FROM cart_preferences WHERE cart_id = ?", [cart_id]
            );
            const existingPrefMap = {};
            existingPrefs.forEach(p => existingPrefMap[`${p.sub_package_id}_${p.preference_id}`] = true);

            const [existingConsents] = await connection.query(
                "SELECT consent_id, sub_package_id FROM cart_consents WHERE cart_id = ?", [cart_id]
            );
            const existingConsentMap = {};
            existingConsents.forEach(c => existingConsentMap[`${c.sub_package_id}_${c.consent_id}`] = true);

            // DELETE old data ONLY if client explicitly sends empty arrays
            if (Array.isArray(sub_packages) && sub_packages.length === 0) {
                await connection.query("DELETE FROM cart_package_items WHERE cart_id = ?", [cart_id]);
            }
            if (Array.isArray(addons) && addons.length === 0) {
                await connection.query("DELETE FROM cart_addons WHERE cart_id = ?", [cart_id]);
            }
            if (Array.isArray(pkgPreferences) && pkgPreferences.length === 0) {
                await connection.query("DELETE FROM cart_preferences WHERE cart_id = ?", [cart_id]);
            }
            if (Array.isArray(pkgConsents) && pkgConsents.length === 0) {
                await connection.query("DELETE FROM cart_consents WHERE cart_id = ?", [cart_id]);
            }

            // INSERT or UPDATE sub-packages
            if (Array.isArray(sub_packages)) {
                for (const item of sub_packages) {
                    const sub_package_id = item.sub_package_id;
                    const quantity = item.quantity || 1;
                    const price = item.price || 0;
                    const addNewInstance = item.addNewInstance || false; // optional flag

                    if (!existingItemMap[sub_package_id] || addNewInstance) {
                        // Insert new row
                        await connection.query(
                            "INSERT INTO cart_package_items (cart_id, package_id, sub_package_id, price, quantity) VALUES (?, ?, ?, ?, ?)",
                            [cart_id, package_id, sub_package_id, price, quantity]
                        );

                        // Addons → insert all
                        if (Array.isArray(addons)) {
                            for (const addon of addons) {
                                await connection.query(
                                    "INSERT INTO cart_addons (cart_id, sub_package_id, addon_id, price) VALUES (?, ?, ?, ?)",
                                    [cart_id, sub_package_id, addon.addon_id, addon.price || 0]
                                );
                            }
                        }

                        // Preferences → insert all
                        if (Array.isArray(pkgPreferences)) {
                            for (const pref of pkgPreferences) {
                                await connection.query(
                                    "INSERT INTO cart_preferences (cart_id, sub_package_id, preference_id) VALUES (?, ?, ?)",
                                    [cart_id, sub_package_id, pref.preference_id]
                                );
                            }
                        }

                        // Consents → insert all
                        if (Array.isArray(pkgConsents)) {
                            for (const consent of pkgConsents) {
                                await connection.query(
                                    "INSERT INTO cart_consents (cart_id, sub_package_id, consent_id, answer) VALUES (?, ?, ?, ?)",
                                    [cart_id, sub_package_id, consent.consent_id, consent.answer || null]
                                );
                            }
                        }

                    } else {
                        // Update existing row
                        await connection.query(
                            "UPDATE cart_package_items SET price = ?, quantity = ? WHERE cart_id = ? AND sub_package_id = ?",
                            [price, quantity, cart_id, sub_package_id]
                        );

                        // Add new addons, preferences, consents if not exists
                        if (Array.isArray(addons)) {
                            for (const addon of addons) {
                                if (!existingAddonMap[`${sub_package_id}_${addon.addon_id}`]) {
                                    await connection.query(
                                        "INSERT INTO cart_addons (cart_id, sub_package_id, addon_id, price) VALUES (?, ?, ?, ?)",
                                        [cart_id, sub_package_id, addon.addon_id, addon.price || 0]
                                    );
                                }
                            }
                        }

                        if (Array.isArray(pkgPreferences)) {
                            for (const pref of pkgPreferences) {
                                if (!existingPrefMap[`${sub_package_id}_${pref.preference_id}`]) {
                                    await connection.query(
                                        "INSERT INTO cart_preferences (cart_id, sub_package_id, preference_id) VALUES (?, ?, ?)",
                                        [cart_id, sub_package_id, pref.preference_id]
                                    );
                                }
                            }
                        }

                        if (Array.isArray(pkgConsents)) {
                            for (const consent of pkgConsents) {
                                if (!existingConsentMap[`${sub_package_id}_${consent.consent_id}`]) {
                                    await connection.query(
                                        "INSERT INTO cart_consents (cart_id, sub_package_id, consent_id, answer) VALUES (?, ?, ?, ?)",
                                        [cart_id, sub_package_id, consent.consent_id, consent.answer || null]
                                    );
                                }
                            }
                        }
                    }
                }
            }

            createdOrUpdatedCarts.push({ cart_id });
        }

        await connection.commit();
        connection.release();
        res.status(200).json({ message: "Cart updated successfully", carts: createdOrUpdatedCarts });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Cart insert/update error:", err);
        res.status(500).json({ message: "Failed to add service to cart", error: err.message });
    }
});




const getUserCart = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const [cartRows] = await db.query(
            `SELECT 
                sc.cart_id,
                sc.service_id,
                sc.package_id,
                p.packageName,
                p.service_type_id,
                s.serviceName,
                s.serviceImage,
                sc.user_id,
                sc.vendor_id,
                sc.bookingStatus,
                sc.notes,
                sc.bookingMedia,
                sc.created_at,
                sc.bookingDate,
                sc.bookingTime,
                sc.user_promo_code_id
            FROM service_cart sc
            LEFT JOIN packages p ON sc.package_id = p.package_id
            LEFT JOIN services s ON sc.service_id = s.service_id
            WHERE sc.user_id = ?
            ORDER BY sc.created_at DESC`,
            [user_id]
        );

        if (!cartRows.length) {
            return res.status(200).json({ message: "Cart is empty", carts: [], promos: [] });
        }

        const allCarts = [];
        const promos = [];

        for (const cart of cartRows) {
            const { cart_id } = cart;

            // Fetch sub-packages
            const [subPackages] = await db.query(
                `SELECT 
                    cpi.cart_package_items_id,
                    cpi.sub_package_id,
                    pi.itemName,
                    cpi.price,
                    cpi.quantity,
                    pi.timeRequired
                 FROM cart_package_items cpi
                 LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
                 WHERE cpi.cart_id = ?`,
                [cart_id]
            );

            // Fetch addons
            const [addons] = await db.query(
                `SELECT ca.sub_package_id, a.addonName, ca.price
                 FROM cart_addons ca
                 JOIN package_addons a ON ca.addon_id = a.addon_id
                 WHERE ca.cart_id = ?`,
                [cart_id]
            );

            // Fetch preferences
            const [preferences] = await db.query(
                `SELECT cp.cart_preference_id, cp.sub_package_id, bp.preferenceValue, bp.preferencePrice
                 FROM cart_preferences cp
                 JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
                 WHERE cp.cart_id = ?`,
                [cart_id]
            );

            // Fetch consents
            const [consents] = await db.query(
                `SELECT cc.cart_consent_id, cc.sub_package_id, c.question, cc.answer
                 FROM cart_consents cc
                 JOIN package_consent_forms c ON cc.consent_id = c.consent_id
                 WHERE cc.cart_id = ?`,
                [cart_id]
            );

            // Group addons/preferences/consents by sub_package_id
            const addonsBySub = {};
            addons.forEach(a => {
                if (!addonsBySub[a.sub_package_id]) addonsBySub[a.sub_package_id] = [];
                addonsBySub[a.sub_package_id].push(a);
            });

            const prefsBySub = {};
            preferences.forEach(p => {
                if (!prefsBySub[p.sub_package_id]) prefsBySub[p.sub_package_id] = [];
                prefsBySub[p.sub_package_id].push({
                    cart_preference_id: p.cart_preference_id,
                    preferenceValue: p.preferenceValue,
                    price: p.preferencePrice || 0
                });
            });

            const consentsBySub = {};
            consents.forEach(c => {
                if (!consentsBySub[c.sub_package_id]) consentsBySub[c.sub_package_id] = [];
                consentsBySub[c.sub_package_id].push({
                    consent_id: c.cart_consent_id,
                    consentText: c.question,
                    answer: c.answer
                });
            });

            // Attach child arrays and calculate sub-package total
            const subPackagesStructured = subPackages.map(sub => {
                const subAddons = addonsBySub[sub.sub_package_id] || [];
                const subPrefs = prefsBySub[sub.sub_package_id] || [];
                const subConsents = consentsBySub[sub.sub_package_id] || [];

                const subTotal =
                    (parseFloat(sub.price) || 0) * (parseInt(sub.quantity) || 1) +
                    subAddons.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0) +
                    subPrefs.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

                return {
                    ...sub,
                    addons: subAddons,
                    preferences: subPrefs,
                    consents: subConsents,
                    total: subTotal
                };
            });

            // Cart-level total
            let totalAmount = subPackagesStructured.reduce((sum, sp) => sum + sp.total, 0);

            // Apply promo if exists
            let discountedTotal = totalAmount;
            let promoDetails = null;

            if (cart.user_promo_code_id) {
                const [userPromoRows] = await db.query(
                    `SELECT * FROM user_promo_codes WHERE user_id = ? AND user_promo_code_id = ? LIMIT 1`,
                    [user_id, cart.user_promo_code_id]
                );

                if (userPromoRows.length) {
                    const promo = userPromoRows[0];
                    const [adminPromo] = await db.query(
                        `SELECT * FROM promo_codes WHERE promo_id = ?`,
                        [promo.promo_id]
                    );

                    if (adminPromo.length) {
                        const discountValue = parseFloat(adminPromo[0].discountValue || 0);
                        if (discountValue > 0) discountedTotal = totalAmount - (totalAmount * discountValue / 100);
                        promoDetails = {
                            user_promo_code_id: promo.user_promo_code_id,
                            source_type: 'admin',
                            ...adminPromo[0],
                            code: promo.code,
                            usedCount: promo.usedCount,
                            maxUse: promo.maxUse
                        };
                    }
                }

                if (!promoDetails) {
                    const [systemPromoRows] = await db.query(
                        `SELECT * FROM system_promo_codes WHERE system_promo_code_id = ? LIMIT 1`,
                        [cart.user_promo_code_id]
                    );

                    if (systemPromoRows.length) {
                        const sysPromo = systemPromoRows[0];
                        const discountValue = parseFloat(sysPromo.discountValue || 0);
                        if (discountValue > 0) discountedTotal = totalAmount - (totalAmount * discountValue / 100);
                        promoDetails = { ...sysPromo };
                    }
                }

                if (promoDetails) promos.push(promoDetails);
            }

            allCarts.push({
                ...cart,
                packages: [{ sub_packages: subPackagesStructured }],
                totalAmount,
                discountedTotal
            });
        }

        res.status(200).json({ message: "Cart retrieved successfully", carts: allCarts, promos });
    } catch (error) {
        console.error("Error retrieving cart:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


const getCartByPackageId = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { package_id } = req.params;

    if (!package_id) {
        return res.status(400).json({ message: "package_id is required" });
    }

    try {
        // 1️⃣ Fetch cart row(s) for the user and package (minimal info)
        const [cartRows] = await db.query(
            `SELECT sc.cart_id, sc.user_id, sc.service_id, sc.package_id, sc.bookingStatus, sc.notes, sc.bookingMedia, sc.bookingDate, sc.bookingTime, sc.user_promo_code_id
             FROM service_cart sc
             WHERE sc.user_id = ? AND sc.package_id = ?`,
            [user_id, package_id]
        );

        if (!cartRows.length) {
            return res.status(200).json({ message: "No cart found for this package" });
        }

        const cart = cartRows[0];
        const { cart_id, user_promo_code_id } = cart;

        // 2️⃣ Fetch sub-packages
        const [subPackages] = await db.query(
            `SELECT cpi.sub_package_id, pi.itemName, cpi.price, cpi.quantity, pi.timeRequired
             FROM cart_package_items cpi
             LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
             WHERE cpi.cart_id = ?`,
            [cart_id]
        );

        // 3️⃣ Fetch addons
        const [addons] = await db.query(
            `SELECT ca.addon_id, ca.sub_package_id, a.addonName, ca.price
             FROM cart_addons ca
             LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
             WHERE ca.cart_id = ?`,
            [cart_id]
        );

        // 4️⃣ Fetch preferences
        const [preferences] = await db.query(
            `SELECT 
            cp.preference_id, 
            cp.cart_preference_id, 
            cp.sub_package_id, 
            bp.preferenceValue, 
            bp.preferencePrice
             FROM cart_preferences cp
             LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
             WHERE cp.cart_id = ?`,
            [cart_id]
        );

        // 5️⃣ Fetch consents
        const [consents] = await db.query(
            `SELECT cc.sub_package_id, c.question, cc.answer ,c.consent_id 
             FROM cart_consents cc
             LEFT JOIN package_consent_forms c ON cc.consent_id = c.consent_id
             WHERE cc.cart_id = ?`,
            [cart_id]
        );

        // 6️⃣ Group addons/preferences/consents by sub_package_id
        const addonsBySub = {};
        addons.forEach(a => {
            if (!addonsBySub[a.sub_package_id]) addonsBySub[a.sub_package_id] = [];
            addonsBySub[a.sub_package_id].push(a);
        });

        const prefsBySub = {};
        preferences.forEach(p => {
            if (!prefsBySub[p.sub_package_id]) prefsBySub[p.sub_package_id] = [];
            prefsBySub[p.sub_package_id].push({
                preference_id: p.preference_id,
                preferenceValue: p.preferenceValue,
                price: p.preferencePrice || 0
            });
        });

        const consentsBySub = {};
        consents.forEach(c => {
            if (!consentsBySub[c.sub_package_id]) consentsBySub[c.sub_package_id] = [];
            consentsBySub[c.sub_package_id].push({
                consent_id: c.consent_id,
                consentText: c.question,
                answer: c.answer
            });
        });

        // 7️⃣ Attach child arrays to sub-packages
        const subPackagesStructured = subPackages.map(sub => ({
            ...sub,
            addons: addonsBySub[sub.sub_package_id] || [],
            preferences: prefsBySub[sub.sub_package_id] || [],
            consents: consentsBySub[sub.sub_package_id] || []
        }));

        // 8️⃣ Calculate total
        let totalAmount = 0;
        subPackagesStructured.forEach(sp => {
            totalAmount += (parseFloat(sp.price) || 0) * (parseInt(sp.quantity) || 1);
            sp.addons.forEach(a => totalAmount += parseFloat(a.price) || 0);
            sp.preferences.forEach(p => totalAmount += parseFloat(p.price) || 0);
        });

        // 9️⃣ Promo logic (same as getUserCart)
        let discountedTotal = totalAmount;
        let promoDetails = null;

        if (user_promo_code_id) {
            const [userPromoRows] = await db.query(
                `SELECT * FROM user_promo_codes WHERE user_id = ? AND user_promo_code_id = ? LIMIT 1`,
                [user_id, user_promo_code_id]
            );

            if (userPromoRows.length) {
                const promo = userPromoRows[0];

                if (promo.source_type === 'admin') {
                    const [adminPromo] = await db.query(
                        `SELECT * FROM promo_codes WHERE promo_id = ?`,
                        [promo.promo_id]
                    );

                    if (adminPromo.length) {
                        const discountValue = parseFloat(adminPromo[0].discountValue || 0);
                        if (discountValue > 0) {
                            discountedTotal = totalAmount - (totalAmount * discountValue / 100);
                        }

                        promoDetails = {
                            user_promo_code_id: promo.user_promo_code_id,
                            source_type: 'admin',
                            ...adminPromo[0],
                            code: promo.code,
                            usedCount: promo.usedCount,
                            maxUse: promo.maxUse
                        };
                    }
                }
            }
        }

        if (!promoDetails && user_promo_code_id) {
            const [systemPromoRows] = await db.query(
                `SELECT * FROM system_promo_codes WHERE system_promo_code_id = ? AND user_id = ? LIMIT 1`,
                [user_promo_code_id, user_id]
            );

            if (systemPromoRows.length) {
                const sysPromo = systemPromoRows[0];
                const discountValue = parseFloat(sysPromo.discountValue || 0);
                if (discountValue > 0) {
                    discountedTotal = totalAmount - (totalAmount * discountValue / 100);
                }

                promoDetails = { ...sysPromo };
            }
        }

        res.status(200).json({
            message: "Cart fetched successfully",
            cart: {
                ...cart,
                packages: [{ sub_packages: subPackagesStructured }],
                totalAmount,
                discountedTotal
            },
            promo: promoDetails || null
        });

    } catch (err) {
        console.error("Get cart error:", err);
        res.status(500).json({ message: "Failed to fetch cart", error: err.message });
    }
});

const updateCartDetails = asyncHandler(async (req, res) => {
    const { cart_id } = req.params;
    const user_id = req.user.user_id;

    const {
        vendor_id = null,
        bookingDate = null,
        bookingTime = null,
        notes = null,
        promoCode
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    try {
        const fields = [];
        const values = [];

        // ✅ Basic fields
        if (vendor_id !== null) {
            fields.push("vendor_id = ?");
            values.push(vendor_id);
        }
        if (bookingDate !== null) {
            fields.push("bookingDate = ?");
            values.push(bookingDate);
        }
        if (bookingTime !== null) {
            fields.push("bookingTime = ?");
            values.push(bookingTime);
        }
        if (notes !== null) {
            fields.push("notes = ?");
            values.push(notes);
        }
        if (bookingMedia !== null) {
            fields.push("bookingMedia = ?");
            values.push(bookingMedia);
        }

        // ✅ Promo code logic
        if (promoCode !== undefined) {
            if (typeof promoCode === "string" && promoCode.trim() !== "") {
                // Try user promo first
                const [[userPromo]] = await db.query(
                    `SELECT user_promo_code_id AS promo_id, usedCount AS used_count, maxUse AS max_use 
                     FROM user_promo_codes 
                     WHERE user_id = ? AND code = ? LIMIT 1`,
                    [user_id, promoCode]
                );

                let promoId, usedCount, maxUse;

                if (userPromo) {
                    promoId = userPromo.promo_id;
                    usedCount = userPromo.used_count;
                    maxUse = userPromo.max_use;
                } else {
                    // Fallback to system promo
                    const [[systemPromo]] = await db.query(
                        `SELECT system_promo_code_id AS promo_id, usage_count AS used_count, maxUse AS max_use
                         FROM system_promo_codes 
                         WHERE code = ? LIMIT 1`,
                        [promoCode]
                    );

                    if (!systemPromo) {
                        return res.status(400).json({ message: "Promo code not valid" });
                    }

                    promoId = systemPromo.promo_id;
                    usedCount = systemPromo.used_count;
                    maxUse = systemPromo.max_use;
                }

                // Unified usage check
                if (usedCount >= maxUse) {
                    return res.status(400).json({ message: "Promo code has reached its max usage" });
                }

                fields.push("user_promo_code_id = ?");
                values.push(promoId);

            } else if (promoCode === "") {
                // ❌ Remove only if explicitly empty string
                fields.push("user_promo_code_id = NULL");
            }
            // If promoCode is null → do nothing
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }

        const query = `UPDATE service_cart SET ${fields.join(", ")} WHERE cart_id = ? AND user_id = ?`;
        values.push(cart_id, user_id);

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Cart not found" });
        }

        res.status(200).json({ message: "Cart updated successfully" });

    } catch (err) {
        console.error("Cart update error:", err);
        res.status(500).json({ message: "Failed to update cart", error: err.message });
    }
});


const getCartDetails = asyncHandler(async (req, res) => {
    const { cart_id } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT 
                cart_id,
                user_id,
                vendor_id,
                bookingDate,
                bookingTime,
                notes,
                user_promo_code_id,
                bookingMedia,
                bookingStatus,
                created_at
             FROM service_cart
             WHERE cart_id = ?`,
            [cart_id]
        );

        if (rows.length === 0) {
            // ✅ Return a message clearly indicating no cart
            return res.status(200).json({
                message: "No cart found for this package"
            });
        }

        res.status(200).json({
            message: "Cart fetched successfully",
            cart: rows[0]
        });
    } catch (err) {
        console.error("Get cart error:", err);
        res.status(500).json({ message: "Failed to fetch cart", error: err.message });
    }
});

const deleteCartItem = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { cart_id } = req.params;

    if (!cart_id) {
        return res.status(400).json({ message: "cart_id is required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // ✅ Ensure cart belongs to this user
        const [[cart]] = await connection.query(
            "SELECT cart_id FROM service_cart WHERE cart_id = ? AND user_id = ?",
            [cart_id, user_id]
        );

        if (!cart) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Cart item not found" });
        }

        // ✅ Delete all related rows (CASCADE handles if FK is set up)
        await connection.query("DELETE FROM cart_preferences WHERE cart_id = ?", [cart_id]);
        await connection.query("DELETE FROM cart_package_items WHERE cart_id = ?", [cart_id]);
        await connection.query("DELETE FROM cart_addons WHERE cart_id = ?", [cart_id]);
        await connection.query("DELETE FROM cart_packages WHERE cart_id = ?", [cart_id]);
        await connection.query("DELETE FROM service_cart WHERE cart_id = ?", [cart_id]);

        await connection.commit();
        connection.release();

        res.status(200).json({ message: "Cart item deleted successfully" });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Delete cart item error:", err);
        res.status(500).json({ message: "Failed to delete cart item", error: err.message });
    }
});



module.exports = { addToCartService, getUserCart, deleteCartItem, updateCartDetails, getCartDetails, getCartByPackageId };
