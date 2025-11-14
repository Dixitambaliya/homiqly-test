const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const { recalculateCartTotals } = require("./cartCalculation")
const moment = require("moment-timezone");

const addToCartService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    const { service_id, service_type_id, packages, preferences, consents } = req.body;

    if (!service_id)
        return res.status(400).json({ message: "service_id is required" });
    if (!service_type_id)
        return res.status(400).json({ message: "service_type_id is required" });

    // Parse packages if sent as JSON string
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

        // Check if cart exists
        const [existingCart] = await connection.query(
            `SELECT cart_id, totalTime FROM service_cart
             WHERE user_id = ? AND service_id = ? AND service_type_id = ? AND bookingStatus = 0
             LIMIT 1`,
            [user_id, service_id, service_type_id]
        );

        let cart_id = existingCart.length ? existingCart[0].cart_id : null;
        let totalCartTime = existingCart.length ? Number(existingCart[0].totalTime) || 0 : 0;

        // Create new cart if not exists
        if (!cart_id) {
            const [insertCart] = await connection.query(
                `INSERT INTO service_cart (user_id, service_id, service_type_id, bookingStatus, totalTime)
                 VALUES (?, ?, ?, 0, 0)`,
                [user_id, service_id, service_type_id]
            );
            cart_id = insertCart.insertId;
            totalCartTime = 0;
        }

        // Loop through packages
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages, addons: packageAddons } = pkg;

            if (Array.isArray(sub_packages)) {
                for (const sub of sub_packages) {
                    const sub_package_id = sub.sub_package_id;
                    const quantity = sub.quantity || 1;
                    const price = sub.price || 0;

                    // Insert sub-package
                    const [insertSub] = await connection.query(
                        `INSERT INTO cart_package_items (cart_id, package_id, sub_package_id, price, quantity)
                         VALUES (?, ?, ?, ?, ?)`,
                        [cart_id, package_id, sub_package_id, price, quantity]
                    );
                    const cart_package_items_id = insertSub.insertId;

                    // Fetch sub-package time
                    const [[itemTimeRow]] = await connection.query(
                        `SELECT timeRequired FROM package_items WHERE item_id = ?`,
                        [sub_package_id]
                    );
                    const itemTime = (itemTimeRow?.timeRequired || 0) * quantity;
                    totalCartTime += itemTime;

                    // Attach preferences
                    if (Array.isArray(preferences)) {
                        for (const pref of preferences) {
                            await connection.query(
                                `INSERT INTO cart_preferences (cart_id, cart_package_items_id, sub_package_id, preference_id)
                                 VALUES (?, ?, ?, ?)`,
                                [cart_id, cart_package_items_id, sub_package_id, pref.preference_id]
                            );
                        }
                    }

                    // Attach package-level addons
                    if (Array.isArray(packageAddons)) {
                        for (const addon of packageAddons) {
                            await connection.query(
                                `INSERT INTO cart_addons (cart_id, cart_package_items_id, sub_package_id, addon_id, price)
                                 VALUES (?, ?, ?, ?, ?)`,
                                [cart_id, cart_package_items_id, sub_package_id, addon.addon_id, addon.price || 0]
                            );

                            // Add addon time
                            const [[addonTimeRow]] = await connection.query(
                                `SELECT addonTime FROM package_addons WHERE addon_id = ?`,
                                [addon.addon_id]
                            );
                            const addonTime = (addonTimeRow?.addonTime || 0) * quantity;
                            totalCartTime += addonTime;
                        }
                    }

                    // Attach consents
                    if (Array.isArray(consents)) {
                        for (const consent of consents) {
                            await connection.query(
                                `INSERT INTO cart_consents (cart_id, cart_package_items_id, sub_package_id, consent_id, answer)
                                 VALUES (?, ?, ?, ?, ?)`,
                                [cart_id, cart_package_items_id, sub_package_id, consent.consent_id, consent.answer || null]
                            );
                        }
                    }
                }
            }
        }

        // Update totalTime in service_cart (incremental)
        await connection.query(
            `UPDATE service_cart SET totalTime = ? WHERE cart_id = ?`,
            [totalCartTime, cart_id]
        );

        createdOrUpdatedCarts.push({ cart_id, totalTime: totalCartTime });

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Cart updated successfully. Each sub-package isolated with its preferences/addons/consents.",
            carts: createdOrUpdatedCarts
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Cart insert/update error:", err);
        res.status(500).json({ message: "Failed to add service to cart", error: err.message });
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
        let userPromoCodeId = null;
        let promoDetails = null;
        let promoDiscount = 0;

        // 1️⃣ Calculate cart total dynamically
        const [subPackages] = await db.query(
            `SELECT cpi.cart_package_items_id, cpi.price, cpi.quantity
             FROM cart_package_items cpi
             WHERE cpi.cart_id = ?`,
            [cart_id]
        );

        if (!subPackages.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const cartPackageItemIds = subPackages.map(sp => sp.cart_package_items_id);

        const [addons] = await db.query(
            `SELECT ca.cart_package_items_id, ca.price
             FROM cart_addons ca
             WHERE ca.cart_id = ? AND ca.cart_package_items_id IN (?)`,
            [cart_id, cartPackageItemIds]
        );

        const [preferences] = await db.query(
            `SELECT cp.cart_package_items_id, bp.preferencePrice
             FROM cart_preferences cp
             JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
             WHERE cp.cart_id = ? AND cp.cart_package_items_id IN (?)`,
            [cart_id, cartPackageItemIds]
        );

        // Map addons and prefs
        const addonsMap = addons.reduce((acc, a) => {
            acc[a.cart_package_items_id] = (acc[a.cart_package_items_id] || 0) + parseFloat(a.price || 0);
            return acc;
        }, {});
        const prefsMap = preferences.reduce((acc, p) => {
            acc[p.cart_package_items_id] = (acc[p.cart_package_items_id] || 0) + parseFloat(p.preferencePrice || 0);
            return acc;
        }, {});

        // Total calculation
        let totalAmount = 0;
        for (const sp of subPackages) {
            const basePrice = parseFloat(sp.price) || 0;
            const quantity = parseInt(sp.quantity) || 1;
            const addonTotal = addonsMap[sp.cart_package_items_id] || 0;
            const prefTotal = prefsMap[sp.cart_package_items_id] || 0;
            totalAmount += (basePrice + addonTotal + prefTotal) * quantity;
        }

        // 2️⃣ Validate promo code if provided
        if (promoCode && typeof promoCode === "string" && promoCode.trim() !== "") {

            // Mountain Time NOW
            const nowMT = moment().tz("America/Edmonton");

            // 1️⃣ Try User Promo Code (admin promo)
            const [[userPromo]] = await db.query(
                `SELECT upc.user_promo_code_id, upc.promo_id, upc.usedCount, 
                pc.minSpend, pc.start_date, pc.end_date, 
                pc.discountValue, pc.discount_type, pc.maxUse
                FROM user_promo_codes upc
                LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
                WHERE upc.user_id = ? AND upc.code = ?
                LIMIT 1`,
                [user_id, promoCode]
            );

            if (userPromo) {
                // DATE CHECK
                const start = moment.tz(userPromo.start_date, "America/Edmonton");
                const end = moment.tz(userPromo.end_date, "America/Edmonton");

                if (!nowMT.isBetween(start, end, undefined, "[]")) {
                    return res.status(400).json({ message: "Promo code is expired" });
                }

                // USAGE CHECK
                if (userPromo.usedCount >= userPromo.maxUse) {
                    return res.status(400).json({ message: "Promo code has reached its max usage" });
                }

                // MIN SPEND CHECK
                if (totalAmount < parseFloat(userPromo.minSpend || 0)) {
                    return res.status(400).json({ message: `Minimum spend must be ${userPromo.minSpend}` });
                }

                // APPLY DISCOUNT
                userPromoCodeId = userPromo.user_promo_code_id;
                promoDetails = { ...userPromo, source_type: "admin" };

                promoDiscount = userPromo.discount_type === "fixed"
                    ? parseFloat(userPromo.discountValue)
                    : (totalAmount * parseFloat(userPromo.discountValue)) / 100;

            } else {

                // 2️⃣ Try System Promo Code (system promo)
                const [[systemPromo]] = await db.query(
                    `SELECT spc.system_promo_code_id, st.minSpend,
                    st.discountValue, st.discount_type, st.maxUse,
                    spc.usage_count AS usedCount, st.is_active
                    FROM system_promo_codes spc
                    JOIN system_promo_code_templates st 
                        ON spc.template_id = st.system_promo_code_template_id
                    WHERE st.code = ? AND spc.user_id = ?
                    LIMIT 1`,
                    [promoCode, user_id]
                );

                if (!systemPromo) {
                    return res.status(400).json({ message: "Promo code not valid" });
                }

                // ACTIVE CHECK
                if (systemPromo.is_active !== 1) {
                    return res.status(400).json({ message: "Promo code is no longer active" });
                }

                // USAGE CHECK
                if (systemPromo.usedCount >= systemPromo.maxUse) {
                    return res.status(400).json({ message: "Promo code has reached its max usage" });
                }

                // MIN SPEND CHECK
                if (totalAmount < parseFloat(systemPromo.minSpend || 0)) {
                    return res.status(400).json({ message: `Minimum spend must be ${systemPromo.minSpend}` });
                }

                // APPLY DISCOUNT
                userPromoCodeId = systemPromo.system_promo_code_id;
                promoDetails = { ...systemPromo, source_type: "system" };

                promoDiscount = systemPromo.discount_type === "fixed"
                    ? parseFloat(systemPromo.discountValue)
                    : (totalAmount * parseFloat(systemPromo.discountValue)) / 100;
            }
        }


        // 3️⃣ Update cart fields
        const fields = [];
        const values = [];

        if (bookingDate !== null) { fields.push("bookingDate = ?"); values.push(bookingDate); }
        if (bookingTime !== null) { fields.push("bookingTime = ?"); values.push(bookingTime); }
        if (notes !== null) { fields.push("notes = ?"); values.push(notes); }
        if (bookingMedia !== null) { fields.push("bookingMedia = ?"); values.push(bookingMedia); }
        if (userPromoCodeId !== null) { fields.push("user_promo_code_id = ?"); values.push(userPromoCodeId); }
        else if (promoCode === "") { fields.push("user_promo_code_id = NULL"); }
        if (vendor_id) { fields.push("vendor_id = ?"); values.push(vendor_id); }

        if (fields.length > 0) {
            const query = `UPDATE service_cart SET ${fields.join(", ")} WHERE cart_id = ? AND user_id = ?`;
            values.push(cart_id, user_id);
            await db.query(query, values);
        }

        // 4️⃣ Handle vendor not selected → create inquiry
        if (!vendor_id) {
            const [existingInquiry] = await db.query(
                `SELECT inquiry_id FROM admin_inquiries WHERE cart_id = ? LIMIT 1`,
                [cart_id]
            );

            if (!existingInquiry.length) {
                await db.query(
                    `INSERT INTO admin_inquiries (user_id, cart_id) VALUES (?, ?)`,
                    [user_id, cart_id]
                );
            }

            return res.status(200).json({
                message: "No vendor selected. Inquiry created and linked to your cart.",
            });
        }

        // ✅ Step 5: Vendor selected → normal response
        res.status(200).json({
            message: "Cart updated successfully"
        });

    } catch (err) {
        console.error("Cart update error:", err);
        res.status(500).json({ message: "Failed to update cart", error: err.message });
    }
});

const updateCartItemQuantity = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    const { cart_package_items_id } = req.params;
    const { quantity } = req.body;

    if (!cart_package_items_id || quantity == null || quantity < 1) {
        return res.status(400).json({ message: "Invalid cart_package_items_id or quantity" });
    }

    try {
        // 1️⃣ Find the user's cart first (optional safety check)
        const [[cart]] = await db.query(
            `SELECT cart_id FROM service_cart WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
            [user_id]
        );

        if (!cart) {
            return res.status(404).json({ message: "Cart not found for this user" });
        }

        const cart_id = cart.cart_id;

        // 2️⃣ Update the quantity in cart_package_items
        const [result] = await db.query(
            `UPDATE cart_package_items
             SET quantity = ?
             WHERE cart_package_items_id = ? AND cart_id = ?`,
            [quantity, cart_package_items_id, cart_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Item not found in cart" });
        }

        res.status(200).json({
            message: "Cart item quantity updated successfully",
            cart_package_items_id,
            quantity,
        });

    } catch (err) {
        console.error("❌ Error updating cart item quantity:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message,
        });
    }
});

const getAdminInquiries = asyncHandler(async (req, res) => {
    try {
        // 1️⃣ Fetch all carts with no vendor assigned
        const [inquiryRows] = await db.query(`
            SELECT
                sc.cart_id,
                sc.service_id,
                sc.user_id,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,
                u.email AS userEmail,
                u.phone AS userPhone,
                sc.vendor_id,
                sc.bookingStatus,
                sc.notes,
                sc.bookingMedia,
                sc.created_at,
                sc.bookingDate,
                sc.bookingTime,
                sc.user_promo_code_id
            FROM service_cart sc
            LEFT JOIN users u ON sc.user_id = u.user_id
            WHERE sc.vendor_id IS NULL
            ORDER BY sc.created_at DESC
        `);

        if (!inquiryRows.length) {
            return res.status(200).json({ message: "No admin inquiries found", inquiries: [] });
        }

        const allInquiries = [];
        const promos = [];

        for (const cart of inquiryRows) {
            const { cart_id } = cart;

            // 🧩 Fetch Sub-Packages
            const [subPackages] = await db.query(`
                SELECT
                    cpi.cart_package_items_id,
                    cpi.sub_package_id,
                    cpi.cart_id,
                    pi.itemName,
                    pi.itemMedia,
                    pi.package_id,
                    cpi.price,
                    cpi.quantity,
                    pi.timeRequired
                FROM cart_package_items cpi
                LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
                WHERE cpi.cart_id = ?`, [cart_id]
            );

            // 🧩 Fetch Addons
            const [addons] = await db.query(`
                SELECT ca.sub_package_id, a.addonName, ca.price
                FROM cart_addons ca
                JOIN package_addons a ON ca.addon_id = a.addon_id
                WHERE ca.cart_id = ?`, [cart_id]
            );

            // 🧩 Fetch Preferences
            const [preferences] = await db.query(`
                SELECT cp.cart_preference_id, cp.sub_package_id, bp.preferenceValue, bp.preferencePrice
                FROM cart_preferences cp
                JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
                WHERE cp.cart_id = ?`, [cart_id]
            );

            // 🧩 Fetch Consents
            const [consents] = await db.query(`
                SELECT cc.cart_consent_id, cc.sub_package_id, c.question, cc.answer
                FROM cart_consents cc
                JOIN package_consent_forms c ON cc.consent_id = c.consent_id
                WHERE cc.cart_id = ?`, [cart_id]
            );

            // 🧩 Group Addons, Preferences, Consents by Sub-Package
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

            // 🧩 Structure Sub-Packages with totals
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

            // 🧩 Fetch Packages for this cart
            const packageIds = [...new Set(subPackagesStructured.map(sp => sp.package_id).filter(Boolean))];

            const packagesStructured = [];

            for (const pkgId of packageIds) {
                // Get package details
                const [packageRows] = await db.query(`
                    SELECT package_id, packageName, service_type_id
                    FROM packages
                    WHERE package_id = ? LIMIT 1
                `, [pkgId]);

                if (!packageRows.length) continue;

                const pkg = packageRows[0];

                // Group sub-packages under this package
                const subPackagesForPkg = subPackagesStructured.filter(sp => sp.package_id === pkg.package_id);

                packagesStructured.push({
                    ...pkg,
                    sub_packages: subPackagesForPkg
                });
            }

            // 🧩 Calculate total amount for cart
            const totalAmount = subPackagesStructured.reduce((sum, sp) => sum + sp.total, 0);

            // 💸 Promo Logic
            let discountedTotal = totalAmount;
            let promoDetails = null;

            if (cart.user_promo_code_id) {
                // Try admin promo via user_promo_codes
                const [userPromoRows] = await db.query(`
                    SELECT upc.*, pc.discountValue, pc.discount_type, pc.description
                    FROM user_promo_codes upc
                    LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
                    WHERE upc.user_promo_code_id = ? LIMIT 1
                `, [cart.user_promo_code_id]);

                if (userPromoRows.length) {
                    const promo = userPromoRows[0];
                    const discountValue = parseFloat(promo.discountValue || 0);
                    const discountType = promo.discount_type || 'percentage';

                    discountedTotal =
                        discountType === 'fixed'
                            ? Math.max(0, totalAmount - discountValue)
                            : totalAmount - (totalAmount * discountValue / 100);

                    promoDetails = { ...promo, source_type: 'admin' };
                }

                // If no admin promo, check system promo
                if (!promoDetails) {
                    const [systemPromoRows] = await db.query(`
                        SELECT sc.*, st.discount_type, st.discountValue, st.description
                        FROM system_promo_codes sc
                        JOIN system_promo_code_templates st
                        ON sc.template_id = st.system_promo_code_template_id
                        WHERE sc.system_promo_code_id = ? LIMIT 1
                    `, [cart.user_promo_code_id]);

                    if (systemPromoRows.length) {
                        const sysPromo = systemPromoRows[0];
                        const discountValue = parseFloat(sysPromo.discountValue || 0);
                        const discountType = sysPromo.discount_type || 'percentage';

                        discountedTotal =
                            discountType === 'fixed'
                                ? Math.max(0, totalAmount - discountValue)
                                : totalAmount - (totalAmount * discountValue / 100);

                        promoDetails = { ...sysPromo, source_type: 'system' };
                    }
                }

                if (promoDetails) promos.push(promoDetails);
            }

            allInquiries.push({
                ...cart,
                packages: packagesStructured,
                totalAmount,
                discountedTotal
            });
        }

        res.status(200).json({
            message: "Admin inquiry carts retrieved successfully",
            inquiries: allInquiries,
            promos
        });

    } catch (error) {
        console.error("Error retrieving admin inquiries:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


const getUserCart = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const [carts] = await db.query(
            `SELECT * FROM service_cart WHERE user_id = ? ORDER BY created_at DESC`,
            [user_id]
        );

        if (!carts.length)
            return res.status(200).json({ message: "Cart is empty", carts: [], promos: [] });

        const allCarts = [];
        const promos = [];

        for (const cart of carts) {
            const recalculated = await recalculateCartTotals(cart.cart_id, user_id);
            if (!recalculated) continue;

            const {
                totalAmount,
                discountedTotal,
                promoDiscount,
                taxAmount,
                finalTotal,
                taxName,
                taxPercentage,
                detailedSubPackages,
                promoDetails
            } = recalculated;

            if (promoDetails) promos.push(promoDetails);

            const cartPackageItemIds = detailedSubPackages.map(sp => sp.cart_package_items_id);

            // 🔹 Fetch additional details
            const [details] = await db.query(`
                SELECT cpi.cart_package_items_id, pi.itemName, pi.itemMedia, pi.timeRequired,
                       s.serviceName, s.serviceImage
                FROM cart_package_items cpi
                LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
                LEFT JOIN packages p ON pi.package_id = p.package_id
                LEFT JOIN service_type st ON p.service_type_id = st.service_type_id
                LEFT JOIN services s ON st.service_id = s.service_id
                WHERE cpi.cart_package_items_id IN (?)
            `, [cartPackageItemIds]);

            const [consents] = await db.query(`
                SELECT cc.cart_package_items_id, cc.answer, c.question AS consentText
                FROM cart_consents cc
                JOIN package_consent_forms c ON cc.consent_id = c.consent_id
                WHERE cc.cart_id = ? AND cc.cart_package_items_id IN (?)
            `, [cart.cart_id, cartPackageItemIds]);

            const consentsByItem = consents.reduce((acc, c) => {
                (acc[c.cart_package_items_id] = acc[c.cart_package_items_id] || []).push(c);
                return acc;
            }, {});

            // ✅ Merge + show multiplied price (price * quantity)
            const merged = detailedSubPackages.map(sp => {
                const info = details.find(d => d.cart_package_items_id === sp.cart_package_items_id);
                const multipliedPrice = (parseFloat(sp.price) || 0) * (parseInt(sp.quantity) || 1);

                return {
                    ...sp,
                    ...info,
                    price: multipliedPrice.toFixed(2), // show final multiplied price
                    addons: (sp.addons || []).map(a => ({
                        addon_id: a.addon_id,
                        addonName: a.addonName,
                        price: a.price // already multiplied
                    })),
                    preferences: (sp.preferences || []).map(p => ({
                        preference_id: p.preference_id,
                        preferenceValue: p.preferenceValue,
                        preferencePrice: p.preferencePrice // already multiplied
                    })),
                    consents: consentsByItem[sp.cart_package_items_id] || []
                };
            });

            // 🔹 Group sub-packages by package_id
            const packagesMap = new Map();
            for (const sp of merged) {
                if (!packagesMap.has(sp.package_id)) packagesMap.set(sp.package_id, []);
                packagesMap.get(sp.package_id).push(sp);
            }

            const structuredPackages = [...packagesMap.entries()].map(([package_id, sub_packages]) => ({
                package_id,
                sub_packages
            }));

            // 🔹 Final structured cart
            allCarts.push({
                ...cart,
                packages: structuredPackages,
                totalAmount,
                discountedTotal,
                promoDiscount,
                tax: {
                    taxName,
                    taxPercentage,
                    taxAmount
                },
                finalTotal
            });
        }

        // ✅ Final API response
        res.status(200).json({
            message: "Cart retrieved successfully",
            carts: allCarts,
            promos
        });
    } catch (err) {
        console.error("💥 Error retrieving cart:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});


const deleteCartSubPackage = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { cart_id } = req.params;
    const { cart_package_items_id } = req.body;

    if (!cart_id || !cart_package_items_id) {
        return res.status(400).json({ message: "cart_id and cart_package_items_id are required" });
    }

    try {
        // 🔍 Verify the cart belongs to the user
        const [cartCheck] = await db.query(
            `SELECT * FROM service_cart WHERE cart_id = ? AND user_id = ?`,
            [cart_id, user_id]
        );

        if (cartCheck.length === 0) {
            return res.status(404).json({ message: "Cart not found or unauthorized" });
        }

        // 🔗 Delete related data for this sub-package
        await db.query(
            `DELETE FROM cart_addons WHERE cart_id = ? AND cart_package_items_id = ?`,
            [cart_id, cart_package_items_id]
        );

        await db.query(
            `DELETE FROM cart_preferences WHERE cart_id = ? AND cart_package_items_id = ?`,
            [cart_id, cart_package_items_id]
        );

        await db.query(
            `DELETE FROM cart_consents WHERE cart_id = ? AND cart_package_items_id = ?`,
            [cart_id, cart_package_items_id]
        );

        // 🗑 Delete the sub-package itself
        const [deleteResult] = await db.query(
            `DELETE FROM cart_package_items WHERE cart_id = ? AND cart_package_items_id = ?`,
            [cart_id, cart_package_items_id]
        );

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: "Sub-package not found in cart" });
        }

        // 🔎 Check if there are any sub-packages left in this cart
        const [remainingSubs] = await db.query(
            `SELECT COUNT(*) as count FROM cart_package_items WHERE cart_id = ?`,
            [cart_id]
        );

        if (remainingSubs[0].count === 0) {
            // If no sub-packages left, delete the cart itself
            await db.query(`DELETE FROM service_cart WHERE cart_id = ?`, [cart_id]);

            return res.status(200).json({
                message: "Last sub-package removed. Cart deleted.",
                cart_id,
                cart_package_items_id
            });
        }

        // ✅ If still has sub-packages
        res.status(200).json({
            message: "Sub-package deleted successfully",
            cart_id,
            cart_package_items_id
        });
    } catch (error) {
        console.error("Error deleting sub-package:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getCartByServiceTypeId = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { service_type_id } = req.params;

    if (!service_type_id) {
        return res.status(400).json({ message: "service_type_id is required" });
    }

    try {
        // 1️⃣ Fetch cart row(s) for the user and service_type_id
        const [cartRows] = await db.query(
            `SELECT sc.cart_id, sc.user_id, sc.service_id, sc.service_type_id, sc.totalTime,
                    sc.bookingStatus, sc.notes, sc.bookingMedia, sc.bookingDate, sc.bookingTime, sc.user_promo_code_id
             FROM service_cart sc
             WHERE sc.user_id = ? AND sc.service_type_id = ?`,
            [user_id, service_type_id]
        );

        if (!cartRows.length) {
            return res.status(200).json({ message: "No cart found for this service type" });
        }

        const cart = cartRows[0];
        const { cart_id, user_promo_code_id } = cart;

        // 2️⃣ Fetch sub-packages
        const [subPackages] = await db.query(
            `SELECT
                cpi.cart_package_items_id,
                cpi.sub_package_id,
                cpi.package_id,
                pi.itemName,
                cpi.price,
                cpi.quantity,
                pi.timeRequired
             FROM cart_package_items cpi
             LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
             WHERE cpi.cart_id = ?`,
            [cart_id]
        );

        const cartPackageItemIds = subPackages.map(sp => sp.cart_package_items_id);

        // 3️⃣ Fetch addons
        const [addons] = await db.query(
            `SELECT ca.cart_package_items_id, ca.addon_id, ca.sub_package_id, a.addonName, ca.price
             FROM cart_addons ca
             LEFT JOIN package_addons a ON ca.addon_id = a.addon_id
             WHERE ca.cart_id = ? AND ca.cart_package_items_id IN (?)`,
            [cart_id, cartPackageItemIds]
        );

        // 4️⃣ Fetch preferences
        const [preferences] = await db.query(
            `SELECT cp.cart_package_items_id, cp.preference_id, cp.cart_preference_id, cp.sub_package_id, bp.preferenceValue, bp.preferencePrice
             FROM cart_preferences cp
             LEFT JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
             WHERE cp.cart_id = ? AND cp.cart_package_items_id IN (?)`,
            [cart_id, cartPackageItemIds]
        );

        // 5️⃣ Fetch consents
        const [consents] = await db.query(
            `SELECT cc.cart_package_items_id, cc.sub_package_id, c.question, cc.answer, c.consent_id
             FROM cart_consents cc
             LEFT JOIN package_consent_forms c ON cc.consent_id = c.consent_id
             WHERE cc.cart_id = ? AND cc.cart_package_items_id IN (?)`,
            [cart_id, cartPackageItemIds]
        );

        // 6️⃣ Group by cart_package_items_id
        const groupByCartItem = (arr) => {
            return arr.reduce((acc, item) => {
                if (!acc[item.cart_package_items_id]) acc[item.cart_package_items_id] = [];
                acc[item.cart_package_items_id].push(item);
                return acc;
            }, {});
        };

        const addonsByCartItem = groupByCartItem(addons);
        const prefsByCartItem = groupByCartItem(preferences);
        const consentsByCartItem = groupByCartItem(consents);

        // 7️⃣ Attach child arrays + calculate sub-package total
        const subPackagesStructured = subPackages.map(sub => {
            const subAddons = addonsByCartItem[sub.cart_package_items_id] || [];
            const subPrefs = prefsByCartItem[sub.cart_package_items_id] || [];
            const subConsents = consentsByCartItem[sub.cart_package_items_id] || [];

            const basePrice = parseFloat(sub.price) || 0;
            const subQuantity = parseInt(sub.quantity) || 1;

            const addonsTotal = subAddons.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
            const prefsTotal = subPrefs.reduce((sum, p) => sum + (parseFloat(p.preferencePrice) || 0), 0);

            const singleUnitTotal = basePrice + addonsTotal + prefsTotal;
            const subTotal = singleUnitTotal * subQuantity;

            return {
                ...sub,
                addons: subAddons,
                preferences: subPrefs,
                consents: subConsents,
                total: subTotal
            };
        });

        // 8️⃣ Calculate cart-level total
        let totalAmount = subPackagesStructured.reduce((sum, sp) => sum + sp.total, 0);

        // 9️⃣ Apply promo logic
        let discountedTotal = totalAmount;
        let promoDetails = null;

        if (user_promo_code_id) {
            const [userPromoRows] = await db.query(
                `SELECT * FROM user_promo_codes WHERE user_id = ? AND user_promo_code_id = ? LIMIT 1`,
                [user_id, user_promo_code_id]
            );

            if (userPromoRows.length) {
                const promo = userPromoRows[0];
                if (promo.source_type === "admin" && promo.promo_id) {
                    const [adminPromo] = await db.query(
                        `SELECT * FROM promo_codes WHERE promo_id = ?`,
                        [promo.promo_id]
                    );

                    if (adminPromo.length) {
                        const discountValue = parseFloat(adminPromo[0].discountValue || 0);
                        const discountType = adminPromo[0].discount_type || "percentage";

                        discountedTotal =
                            discountType === "fixed"
                                ? Math.max(0, totalAmount - discountValue)
                                : totalAmount - (totalAmount * discountValue / 100);

                        promoDetails = {
                            user_promo_code_id: promo.user_promo_code_id,
                            source_type: "admin",
                            ...adminPromo[0],
                            code: promo.code,
                            usedCount: promo.usedCount,
                            maxUse: promo.maxUse
                        };
                    }
                }
            }

            if (!promoDetails) {
                const [systemPromoRows] = await db.query(
                    `SELECT sc.*, st.discount_type, st.discountValue
                     FROM system_promo_codes sc
                     JOIN system_promo_code_templates st ON sc.template_id = st.system_promo_code_template_id
                     WHERE sc.system_promo_code_id = ? AND sc.user_id = ? LIMIT 1`,
                    [user_promo_code_id, user_id]
                );

                if (systemPromoRows.length) {
                    const sysPromo = systemPromoRows[0];
                    const discountValue = parseFloat(sysPromo.discountValue || 0);
                    const discountType = sysPromo.discount_type || "percentage";

                    discountedTotal =
                        discountType === "fixed"
                            ? Math.max(0, totalAmount - discountValue)
                            : totalAmount - (totalAmount * discountValue / 100);

                    promoDetails = { ...sysPromo, source_type: "system" };
                }
            }
        }

        // 🔟 Final response (keep format same as original)
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
        console.error("Get cart by service type error:", err);
        res.status(500).json({ message: "Failed to fetch cart", error: err.message });
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

const getUserCartCount = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        // 1️⃣ Check if user exists in cart
        const [[cartCountRow]] = await db.query(`
            SELECT COUNT(cpi.cart_package_items_id) AS itemCount
            FROM service_cart sc
            JOIN cart_package_items cpi ON sc.cart_id = cpi.cart_id
            WHERE sc.user_id = ?
        `, [user_id]);

        const count = cartCountRow?.itemCount || 0;

        res.status(200).json({
            message: "Cart count retrieved successfully",
            count
        });

    } catch (error) {
        console.error("Error retrieving cart count:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});


module.exports = {
    addToCartService,
    getUserCart,
    deleteCartItem,
    updateCartDetails,
    getCartDetails,
    getCartByServiceTypeId,
    deleteCartSubPackage,
    getAdminInquiries,
    updateCartItemQuantity,
    getUserCartCount
};
