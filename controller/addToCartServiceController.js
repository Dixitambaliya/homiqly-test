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
        notes,
        preferences,
        bookingDate,
        bookingTime
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    if (!service_categories_id || !serviceId || !service_type_id || !bookingDate || !bookingTime) {
        return res.status(400).json({ message: "Missing required fields (category, service, service type, booking date & time)." });
    }

    let parsedPackages = [];
    let parsedPreferences = [];

    try {
        parsedPackages = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            return res.status(400).json({ message: "'packages' must be a non-empty array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'packages' must be a valid JSON array.", error: e.message });
    }

    // ✅ Validate all packages and sub_packages before any insert
    for (const pkg of parsedPackages) {
        if (!pkg.package_id) {
            return res.status(400).json({ message: "Each package must include a package_id." });
        }
        if (!Array.isArray(pkg.sub_packages) || pkg.sub_packages.length === 0) {
            return res.status(400).json({ message: `Package ${pkg.package_id} must include at least one sub_package.` });
        }
        for (const item of pkg.sub_packages) {
            if (!item.sub_package_id || item.price == null) {
                return res.status(400).json({ message: `Each sub_package in package ${pkg.package_id} must include sub_package_id and price.` });
            }
        }
    }

    try {
        parsedPreferences = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
        if (parsedPreferences && !Array.isArray(parsedPreferences)) {
            return res.status(400).json({ message: "'preferences' must be a valid array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'preferences' must be a valid JSON array.", error: e.message });
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
                notes || null,
                bookingMedia || null
            ]
        );

        const cart_id = insertCart.insertId;

        // ✅ Step 2: Insert cart_packages and cart_package_items
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages } = pkg;

            await connection.query(
                "INSERT INTO cart_packages (cart_id, package_id) VALUES (?, ?)",
                [cart_id, package_id]
            );

            for (const item of sub_packages) {
                const { sub_package_id, price, quantity = 1 } = item;

                await connection.query(
                    `INSERT INTO cart_package_items
                        (cart_id, sub_package_id, price, package_id, item_id, quantity)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [cart_id, sub_package_id, price, package_id, sub_package_id, quantity]
                );
            }
        }

        // ✅ Step 3 (Optional): Insert preferences
        for (const pref of parsedPreferences || []) {
            const preference_id = typeof pref === 'object' ? pref.preference_id : pref;
            if (!preference_id) continue;

            await connection.query(
                "INSERT INTO cart_preferences (cart_id, preference_id) VALUES (?, ?)",
                [cart_id, preference_id]
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
        // Fetch the latest cart entry for the user
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
                cart_packages.package_id,
                packages.packageName,
                packages.totalPrice,
                packages.totalTime,
                packages.packageMedia
             FROM cart_packages
             JOIN packages ON cart_packages.package_id = packages.package_id
             WHERE cart_packages.cart_id = ?`,
            [cart_id]
        );

        // Fetch all package items linked to the cart
        const [cartPackageItems] = await db.query(
            `SELECT
                cart_package_items.sub_package_id AS item_id,
                package_items.itemName,
                cart_package_items.price,
                cart_package_items.quantity,
                package_items.timeRequired,
                package_items.package_id
             FROM cart_package_items
             JOIN package_items ON cart_package_items.sub_package_id = package_items.item_id
             WHERE cart_package_items.cart_id = ?`,
            [cart_id]
        );

        // Group package items under the correct packages
        const groupedPackages = cartPackages.map(packageData => {
            const subPackagesForThisPackage = cartPackageItems.filter(item => item.package_id === packageData.package_id);
            return {
                ...packageData,
                sub_packages: subPackagesForThisPackage    // ✅ RENAMED
            };
        });

        // Fetch preferences linked to the cart
        const [cartPreferences] = await db.query(
            `SELECT
                cart_preferences.preference_id,
                booking_preferences.preferenceValue
             FROM cart_preferences
             JOIN booking_preferences ON cart_preferences.preference_id = booking_preferences.preference_id
             WHERE cart_preferences.cart_id = ?`,
            [cart_id]
        );

        // Return response
        res.status(200).json({
            message: "Cart retrieved successfully",
            cart: {
                ...cart,
                packages: groupedPackages,
                preferences: cartPreferences.map(preference => ({
                    preference_id: preference.preference_id,
                    preferenceValue: preference.preferenceValue
                }))
            }
        });
    } catch (error) {
        console.error("Error retrieving cart:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const checkoutCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        // STEP 1: Fetch the latest cart
        const [cartRows] = await db.query(
            `SELECT * FROM service_cart WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [user_id]
        );

        if (cartRows.length === 0) {
            return res.status(400).json({ message: "No items in cart" });
        }

        const cart = cartRows[0];
        const cart_id = cart.cart_id;

        // STEP 2: Ensure required cart data exists
        if (!cart.bookingDate || !cart.bookingTime) {
            return res.status(400).json({ message: "Cart does not have booking date/time set." });
        }

        // STEP 3: Fetch packages
        const [packageRows] = await db.query(
            `SELECT package_id FROM cart_packages WHERE cart_id = ?`,
            [cart_id]
        );

        // STEP 4: Fetch sub-packages
        const [itemRows] = await db.query(
            `SELECT sub_package_id, price FROM cart_package_items WHERE cart_id = ?`,
            [cart_id]
        );

        // STEP 5: Fetch preferences
        const [preferenceRows] = await db.query(
            `SELECT preference_id FROM cart_preferences WHERE cart_id = ?`,
            [cart_id]
        );

        // STEP 6: Insert booking
        const [bookingInsert] = await db.query(
            `INSERT INTO service_booking (
                service_categories_id, service_id, vendor_id,
                user_id, bookingDate, bookingTime,
                bookingStatus, notes, bookingMedia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cart.service_categories_id,
                cart.service_id,
                cart.vendor_id,
                user_id,
                cart.bookingDate,
                cart.bookingTime,
                0, // Pending
                cart.notes || null,
                cart.bookingMedia || null
            ]
        );

        const booking_id = bookingInsert.insertId;

        // STEP 7: Insert service type
        await db.query(
            `INSERT INTO service_booking_types (booking_id, service_type_id) VALUES (?, ?)`,
            [booking_id, cart.service_type_id]
        );

        // STEP 8: Insert packages
        for (const pkg of packageRows) {
            await db.query(
                `INSERT INTO service_booking_packages (booking_id, package_id) VALUES (?, ?)`,
                [booking_id, pkg.package_id]
            );
        }

        // STEP 9: Insert sub-packages
        for (const item of itemRows) {
            await db.query(
                `INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, price) VALUES (?, ?, ?)`,
                [booking_id, item.sub_package_id, item.price]
            );
        }

        // STEP 10: Insert preferences
        for (const pref of preferenceRows) {
            await db.query(
                `INSERT INTO service_preferences (booking_id, preference_id) VALUES (?, ?)`,
                [booking_id, pref.preference_id]
            );
        }

        // STEP 11: Clear cart
        await db.query(`DELETE FROM cart_package_items WHERE cart_id = ?`, [cart_id]);
        await db.query(`DELETE FROM cart_preferences WHERE cart_id = ?`, [cart_id]);
        await db.query(`DELETE FROM cart_packages WHERE cart_id = ?`, [cart_id]);
        await db.query(`DELETE FROM service_cart WHERE cart_id = ?`, [cart_id]);

        res.status(200).json({
            message: "Booking created successfully from cart",
            booking_id
        });

    } catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = { addToCartService, getUserCart, checkoutCartService };
