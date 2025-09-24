const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');

const addToCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    const {
        service_id,
        packages,
        preferences = [],
        consents = []
    } = req.body;

    if (!service_id) {
        return res.status(400).json({ message: "service_id is required" });
    }

    if (!packages) {
        return res.status(400).json({
            message: "At least one package is required to add to cart"
        });
    }

    let parsedPackages = [];
    let parsedPreferences = [];
    let parsedConsents = [];

    try {
        parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            return res.status(400).json({ message: "'packages' must be a non-empty array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'packages' must be a valid JSON array.", error: e.message });
    }

    try {
        parsedPreferences = typeof preferences === "string" ? JSON.parse(preferences) : preferences;
    } catch (e) {
        return res.status(400).json({ message: "Invalid preferences JSON", error: e.message });
    }

    try {
        parsedConsents = typeof consents === "string" ? JSON.parse(consents) : consents;
    } catch (e) {
        return res.status(400).json({ message: "Invalid consents JSON", error: e.message });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        let createdOrUpdatedCarts = [];

        // 🔎 Step 0: Get all existing packages in this cart
        const [existingPackages] = await connection.query(
            `SELECT package_id, cart_id 
             FROM service_cart 
             WHERE user_id = ? AND service_id = ? AND bookingStatus = 0`,
            [user_id, service_id]
        );

        const existingPackageIds = existingPackages.map(row => row.package_id);
        const newPackageIds = parsedPackages.map(pkg => pkg.package_id);

        // 🧹 Step 1: Remove packages that are no longer in request
        const packagesToRemove = existingPackageIds.filter(id => !newPackageIds.includes(id));

        for (const packageId of packagesToRemove) {
            const cart = existingPackages.find(row => row.package_id === packageId);
            if (!cart) continue;

            const cart_id = cart.cart_id;

            // delete children first
            await connection.query("DELETE FROM cart_package_items WHERE cart_id = ? AND package_id = ?", [cart_id, packageId]);
            await connection.query("DELETE FROM cart_addons WHERE cart_id = ? AND package_id = ?", [cart_id, packageId]);
            await connection.query("DELETE FROM cart_preferences WHERE cart_id = ? AND package_id = ?", [cart_id, packageId]);
            await connection.query("DELETE FROM cart_consents WHERE cart_id = ? AND package_id = ?", [cart_id, packageId]);
            await connection.query("DELETE FROM cart_packages WHERE cart_id = ? AND package_id = ?", [cart_id, packageId]);

            // finally delete cart row
            await connection.query("DELETE FROM service_cart WHERE cart_id = ?", [cart_id]);
        }

        // 🆕 Step 2: Process incoming packages
        for (const pkg of parsedPackages) {
            const { package_id = null, sub_packages = [], addons = [] } = pkg;

            // check if this cart already exists
            const [existingCart] = await connection.query(
                `SELECT cart_id FROM service_cart 
                 WHERE user_id = ? AND service_id = ? AND package_id = ? AND bookingStatus = 0
                 LIMIT 1`,
                [user_id, service_id, package_id]
            );

            let cart_id;
            if (existingCart.length > 0) {
                cart_id = existingCart[0].cart_id;

                // 🧹 clean old children before inserting new
                await connection.query("DELETE FROM cart_package_items WHERE cart_id = ? AND package_id = ?", [cart_id, package_id]);
                await connection.query("DELETE FROM cart_addons WHERE cart_id = ? AND package_id = ?", [cart_id, package_id]);
                await connection.query("DELETE FROM cart_preferences WHERE cart_id = ? AND package_id = ?", [cart_id, package_id]);
                await connection.query("DELETE FROM cart_consents WHERE cart_id = ? AND package_id = ?", [cart_id, package_id]);

            } else {
                // insert new cart row
                const [insertCart] = await connection.query(
                    `INSERT INTO service_cart (user_id, service_id, package_id, bookingStatus)
                     VALUES (?, ?, ?, ?)`,
                    [user_id, service_id, package_id, 0]
                );
                cart_id = insertCart.insertId;

                // also insert into cart_packages
                await connection.query(
                    "INSERT INTO cart_packages (cart_id, package_id) VALUES (?, ?)",
                    [cart_id, package_id]
                );
            }

            createdOrUpdatedCarts.push(cart_id);

            // insert sub-packages
            for (const item of sub_packages) {
                const { sub_package_id, price = 0, quantity = 1 } = item;
                if (!sub_package_id) continue;

                await connection.query(
                    `INSERT INTO cart_package_items
                     (cart_id, sub_package_id, price, package_id, item_id, quantity)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cart_id, sub_package_id, price, package_id, sub_package_id, quantity]
                );
            }

            // insert addons
            for (const addon of addons) {
                const { addon_id, price = 0 } = addon;
                if (!addon_id) continue;

                await connection.query(
                    "INSERT INTO cart_addons (cart_id, package_id, addon_id, price) VALUES (?, ?, ?, ?)",
                    [cart_id, package_id, addon_id, price]
                );
            }

            // insert preferences
            for (const pref of parsedPreferences) {
                const preference_id = typeof pref === "object" ? pref.preference_id : pref;
                if (!preference_id) continue;

                await connection.query(
                    "INSERT INTO cart_preferences (cart_id, package_id, preference_id) VALUES (?, ?, ?)",
                    [cart_id, package_id, preference_id]
                );
            }

            // insert consents
            for (const consent of parsedConsents) {
                const { consent_id, answer = null } = consent;
                if (!consent_id) continue;

                await connection.query(
                    `INSERT INTO cart_consents (cart_id, package_id, consent_id, answer)
                     VALUES (?, ?, ?, ?)`,
                    [cart_id, package_id, consent_id, answer]
                );
            }
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Cart updated successfully",
            cart_ids: createdOrUpdatedCarts
        });

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
        // ✅ Fetch all carts for the user (latest first)
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
                p.packageName
             FROM service_cart sc
             LEFT JOIN packages p ON sc.package_id = p.package_id
             LEFT JOIN services s ON sc.service_id = s.service_id
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

            // ✅ Sub-packages
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

            // ✅ Addons
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

            // ✅ Preferences
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

            // ✅ Consents
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
                }))
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

        if (cartRows.length === 0) {
            return res.status(204).json({ message: "No cart found for this package" });
        }

        let cart_id = cartRows[0].cart_id;

        // ✅ Fetch sub-packages
        const [subPackages] = await db.query(
            `SELECT 
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
            return res.status(204).json({ message: "Cart not found" });
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
