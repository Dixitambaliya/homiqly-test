const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');

const addToCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    const {
        service_categories_id,
        serviceId,
        service_type_id,
        packages,
        notes = null,
        bookingDate = null,
        bookingTime = null,
        vendor_id = null,
        preferences = [],
        consents = []
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    // ✅ Validate required fields
    if (!service_categories_id || !serviceId || !service_type_id || !packages) {
        return res.status(400).json({
            message: "Missing required fields: service_categories_id, serviceId, service_type_id, packages"
        });
    }

    let parsedPackages = [];
    let parsedPreferences = [];
    let parsedConsents = [];

    // Parse & validate packages
    try {
        parsedPackages = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            return res.status(400).json({ message: "'packages' must be a non-empty array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'packages' must be a valid JSON array.", error: e.message });
    }

    // Parse preferences & consents
    try {
        parsedPreferences = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
        parsedConsents = typeof consents === 'string' ? JSON.parse(consents) : consents;
    } catch (e) {
        return res.status(400).json({ message: "Invalid preferences/consents JSON", error: e.message });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // ✅ Step 1: Insert into service_cart
        const [insertCart] = await connection.query(
            `INSERT INTO service_cart (
                user_id, vendor_id, service_id, service_type_id,
                service_categories_id, bookingDate, bookingTime,
                bookingStatus, notes, bookingMedia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                vendor_id,
                serviceId,
                service_type_id,
                service_categories_id,
                bookingDate,
                bookingTime,
                0,
                notes,
                bookingMedia
            ]
        );

        const cart_id = insertCart.insertId;

        // ✅ Step 2: Insert packages
        for (const pkg of parsedPackages) {
            const {
                package_id = null,
                sub_packages = [],
                addons = []
            } = pkg;

            // Insert into cart_packages
            await connection.query(
                "INSERT INTO cart_packages (cart_id, package_id) VALUES (?, ?)",
                [cart_id, package_id]
            );

            // ✅ Insert sub-packages
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

            // ✅ Insert addons
            for (const addon of addons) {
                const { addon_id, price = 0 } = addon;
                if (!addon_id) continue;

                await connection.query(
                    "INSERT INTO cart_addons (cart_id, package_id, addon_id, price) VALUES (?, ?, ?, ?)",
                    [cart_id, package_id, addon_id, price]
                );
            }
        }

        // ✅ Step 3: Insert preferences (applied to cart)
        for (const pref of parsedPreferences) {
            const preference_id = typeof pref === 'object' ? pref.preference_id : pref;
            if (!preference_id) continue;

            await connection.query(
                "INSERT INTO cart_preferences (cart_id, preference_id) VALUES (?, ?)",
                [cart_id, preference_id]
            );
        }

        // ✅ Step 4: Insert consents (applied to cart)
        for (const consent of parsedConsents) {
            const { consent_id, answer = null } = consent;
            if (!consent_id) continue;

            await connection.query(
                `INSERT INTO cart_consents (cart_id, consent_id, answer)
                 VALUES (?, ?, ?)`,
                [cart_id, consent_id, answer]
            );
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Service added to cart successfully",
            cart_id
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Cart insert error:", err);
        res.status(500).json({ message: "Failed to add service to cart", error: err.message });
    }
});

const getUserCart = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    try {
        // Fetch the latest cart for the user
        const [cartRows] = await db.query(
            `SELECT * FROM service_cart WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [user_id]
        );
        if (cartRows.length === 0) {
            return res.status(200).json({ message: "Cart is empty", cart: null });
        }
        const cart = cartRows[0];
        const cart_id = cart.cart_id;

        // Fetch all packages linked to the cart
        const [cartPackages] = await db.query(
            `SELECT
                cp.package_id,
             FROM cart_packages cp
             LEFT JOIN packages p ON cp.package_id = p.package_id
             WHERE cp.cart_id = ?`,
            [cart_id]
        );

        // Fetch all sub-packages linked to the cart
        const [cartPackageItems] = await db.query(
            `SELECT
                cpi.sub_package_id AS item_id,
                pi.itemName,
                cpi.price,
                cpi.quantity,
                pi.timeRequired,
                cpi.package_id
             FROM cart_package_items cpi
             LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
             WHERE cpi.cart_id = ?`,
            [cart_id]
        );

        // Fetch all addons linked to the cart
        const [cartAddons] = await db.query(
            `SELECT
                ca.addon_id,
                a.addonName,
                ca.price,
                ca.package_id 
             FROM cart_addons ca
             LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
             WHERE ca.cart_id = ?`,
            [cart_id]
        );

        // Fetch all preferences linked to the cart (per package)
        const [cartPreferences] = await db.query(
            `SELECT
                cp.package_id,
                cp.preference_id,
                bp.preferenceValue
             FROM cart_preferences cp
             LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
             WHERE cp.cart_id = ?`,
            [cart_id]
        );

        // Fetch all consents linked to the cart (per package)
        const [cartConsents] = await db.query(
            `SELECT
                cc.package_id,
                cc.consent_id,
                c.question,
                cc.answer
             FROM cart_consents cc
             LEFT JOIN package_consent_forms c ON cc.consent_id = c.consent_id
             WHERE cc.cart_id = ?`,
            [cart_id]
        );

        // Group sub-packages, addons, preferences, and consents under each package
        const groupedPackages = cartPackages.map(pkg => {
            const sub_packages = cartPackageItems
                .filter(item => item.package_id === pkg.package_id)
                .map(item => ({
                    ...item
                }));
            const addons = cartAddons
                .filter(addon => addon.package_id === pkg.package_id)
                .map(addon => ({
                    ...addon
                }));
            const preferences = cartPreferences
                .filter(pref => pref.package_id === pkg.package_id)
                .map(pref => ({
                    preference_id: pref.preference_id,
                    preferenceValue: pref.preferenceValue
                }));
            const consents = cartConsents
                .filter(con => con.package_id === pkg.package_id)
                .map(con => ({
                    consent_id: con.consent_id,
                    consentText: con.question,
                    answer: con.answer
                }));
            return {
                ...pkg,
                sub_packages,
                addons,
                preferences,
                consents
            };
        });

        // Return response
        res.status(200).json({
            message: "Cart retrieved successfully",
            cart: {
                ...cart,
                packages: groupedPackages
            }
        });
    } catch (error) {
        console.error("Error retrieving cart:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const checkoutCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { cart_id } = req.params; // ✅ pass cart_id in URL

    if (!cart_id) {
        return res.status(400).json({ message: "cart_id is required" });
    }

    const connection = await db.getConnection();
    let booking_id;

    try {
        await connection.beginTransaction();

        // ✅ 1. Get cart data
        const [cartRows] = await connection.query(
            `SELECT * FROM service_cart WHERE cart_id=? AND user_id=?`,
            [cart_id, user_id]
        );
        if (!cartRows.length) {
            throw new Error("Cart not found or not owned by user");
        }
        const cart = cartRows[0];

        // ✅ 2. Create booking
        const [insertBooking] = await connection.query(
            `INSERT INTO service_bookings (
                service_categories_id, serviceId, user_id, bookingDate, bookingTime,
                vendor_id, notes, bookingMedia, bookingStatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                cart.service_categories_id,
                cart.service_id,
                user_id,
                cart.bookingDate,
                cart.bookingTime,
                cart.vendor_id || 0,
                cart.notes || null,
                cart.bookingMedia || null
            ]
        );
        booking_id = insertBooking.insertId;

        // ✅ 3. Link service type
        await connection.query(
            `INSERT INTO service_booking_types (booking_id, service_type_id) VALUES (?, ?)`,
            [booking_id, cart.service_type_id]
        );

        // ✅ 4. Copy cart packages → booking packages
        const [cartPackages] = await connection.query(
            `SELECT * FROM cart_packages WHERE cart_id=?`,
            [cart_id]
        );

        for (const pkg of cartPackages) {
            await connection.query(
                `INSERT INTO service_booking_packages (booking_id, package_id) VALUES (?, ?)`,
                [booking_id, pkg.package_id]
            );

            // sub-packages
            const [cartItems] = await connection.query(
                `SELECT * FROM cart_package_items WHERE cart_id=? AND package_id=?`,
                [cart_id, pkg.package_id]
            );
            for (const item of cartItems) {
                await connection.query(
                    `INSERT INTO service_booking_items (booking_id, sub_package_id, price, quantity) 
                     VALUES (?, ?, ?, ?)`,
                    [booking_id, item.sub_package_id, item.price, item.quantity || 1]
                );
            }

            // addons
            const [cartAddons] = await connection.query(
                `SELECT * FROM cart_addons WHERE cart_id=? AND package_id=?`,
                [cart_id, pkg.package_id]
            );
            for (const addon of cartAddons) {
                await connection.query(
                    `INSERT INTO service_booking_addons (booking_id, package_id, addon_id, price) 
                     VALUES (?, ?, ?, ?)`,
                    [booking_id, pkg.package_id, addon.addon_id, addon.price]
                );
            }
        }

        // ✅ 5. Copy preferences
        const [cartPrefs] = await connection.query(
            `SELECT * FROM cart_preferences WHERE cart_id=?`,
            [cart_id]
        );
        for (const pref of cartPrefs) {
            await connection.query(
                `INSERT INTO service_booking_preferences (booking_id, preference_id) VALUES (?, ?)`,
                [booking_id, pref.preference_id]
            );
        }

        // ✅ 6. Clear cart (optional)
        await connection.query(`DELETE FROM service_cart WHERE cart_id=?`, [cart_id]);

        await connection.commit();

        // ✅ return booking_id for payment flow
        res.status(200).json({
            message: "Cart checked out successfully, booking created.",
            booking_id,
            payment_status: "pending"
        });

    } catch (err) {
        await connection.rollback();
        console.error("Checkout cart error:", err);
        res.status(500).json({ message: "Failed to checkout cart", error: err.message });
    } finally {
        connection.release();
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



module.exports = { addToCartService, getUserCart, checkoutCartService, deleteCartItem };
