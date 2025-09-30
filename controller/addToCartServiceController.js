const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');

const addToCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const {
        service_id,
        packages,
        preferences = [],
        consents = [],
        promoCode // Optional
    } = req.body;

    if (!service_id) return res.status(400).json({ message: "service_id is required" });
    if (!packages) return res.status(400).json({ message: "At least one package is required" });

    let parsedPackages = [], parsedPreferences = [], parsedConsents = [];

    // Parse JSON safely
    try { parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages; }
    catch (e) { return res.status(400).json({ message: "'packages' must be valid JSON", error: e.message }); }

    try { parsedPreferences = typeof preferences === "string" ? JSON.parse(preferences) : preferences; }
    catch (e) { return res.status(400).json({ message: "Invalid preferences JSON", error: e.message }); }

    try { parsedConsents = typeof consents === "string" ? JSON.parse(consents) : consents; }
    catch (e) { return res.status(400).json({ message: "Invalid consents JSON", error: e.message }); }

    const connection = await db.getConnection();
    // await connection.query(`SET time_zone = '-04:00';`); // EDT
    await connection.beginTransaction();

    try {
        const createdOrUpdatedCarts = [];

        // Step 0: Fetch promo if provided
        let appliedPromo = null;
        if (promoCode) {
            const [[promo]] = await connection.query(
                `SELECT * FROM promo_codes 
                WHERE code = ? 
                AND (start_date IS NULL OR start_date <= NOW()) 
                AND (end_date IS NULL OR end_date >= NOW())`,
                [promoCode]
            );

            if (!promo) {
                return res.status(400).json({
                    message: "Promo code is expired or not yet active."
                });
            }

            appliedPromo = promo;
        }

        // Step 1: Process each package
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages = [], addons = [] } = pkg;

            // Check if cart exists
            const [existingCart] = await connection.query(
                `SELECT cart_id FROM service_cart WHERE user_id = ? AND service_id = ? AND package_id = ? AND bookingStatus = 0 LIMIT 1`,
                [user_id, service_id, package_id]
            );

            let cart_id;
            if (existingCart.length > 0) {
                cart_id = existingCart[0].cart_id;
            } else {
                // Insert new cart row
                const [insertCart] = await connection.query(
                    `INSERT INTO service_cart (user_id, service_id, package_id, bookingStatus) VALUES (?, ?, ?, 0)`,
                    [user_id, service_id, package_id]
                );
                cart_id = insertCart.insertId;

                await connection.query("INSERT INTO cart_packages (cart_id, package_id) VALUES (?, ?)", [cart_id, package_id]);
            }

            // --- Fetch existing children ---
            const [existingItems] = await connection.query(
                "SELECT sub_package_id FROM cart_package_items WHERE cart_id = ? AND package_id = ?",
                [cart_id, package_id]
            );
            const existingItemIds = existingItems.map(i => i.sub_package_id);

            const [existingAddons] = await connection.query(
                "SELECT addon_id FROM cart_addons WHERE cart_id = ? AND package_id = ?",
                [cart_id, package_id]
            );
            const existingAddonIds = existingAddons.map(a => a.addon_id);

            const [existingPrefs] = await connection.query(
                "SELECT preference_id FROM cart_preferences WHERE cart_id = ? AND package_id = ?",
                [cart_id, package_id]
            );
            const existingPrefIds = existingPrefs.map(p => p.preference_id);

            const [existingConsents] = await connection.query(
                "SELECT consent_id FROM cart_consents WHERE cart_id = ? AND package_id = ?",
                [cart_id, package_id]
            );
            const existingConsentIds = existingConsents.map(c => c.consent_id);

            // --- Delete removed children ---
            const itemsToDelete = existingItemIds.filter(id => !sub_packages.some(p => p.sub_package_id === id));
            if (itemsToDelete.length) await connection.query(
                "DELETE FROM cart_package_items WHERE cart_id = ? AND package_id = ? AND sub_package_id IN (?)",
                [cart_id, package_id, itemsToDelete]
            );

            const addonsToDelete = existingAddonIds.filter(id => !addons.some(a => a.addon_id === id));
            if (addonsToDelete.length) await connection.query(
                "DELETE FROM cart_addons WHERE cart_id = ? AND package_id = ? AND addon_id IN (?)",
                [cart_id, package_id, addonsToDelete]
            );

            const prefsToDelete = existingPrefIds.filter(id => !parsedPreferences.some(p => (typeof p === "object" ? p.preference_id : p) === id));
            if (prefsToDelete.length) await connection.query(
                "DELETE FROM cart_preferences WHERE cart_id = ? AND package_id = ? AND preference_id IN (?)",
                [cart_id, package_id, prefsToDelete]
            );

            const consentsToDelete = existingConsentIds.filter(id => !parsedConsents.some(c => c.consent_id === id));
            if (consentsToDelete.length) await connection.query(
                "DELETE FROM cart_consents WHERE cart_id = ? AND package_id = ? AND consent_id IN (?)",
                [cart_id, package_id, consentsToDelete]
            );

            // --- Insert new children ---
            for (const item of sub_packages) {
                if (!existingItemIds.includes(item.sub_package_id)) {
                    await connection.query(
                        `INSERT INTO cart_package_items (cart_id, sub_package_id, price, package_id, item_id, quantity)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [cart_id, item.sub_package_id, item.price || 0, package_id, item.item_id, item.quantity || 1]
                    );
                }
            }

            for (const addon of addons) {
                if (!existingAddonIds.includes(addon.addon_id)) {
                    await connection.query(
                        "INSERT INTO cart_addons (cart_id, package_id, addon_id, price) VALUES (?, ?, ?, ?)",
                        [cart_id, package_id, addon.addon_id, addon.price || 0]
                    );
                }
            }

            for (const pref of parsedPreferences) {
                const preference_id = typeof pref === "object" ? pref.preference_id : pref;
                if (!existingPrefIds.includes(preference_id)) {
                    await connection.query(
                        "INSERT INTO cart_preferences (cart_id, package_id, preference_id) VALUES (?, ?, ?)",
                        [cart_id, package_id, preference_id]
                    );
                }
            }

            for (const consent of parsedConsents) {
                const { consent_id, answer = null } = consent;
                if (!existingConsentIds.includes(consent_id)) {
                    await connection.query(
                        "INSERT INTO cart_consents (cart_id, package_id, consent_id, answer) VALUES (?, ?, ?, ?)",
                        [cart_id, package_id, consent_id, answer]
                    );
                }
            }

            // --- Update promo code ---
            await connection.query(
                "UPDATE service_cart SET promo_code_id = ? WHERE cart_id = ?",
                [appliedPromo ? appliedPromo.promo_id : null, cart_id]
            );

            createdOrUpdatedCarts.push({ cart_id, promo: appliedPromo ? appliedPromo.code : null });
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
        // Fetch all carts for the user (latest first), including promo code
        const [cartRows] = await db.query(
            `SELECT 
                sc.cart_id,
                sc.service_id,
                s.serviceImage,
                sc.package_id,
                sc.user_id,
                sc.vendor_id,
                sc.bookingStatus,
                sc.notes,
                sc.bookingMedia,
                sc.created_at,
                sc.bookingDate,
                sc.bookingTime,
                p.packageName,
                sc.promo_code_id,
                pc.code AS promoCode,
                pc.discountValue,
                pc.minSpend,
                pc.maxUse
             FROM service_cart sc
             LEFT JOIN packages p ON sc.package_id = p.package_id
             LEFT JOIN services s ON sc.service_id = s.service_id
             LEFT JOIN promo_codes pc ON sc.promo_code_id = pc.promo_id
             WHERE sc.user_id = ?
             ORDER BY sc.created_at DESC`,
            [user_id]
        );

        if (cartRows.length === 0) {
            return res.status(200).json({ message: "Cart is empty", carts: [] });
        }

        let allCarts = [];

        for (const cart of cartRows) {
            const cart_id = cart.cart_id;

            // Sub-packages
            const [cartPackageItems] = await db.query(
                `SELECT
                    cpi.cart_package_items_id,
                    pi.itemName,
                    cpi.price,
                    cpi.quantity,
                    pi.timeRequired,
                    cpi.created_at
                 FROM cart_package_items cpi
                 LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
                 WHERE cpi.cart_id = ?`,
                [cart_id]
            );

            // Addons
            const [cartAddons] = await db.query(
                `SELECT
                    ca.cart_addon_id,
                    a.addonName,
                    ca.price,
                    ca.created_at
                 FROM cart_addons ca
                 LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
                 WHERE ca.cart_id = ?`,
                [cart_id]
            );

            // Preferences
            const [cartPreferences] = await db.query(
                `SELECT
                    cp.cart_preference_id,
                    bp.preferenceValue,
                    cp.created_at
                 FROM cart_preferences cp
                 LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
                 WHERE cp.cart_id = ?`,
                [cart_id]
            );

            // Consents
            const [cartConsents] = await db.query(
                `SELECT
                    cc.cart_consent_id,
                    c.question,
                    cc.answer,
                    cc.created_at
                 FROM cart_consents cc
                 LEFT JOIN package_consent_forms c ON cc.consent_id = c.consent_id
                 WHERE cc.cart_id = ?`,
                [cart_id]
            );

            allCarts.push({
                ...cart,
                sub_packages: cartPackageItems,
                addons: cartAddons,
                preferences: cartPreferences.map(pref => ({
                    cart_preference_id: pref.cart_preference_id,
                    preferenceValue: pref.preferenceValue
                })),
                consents: cartConsents.map(con => ({
                    consent_id: con.consent_id,
                    consentText: con.question,
                    answer: con.answer
                })),
                promo: cart.promoCode
                    ? {
                        promo_id: cart.promo_code_id,
                        code: cart.promoCode,
                        discountValue: cart.discountValue,
                        minSpend: cart.minSpend,
                        maxUse: cart.maxUse
                    }
                    : null
            });
        }

        res.status(200).json({
            message: "Cart retrieved successfully",
            carts: allCarts
        });

    } catch (error) {
        console.error("Error retrieving cart:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getCartByPackageId = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { package_id } = req.params; // 🔑 package_id from URL param

    if (!package_id) {
        return res.status(400).json({ message: "package_id is required" });
    }

    try {
        // ✅ Fetch cart row(s) for the user and package
        const [cartRows] = await db.query(
            `SELECT sc.cart_id, sc.user_id, sc.service_id, sc.package_id, sc.bookingStatus
             FROM service_cart sc
             WHERE sc.user_id = ? AND sc.package_id = ?`,
            [user_id, package_id]
        );


        console.log(cartRows);

        if (cartRows.length === 0) {
            // ✅ Return a message clearly indicating no cart
            return res.status(200).json({
                message: "No cart found for this package"
            });
        }

        let cart_id = cartRows[0].cart_id;

        // ✅ Fetch sub-packages
        const [subPackages] = await db.query(
            `SELECT 
            pt.item_id,
            cpi.cart_package_items_id, 
            pt.itemName,
            pt.description,
            cpi.price, 
            cpi.quantity
             FROM cart_package_items cpi
             LEFT JOIN package_items pt ON cpi.sub_package_id = pt.item_id
             WHERE cpi.cart_id = ? AND cpi.package_id = ?`,
            [cart_id, package_id]
        );

        // ✅ Fetch addons
        const [addons] = await db.query(
            `SELECT 
            pa.addon_id,
            ca.cart_addon_id, 
            pa.addonName,
            pa.addonDescription,
            ca.price
             FROM cart_addons ca
             LEFT JOIN package_addons pa ON ca.addon_id = pa.addon_id
             WHERE ca.cart_id = ? AND ca.package_id = ?`,
            [cart_id, package_id]
        );

        // ✅ Fetch preferences
        const [preferences] = await db.query(
            `SELECT 
             bp.preference_id,
             cp.cart_preference_id, 
             bp.preferenceValue
             FROM cart_preferences cp
             LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id 
             WHERE cp.cart_id = ? AND cp.package_id = ?`,
            [cart_id, package_id]
        );

        // ✅ Fetch consents
        const [consents] = await db.query(
            `SELECT 
            pcf.consent_id,
            cc.cart_consent_id,
            pcf.question, 
            cc.answer
             FROM cart_consents cc
             LEFT JOIN package_consent_forms pcf ON pcf.consent_id = cc.consent_id
             WHERE cc.cart_id = ? AND cc.package_id = ?`,
            [cart_id, package_id]
        );

        // ✅ Build response
        res.status(200).json({
            message: "Cart fetched successfully",
            cart: {
                ...cartRows[0],
                sub_packages: subPackages,
                addons,
                preferences,
                consents
            }
        });

    } catch (err) {
        console.error("Get cart error:", err);
        res.status(500).json({ message: "Failed to fetch cart", error: err.message });
    }
});

const updateCartDetails = asyncHandler(async (req, res) => {
    const { cart_id } = req.params;

    // fields you want to allow updating
    const {
        vendor_id = null,
        bookingDate = null,
        bookingTime = null,
        notes = null
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    try {
        // ✅ Build dynamic SET clause
        const fields = [];
        const values = [];

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

        if (fields.length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }

        const query = `UPDATE service_cart SET ${fields.join(", ")} WHERE cart_id = ?`;
        values.push(cart_id);

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
