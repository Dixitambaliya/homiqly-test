const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const bookingPostQueries = require('../config/bookingQueries/bookingPostQueries');
const sendEmail = require('../config/mailer');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');
const {
    sendServiceBookingNotification,
    sendBookingNotificationToUser,
    sendBookingAssignedNotificationToVendor,
    sendVendorAssignedNotificationToUser
} = require("./adminNotification")


const bookService = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const {
        service_categories_id,
        serviceId,
        service_type_id,
        packages,
        bookingDate,
        bookingTime,
        notes,
        preferences,
        consents,
        vendor_id
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    if (!service_categories_id || !service_type_id || !bookingDate || !bookingTime) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let parsedPackages = [];
    let parsedPreferences = [];
    let parsedConsents = [];

    // Parse packages
    try {
        parsedPackages = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages)) {
            return res.status(400).json({ message: "'packages' must be a valid array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'packages' must be a valid JSON array.", error: e.message });
    }

    // Parse preferences (top-level array)
    try {
        parsedPreferences = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
        if (parsedPreferences && !Array.isArray(parsedPreferences)) {
            return res.status(400).json({ message: "'preferences' must be a valid array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'preferences' must be a valid JSON array.", error: e.message });
    }

    // Parse consents (NEW: top-level array)
    // Each consent object can be: { consent_id, answer, package_id? } or a simple consent_id number
    try {
        parsedConsents = typeof consents === 'string' ? JSON.parse(consents) : consents;
        if (parsedConsents && !Array.isArray(parsedConsents)) {
            return res.status(400).json({ message: "'consents' must be a valid array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'consents' must be a valid JSON array.", error: e.message });
    }

    const connection = await db.getConnection();
    let booking_id;

    try {
        await connection.beginTransaction();

        // Prevent duplicate bookings
        const [slotClash] = await connection.query(
            bookingGetQueries.getBookingAvilability,
            [user_id, bookingDate, bookingTime]
        );

        if (slotClash.length) {
            await connection.rollback();
            return res.status(409).json({
                message: `You already have a booking at ${bookingDate} ${bookingTime}. Please choose a different time.`,
            });
        }

        // Create booking
        const [insertBooking] = await connection.query(
            bookingPostQueries.insertBooking,
            [
                service_categories_id,
                serviceId,
                user_id,
                bookingDate,
                bookingTime,
                vendor_id || 0,
                notes || null,
                bookingMedia || null,
                "pending"
            ]
        );

        booking_id = insertBooking.insertId;

        // Link service type
        await connection.query(
            bookingPostQueries.insertserviceType,
            [booking_id, service_type_id]
        );

        // Link packages + sub-packages + addons
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages = [], addons = [] } = pkg;

            const [dbaddons] = await connection.query(
                `SELECT addon_id FROM package_addons WHERE package_id = ?`,
                [package_id]
            );

            const hasAddons = dbaddons.length > 0;

            if (hasAddons && (!Array.isArray(addons) || addons.length === 0)) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Addons are required for package_id for this package`
                });
            }

            await connection.query(
                bookingPostQueries.insertPackages,
                [booking_id, package_id]
            );

            // Sub-packages
            for (const item of sub_packages) {
                if (!item.sub_package_id || item.price == null) continue;

                const quantity =
                    item.quantity && Number.isInteger(item.quantity) && item.quantity > 0
                        ? item.quantity
                        : 1;

                await connection.query(
                    bookingPostQueries.insertSubPackages,
                    [booking_id, item.sub_package_id, item.price, quantity]
                );
            }

            // Optional Addons
            if (Array.isArray(addons) && addons.length > 0) {
                for (const addon of addons) {
                    if (!addon.addon_id || addon.price == null) continue; // skip invalid

                    await connection.query(
                        `INSERT INTO service_booking_addons (booking_id, package_id, addon_id, price)
                         VALUES (?, ?, ?, ?)`,
                        [booking_id, package_id, addon.addon_id, addon.price]
                    );
                }
            }
        }

        // Link preferences (top-level)
        for (const pref of parsedPreferences || []) {
            const preference_id = typeof pref === 'object' ? pref.preference_id : pref;
            if (!preference_id) continue;

            await connection.query(
                bookingPostQueries.insertPreference,
                [booking_id, preference_id]
            );
        }

        // Link consents (NEW: top-level, optionally associated to package via package_id)
        for (const consent of parsedConsents || []) {
            const consent_id = typeof consent === 'object' ? consent.consent_id : consent;
            if (!consent_id) continue;

            const answer = typeof consent === 'object' ? (consent.answer ?? null) : null;
            const pkgId = typeof consent === 'object' ? (consent.package_id ?? null) : null;

            await connection.query(
                `INSERT INTO service_booking_consents (booking_id, package_id, consent_id, answer)
                 VALUES (?, ?, ?, ?)`,
                [booking_id, pkgId, consent_id, answer]
            );
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        console.error("Booking error:", err);
        return res.status(500).json({ message: "Internal server error", error: err.message });
    } finally {
        connection.release();
    }

    // Notifications (outside transaction)
    try {
        const [userRows] = await db.query(
            `SELECT firstname, lastname FROM users WHERE user_id = ? LIMIT 1`,
            [user_id]
        );

        const bookedBy = userRows?.[0] || {};
        const userFullName = [bookedBy.firstname, bookedBy.lastname].filter(Boolean).join(" ") || `User #${user_id}`;

        await db.query(
            `INSERT INTO notifications (
                user_type,
                user_id,
                title,
                body,
                is_read,
                sent_at
            ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            [
                'admin',
                user_id,
                'New service booking',
                `${userFullName} booked a service (Booking #${booking_id}).`
            ]
        );

        await sendServiceBookingNotification(booking_id, service_type_id, user_id);
    } catch (err) {
        console.error("Notification error (ignored, booking created):", err.message);
    }

    res.status(200).json({
        message: "Booking created successfully.",
        booking_id,
        payment_status: "pending"
    });
});

const getVendorBookings = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        // 1️⃣ Get vendor type
        const [[vendorRow]] = await db.query(bookingGetQueries.getVendorIdForBooking, [vendor_id]);
        const vendorType = vendorRow?.vendorType || null;

        // 2️⃣ Get latest platform fee
        const [platformSettings] = await db.query(bookingGetQueries.getPlateFormFee, [vendorType]);
        const platformFee = Number(platformSettings?.[0]?.platform_fee_percentage ?? 0);

        // 3️⃣ Fetch vendor bookings
        const [bookings] = await db.query(bookingGetQueries.getVendorBookings, [vendor_id]);

        for (const booking of bookings) {
            const bookingId = booking.booking_id;
            const rawAmount = Number(booking.payment_amount) || 0;

            // ✅ Just calculate and adjust payment amount internally
            const platformFeeAmount = parseFloat((rawAmount * (platformFee / 100)).toFixed(2));
            const netAmount = parseFloat((rawAmount - platformFeeAmount).toFixed(2));

            // Keep payment_amount as netAmount (vendor receives this)
            booking.payment_amount = netAmount;

            // ❌ Don't attach platform_fee or net_amount to the response
            delete booking.platform_fee;
            delete booking.net_amount;

            // 5️⃣ Fetch sub-packages, addons, preferences, consents
            const [subPackages] = await db.query(bookingGetQueries.getBookedSubPackages, [bookingId]);
            const [bookingAddons] = await db.query(bookingGetQueries.getBookedAddons, [bookingId]);
            const [bookingPreferences] = await db.query(bookingGetQueries.getBoookedPrefrences, [bookingId]);
            const [bookingConsents] = await db.query(bookingGetQueries.getBoookedConsents, [bookingId]);

            // 6️⃣ Group addons, preferences, consents by sub_package_id
            const addonsByItem = {};
            bookingAddons.forEach(a => {
                if (!addonsByItem[a.sub_package_id]) addonsByItem[a.sub_package_id] = [];
                const { sub_package_id, ...rest } = a;
                addonsByItem[sub_package_id].push(rest);
            });

            const prefsByItem = {};
            bookingPreferences.forEach(p => {
                if (!prefsByItem[p.sub_package_id]) prefsByItem[p.sub_package_id] = [];
                const { sub_package_id, ...rest } = p;
                prefsByItem[sub_package_id].push(rest);
            });

            const consentsByItem = {};
            bookingConsents.forEach(c => {
                if (!consentsByItem[c.sub_package_id]) consentsByItem[c.sub_package_id] = [];
                consentsByItem[c.sub_package_id].push({
                    consent_id: c.consent_id,
                    consentText: c.question,
                    answer: c.answer
                });
            });

            // 7️⃣ Group sub-packages by package_id
            const groupedByPackage = subPackages.reduce((acc, sp) => {
                const packageId = sp.package_id;

                if (!acc[packageId]) {
                    acc[packageId] = {
                        package_id: packageId,
                        packageName: sp.packageName,
                        packageMedia: sp.packageMedia,
                        items: []
                    };
                }

                // Attach corresponding addons, preferences, consents
                const addons = addonsByItem[sp.sub_package_id] || [];
                const preferences = prefsByItem[sp.sub_package_id] || [];
                const consents = consentsByItem[sp.sub_package_id] || [];

                acc[packageId].items.push({
                    sub_package_id: sp.sub_package_id,
                    itemName: sp.itemName,
                    itemMedia: sp.itemMedia,
                    timeRequired: sp.timeRequired,
                    quantity: sp.quantity,
                    ...(addons.length && { addons }),
                    ...(preferences.length && { preferences }),
                    ...(consents.length && { consents })
                });

                return acc;
            }, {});

            booking.sub_packages = Object.values(groupedByPackage);

            // 8️⃣ Attach promo code if exists
            if (booking.user_promo_code_id) {
                let promo = null;

                const [[userPromo]] = await db.query(`
                    SELECT upc.user_promo_code_id AS promo_id,
                           pc.code AS promoCode,
                           pc.discountValue,
                           pc.minSpend
                    FROM user_promo_codes upc
                    LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
                    WHERE upc.user_promo_code_id = ?
                `, [booking.user_promo_code_id]);

                if (userPromo) promo = userPromo;
                else {
                    const [[systemPromo]] = await db.query(`
                        SELECT spc.system_promo_code_id AS promo_id,
                               spct.code AS promoCode,
                               spct.discountValue
                        FROM system_promo_codes spc
                        LEFT JOIN system_promo_code_templates spct ON spc.template_id = spct.system_promo_code_template_id
                        WHERE spc.system_promo_code_id = ?
                    `, [booking.user_promo_code_id]);
                    if (systemPromo) promo = systemPromo;
                }

                if (promo) booking.promo = promo;
            }

            // 9️⃣ Employee info
            if (booking.assignedEmployeeId) {
                booking.assignedEmployee = {
                    employee_id: booking.assignedEmployeeId,
                    name: `${booking.employeeFirstName} ${booking.employeeLastName}`,
                    email: booking.employeeEmail,
                    phone: booking.employeePhone
                };
            }

            // 🔟 Cleanup extra fields & nulls
            ['assignedEmployeeId', 'employeeFirstName', 'employeeLastName', 'employeeEmail', 'employeePhone'].forEach(k => delete booking[k]);
            Object.keys(booking).forEach(k => { if (booking[k] === null) delete booking[k]; });
        }

        // ✅ Final response
        res.status(200).json({
            message: "Vendor bookings fetched successfully",
            bookings
        });

    } catch (error) {
        console.error("Error fetching vendor bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

const getUserBookings = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        // 1️⃣ Fetch all bookings for the user, include payment info
        const [userBookings] = await db.query(
            `SELECT 
                sb.*,
                v.vendor_id,
                v.vendorType,
                IF(v.vendorType = 'company', cdet.companyName, idet.name) AS vendorName,
                IF(v.vendorType = 'company', cdet.companyPhone, idet.phone) AS vendorPhone,
                IF(v.vendorType = 'company', cdet.companyEmail, idet.email) AS vendorEmail,
                IF(v.vendorType = 'company', cdet.contactPerson, NULL) AS vendorContactPerson,
                IF(v.vendorType = 'company', cdet.profileImage, idet.profileImage) AS vendorProfileImage,
                p.payment_intent_id,
                p.amount AS paymentAmount,
                p.receipt_url
            FROM service_booking sb
            LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
            WHERE sb.user_id = ?`,
            [user_id]
        );

        for (const booking of userBookings) {
            const bookingId = booking.booking_id;

            // 2️⃣ Fetch sub-packages (items with package + service type details)
            const [subPackages] = await db.query(`
                SELECT 
                    sbsp.sub_package_id,
                    p.package_id,
                    p.packageName,
                    p.packageMedia,
                    pi.itemName,
                    pi.itemMedia,
                    pi.timeRequired,
                    sbsp.price,
                    sbsp.quantity
                FROM service_booking_sub_packages sbsp
                JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                JOIN packages p ON pi.package_id = p.package_id
                WHERE sbsp.booking_id = ?`,
                [bookingId]
            );

            // 3️⃣ Fetch related data
            const [bookingAddons] = await db.query(`
                SELECT 
                    sba.sub_package_id,
                    sba.addon_id,
                    a.addonName,
                    a.addonMedia,
                    sba.price,
                    sba.quantity
                FROM service_booking_addons sba
                JOIN package_addons a ON sba.addon_id = a.addon_id
                WHERE sba.booking_id = ?`,
                [bookingId]
            );

            const [bookingConsents] = await db.query(`
                SELECT 
                    c.consent_id,
                    c.question,
                    sbc.answer,
                    sbc.sub_package_id
                FROM service_booking_consents sbc
                LEFT JOIN package_consent_forms c ON sbc.consent_id = c.consent_id
                WHERE sbc.booking_id = ?`,
                [bookingId]
            );

            const [bookingPreferences] = await db.query(`
                SELECT
                    sp.sub_package_id,
                    sp.preference_id,
                    bp.preferenceValue,
                    bp.preferencePrice
                FROM service_booking_preferences sp
                JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                WHERE sp.booking_id = ?`,
                [bookingId]
            );

            // 4️⃣ Fetch promo code info (user or system promo)
            let promo = null;
            if (booking.user_promo_code_id) {
                const [[userPromo]] = await db.query(`
                    SELECT upc.user_promo_code_id AS promo_id, 
                        pc.code AS promoCode, 
                        pc.discountValue, 
                        pc.minSpend, 
                        upc.usedCount AS usage_count, 
                        upc.maxUse
                    FROM user_promo_codes upc
                    LEFT JOIN promo_codes pc ON upc.promo_id = pc.promo_id
                    WHERE upc.user_promo_code_id = ?`,
                    [booking.user_promo_code_id]
                );

                if (userPromo) {
                    promo = { ...userPromo };
                } else {
                    const [[systemPromo]] = await db.query(`
                        SELECT 
                            spc.system_promo_code_id AS promo_id, 
                            spt.code AS promoCode, 
                            spt.discount_type AS discountType, 
                            spt.discountValue 
                        FROM system_promo_codes spc
                        LEFT JOIN system_promo_code_templates spt ON spc.template_id = spt.system_promo_code_template_id
                        WHERE spc.system_promo_code_id = ?`,
                        [booking.user_promo_code_id]
                    );
                    if (systemPromo) promo = { ...systemPromo };
                }
            }

            // 5️⃣ Group sub-packages by service_type_id
            const groupedByServiceType = subPackages.reduce((acc, sp) => {
                const serviceTypeId = sp.service_type_id;

                if (!acc[serviceTypeId]) {
                    acc[serviceTypeId] = {
                        service_type_id: serviceTypeId,
                        package_id: sp.package_id,
                        packageName: sp.packageName,
                        packageMedia: sp.packageMedia,
                        items: []
                    };
                }

                // Addons, consents, prefs for this item
                const addons = bookingAddons
                    .filter(a => a.sub_package_id === sp.sub_package_id)
                    .map(({ sub_package_id, ...rest }) => rest);

                const consents = bookingConsents
                    .filter(c => c.sub_package_id === sp.sub_package_id)
                    .map(({ sub_package_id, ...rest }) => rest);

                const prefs = bookingPreferences
                    .filter(p => p.sub_package_id === sp.sub_package_id)
                    .map(({ sub_package_id, ...rest }) => rest);

                acc[serviceTypeId].items.push({
                    sub_package_id: sp.sub_package_id,
                    itemName: sp.itemName,
                    itemMedia: sp.itemMedia,
                    timeRequired: sp.timeRequired,
                    price: sp.price,
                    quantity: sp.quantity,
                    ...(addons.length && { addons }),
                    ...(consents.length && { consents }),
                    ...(prefs.length && { preferences: prefs })
                });

                return acc;
            }, {});

            booking.subPackages = Object.values(groupedByServiceType);
            if (promo) booking.promo = promo;

            // 6️⃣ Clean null values
            Object.keys(booking).forEach(key => {
                if (booking[key] === null) delete booking[key];
            });
        }

        res.status(200).json({
            message: "User bookings fetched successfully",
            bookings: userBookings
        });

    } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

const approveOrRejectBooking = asyncHandler(async (req, res) => {
    const { booking_id, status } = req.body;

    if (!booking_id || status === undefined) {
        return res.status(400).json({ message: "booking_id and status are required" });
    }

    if (![1, 2].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Use 1 for approve, 2 for cancel." });
    }

    try {
        // Get user info for this booking (need user_id for notification)
        const [bookingData] = await db.query(
            `
      SELECT
        u.user_id,
        u.email,
        u.fcmToken,
        CONCAT(u.firstName, ' ', u.lastName) AS name,
        sb.booking_id
      FROM service_booking sb
      JOIN users u ON sb.user_id = u.user_id
      WHERE sb.booking_id = ?
      `,
            [booking_id]
        );

        if (!bookingData || bookingData.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const userId = bookingData[0].user_id;
        const userEmail = bookingData[0].email;
        const userName = bookingData[0].name;

        // Update status in DB
        const [result] = await db.query(
            `UPDATE service_booking SET bookingStatus = ? WHERE booking_id = ?`,
            [status, booking_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Send FCM notification (optional)
        try {
            await sendBookingNotificationToUser(
                bookingData[0].fcmToken,
                userName,
                booking_id,
                status
            );
        } catch (err) {
            console.error(`⚠️ FCM notification failed for booking_id ${booking_id}:`, err.message);
        }

        // Send email (optional)
        try {
            const subject = status === 1 ? "Booking Approved" : "Booking Cancelled";
            const message =
                status === 1
                    ? `Hi ${userName},\n\nYour booking (ID: ${booking_id}) has been approved. You can now proceed with the payment.\n\nThank you!`
                    : `Hi ${userName},\n\nUnfortunately, your booking (ID: ${booking_id}) has been cancelled. Please contact support if you need further assistance.`;

            await sendEmail(userEmail, subject, message);
        } catch (err) {
            console.error(`⚠️ Email sending failed for booking_id ${booking_id}:`, err.message);
        }

        // Add DB notification for the user
        try {
            const notifTitle = status === 1
                ? "Booking Approved"
                : "Booking Cancelled";
            const notifBody = status === 1
                ? `Admin approved your booking #${booking_id}`
                : `Admin cancelled your booking #${booking_id}`;

            await db.query(
                `INSERT INTO notifications (user_type, user_id, title, body, is_read, sent_at)
         VALUES ('users', ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                [userId, notifTitle, notifBody]
            );
        } catch (err) {
            console.error(`⚠️ DB notification insert failed for booking_id ${booking_id}:`, err.message);
        }

        res.status(200).json({
            message: `Booking has been ${status === 1 ? 'approved' : 'cancelled'} successfully`,
            booking_id,
            status
        });
    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const assignBookingToVendor = asyncHandler(async (req, res) => {
    const { booking_id, vendor_id } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        if (!booking_id || !vendor_id) {
            return res.status(400).json({ message: "booking_id and vendor_id are required" });
        }

        // ✅ 1. Check vendor toggle
        const [toggleResult] = await connection.query(
            `SELECT manual_assignment_enabled FROM vendor_settings WHERE vendor_id = ?`,
            [vendor_id]
        );

        if (toggleResult.length === 0) {
            return res.status(404).json({ message: `Vendor ID ${vendor_id} Toggle off` });
        }

        const isAvailable = toggleResult[0].manual_assignment_enabled === 1;
        if (!isAvailable) {
            return res.status(400).json({
                message: `Vendor ID ${vendor_id} is not accepting manual bookings (toggle OFF).`
            });
        }

        // ✅ 2. Get service_id from booking
        const [bookingInfo] = await connection.query(
            `SELECT service_id FROM service_booking WHERE booking_id = ?`,
            [booking_id]
        );

        const service_id = bookingInfo[0]?.service_id;
        if (!service_id) {
            return res.status(404).json({ message: "Service ID not found for this booking." });
        }

        // ✅ 3. Get vendor type (individual/company)
        const [vendorInfo] = await connection.query(
            `SELECT vendorType FROM vendors WHERE vendor_id = ?`,
            [vendor_id]
        );

        if (vendorInfo.length === 0) {
            return res.status(404).json({ message: `Vendor ${vendor_id} not found.` });
        }

        const vendorType = vendorInfo[0].vendorType;

        // ✅ 4. Check if vendor is linked to this service
        let vendorEligible = [];

        if (vendorType === 'individual') {
            [vendorEligible] = await connection.query(
                `SELECT 1 FROM individual_services WHERE vendor_id = ? AND service_id = ?`,
                [vendor_id, service_id]
            );
        } else if (vendorType === 'company') {
            [vendorEligible] = await connection.query(
                `SELECT 1 FROM company_services WHERE vendor_id = ? AND service_id = ?`,
                [vendor_id, service_id]
            );
        } else {
            return res.status(400).json({ message: `Invalid vendorType for vendor ${vendor_id}.` });
        }

        if (vendorEligible.length === 0) {
            return res.status(400).json({
                message: `Vendor ${vendor_id} is not registered for service ID ${service_id}.`
            });
        }

        // ✅ 5. Assign vendor to booking
        await connection.query(
            `UPDATE service_booking SET vendor_id = ? WHERE booking_id = ?`,
            [vendor_id, booking_id]
        );

        await connection.commit();

        try {
            // ✅ 2. Get service_id and user_id from booking
            const [bookingInfo] = await connection.query(
                `SELECT service_id, user_id FROM service_booking WHERE booking_id = ?`,
                [booking_id]
            );

            const service_id = bookingInfo[0]?.service_id;
            const user_id = bookingInfo[0]?.user_id;

            if (!service_id || !user_id) {
                return res.status(404).json({ message: "Service ID or user ID not found for this booking." });
            }


            // Fetch vendor name
            let vendorName = `Vendor #${vendor_id}`;

            let query = '';
            if (vendorType === 'individual') {
                query = `SELECT name FROM individual_details WHERE vendor_id = ?`;
            } else if (vendorType === 'company') {
                query = `SELECT companyName AS name FROM company_details WHERE vendor_id = ?`;
            }

            if (query) {
                const [rows] = await connection.query(query, [vendor_id]);

                if (rows.length > 0) {
                    vendorName = rows[0].name;
                }
            }

            // ✅ 7. Insert notification for user with vendor name in body
            await connection.query(
                `INSERT INTO notifications (
                user_type,
                user_id,
                title,
                body,
                is_read,
                sent_at
            ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                [
                    'users',
                    user_id,
                    'Vendor Assigned',
                    `Hi! ${vendorName} (Vendor ID: ${vendor_id}) has been assigned to your booking (#${booking_id}).`
                ]
            );

            await connection.query(
                `INSERT INTO notifications (
                    user_type,
                    user_id,
                    title,
                    body,
                    is_read,
                    sent_at
                ) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                [
                    'vendors',
                    vendor_id,
                    'New Booking Assigned',
                    `Hi ${vendorName}, You have been assigned a new booking (#${booking_id}).`,
                ]
            );

        } catch (err) {
            console.error(`⚠️ Failed to insert admin notification for booking_id ${booking_id}:`, err.message);
        }

        // ✅ Send FCM push notifications
        try {
            await sendBookingAssignedNotificationToVendor(vendor_id, booking_id);
            await sendVendorAssignedNotificationToUser(user_id, booking_id, vendor_id);
        } catch (err) {
            console.error(`⚠️ FCM notification failed for booking_id ${booking_id}:`, err.message);
        }

        res.status(200).json({ message: `Booking ${booking_id} successfully assigned to vendor ${vendor_id}.` });
    } catch (err) {
        await connection.rollback();
        console.error("Assign vendor error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    } finally {
        connection.release();
    }
});

const getEligiblevendors = asyncHandler(async (req, res) => {
    const { booking_id } = req.params;

    const connection = await db.getConnection();

    try {
        // 1. Get service_id from booking
        const [bookingData] = await connection.query(
            `SELECT service_id FROM service_booking WHERE booking_id = ?`,
            [booking_id]
        );

        if (bookingData.length === 0) {
            return res.status(404).json({ message: "Booking not found." });
        }

        const { service_id } = bookingData[0];

        // 2. Get vendors with manual toggle enabled and matching service_id
        const [individuals] = await connection.query(`
            SELECT v.vendor_id, 'individual' AS vendorType, id.name AS vendorName
            FROM vendors v
            JOIN individual_services isr ON isr.vendor_id = v.vendor_id AND isr.service_id = ?
            JOIN vendor_settings vs ON vs.vendor_id = v.vendor_id
            JOIN individual_details id ON id.vendor_id = v.vendor_id
            WHERE v.vendorType = 'individual' AND vs.manual_assignment_enabled = 1
        `, [service_id]);

        const [companies] = await connection.query(`
            SELECT v.vendor_id, 'company' AS vendorType, cd.companyName AS vendorName
            FROM vendors v
            JOIN company_services cs ON cs.vendor_id = v.vendor_id AND cs.service_id = ?
            JOIN vendor_settings vs ON vs.vendor_id = v.vendor_id
            JOIN company_details cd ON cd.vendor_id = v.vendor_id
            WHERE v.vendorType = 'company' AND vs.manual_assignment_enabled = 1
        `, [service_id]);

        // 3. Get vendors with packages where the package belongs to a matching service_type → service_id
        const [packageVendors] = await connection.query(`
            SELECT DISTINCT v.vendor_id,
                v.vendorType,
                COALESCE(id.name, cd.companyName) AS vendorName
            FROM vendors v
            LEFT JOIN individual_details id ON id.vendor_id = v.vendor_id
            LEFT JOIN company_details cd ON cd.vendor_id = v.vendor_id
            JOIN vendor_packages vp ON vp.vendor_id = v.vendor_id
            JOIN packages p ON p.package_id = vp.package_id
            JOIN service_type st ON st.service_type_id = p.service_type_id
            WHERE st.service_id = ?
        `, [service_id]);

        // Combine all vendors and remove duplicates based on vendor_id
        const combinedVendors = [...individuals, ...companies, ...packageVendors];
        const uniqueVendorsMap = new Map();

        combinedVendors.forEach(v => {
            if (!uniqueVendorsMap.has(v.vendor_id)) {
                uniqueVendorsMap.set(v.vendor_id, v);
            }
        });

        const eligibleVendors = Array.from(uniqueVendorsMap.values());

        res.status(200).json({ eligibleVendors });
    } catch (err) {
        console.error("Get eligible vendors error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    } finally {
        connection.release();
    }
});

const approveOrAssignBooking = asyncHandler(async (req, res) => {
    const { booking_id, status, vendor_id } = req.body;

    if (!booking_id || status === undefined) {
        return res.status(400).json({ message: "booking_id and status are required" });
    }

    if (![1, 2].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Use 1 for approve, 2 for cancel." });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // ✅ 1. Get user info
        const [bookingData] = await connection.query(`
            SELECT u.email, CONCAT(u.firstName, ' ', u.lastName) AS name
            FROM service_booking sb
            JOIN users u ON sb.user_id = u.user_id
            WHERE sb.booking_id = ?
        `, [booking_id]);

        if (!bookingData || bookingData.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Booking not found" });
        }

        const userEmail = bookingData[0].email;
        const userName = bookingData[0].name;

        // ✅ 2. Update booking status
        const [updateStatusResult] = await connection.query(
            `UPDATE service_booking SET bookingStatus = ? WHERE booking_id = ?`,
            [status, booking_id]
        );

        if (updateStatusResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Booking not found" });
        }

        // ✅ 3. Assign vendor if approved and vendor_id is provided
        if (status === 1 && vendor_id) {
            // 🔎 Check vendor toggle
            const [toggleResult] = await connection.query(
                `SELECT manual_assignment_enabled FROM vendor_settings WHERE vendor_id = ?`,
                [vendor_id]
            );
            if (toggleResult.length === 0 || toggleResult[0].manual_assignment_enabled !== 1) {
                await connection.rollback();
                return res.status(400).json({ message: `Vendor ${vendor_id} not accepting manual bookings.` });
            }

            // 🔎 Get service_id
            const [bookingInfo] = await connection.query(
                `SELECT service_id FROM service_booking WHERE booking_id = ?`,
                [booking_id]
            );
            const service_id = bookingInfo[0]?.service_id;
            if (!service_id) {
                await connection.rollback();
                return res.status(404).json({ message: "Service ID not found for this booking." });
            }

            // 🔎 Get vendor type
            const [vendorInfo] = await connection.query(
                `SELECT vendorType FROM vendors WHERE vendor_id = ?`,
                [vendor_id]
            );
            if (vendorInfo.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: `Vendor ${vendor_id} not found.` });
            }
            const vendorType = vendorInfo[0].vendorType;

            // 🔎 Check if vendor is registered for the service
            let vendorEligible = [];
            if (vendorType === 'individual') {
                [vendorEligible] = await connection.query(
                    `SELECT 1 FROM individual_services WHERE vendor_id = ? AND service_id = ?`,
                    [vendor_id, service_id]
                );
            } else if (vendorType === 'company') {
                [vendorEligible] = await connection.query(
                    `SELECT 1 FROM company_services WHERE vendor_id = ? AND service_id = ?`,
                    [vendor_id, service_id]
                );
            } else {
                await connection.rollback();
                return res.status(400).json({ message: `Invalid vendorType for vendor ${vendor_id}.` });
            }

            if (vendorEligible.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Vendor ${vendor_id} is not registered for service ID ${service_id}.`
                });
            }

            // ✅ Assign vendor
            await connection.query(
                `UPDATE service_booking SET vendor_id = ? WHERE booking_id = ?`,
                [vendor_id, booking_id]
            );
        }

        // ✅ Send email
        const subject = status === 1 ? "Booking Approved" : "Booking Cancelled";
        const message = status === 1
            ? `Hi ${userName},\n\nYour booking (ID: ${booking_id}) has been approved. You can now proceed with the payment.\n\nThank you!`
            : `Hi ${userName},\n\nUnfortunately, your booking (ID: ${booking_id}) has been cancelled. Please contact support if you need further assistance.`;

        await sendEmail(userEmail, subject, message);

        await connection.commit();
        res.status(200).json({
            message: `Booking has been ${status === 1 ? 'approved' : 'cancelled'}${vendor_id ? ' and vendor assigned' : ''} successfully.`,
            booking_id,
            status,
            vendor_assigned: !!vendor_id
        });

    } catch (error) {
        await connection.rollback();
        console.error("approveOrAssignBooking error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    } finally {
        connection.release();
    }
});


const getAvailableVendors = asyncHandler(async (req, res) => {
    try {
        const { date, time, package_id, sub_package_id } = req.query;

        if (!date || !time) {
            return res.status(400).json({ message: "date and time are required" });
        }

        if (!package_id) {
            return res.status(400).json({ message: "package_id is required" });
        }

        if (!sub_package_id) {
            return res.status(400).json({ message: "sub_package_id is required" });
        }

        // ✅ Parse comma-separated IDs into arrays
        const packageIds = package_id.split(",").map(id => Number(id.trim())).filter(Boolean);
        const subPackageIds = sub_package_id.split(",").map(id => Number(id.trim())).filter(Boolean);

        if (packageIds.length === 0) {
            return res.status(400).json({ message: "At least one package_id is required" });
        }

        if (subPackageIds.length === 0) {
            return res.status(400).json({ message: "At least one sub_package_id is required" });
        }

        const blocking = [1, 3];
        const vendorBreakMinutes = 60;

        // ✅ Create flattened pairs
        const pairs = [];
        for (let i = 0; i < packageIds.length; i++) {
            const pkgId = packageIds[i];
            const subId = subPackageIds[i] || null; // handle unequal counts gracefully
            pairs.push({ package_id: pkgId, sub_package_id: subId });
        }

        const pairPlaceholders = pairs.map(() => `(?, ?)`).join(',');
        const pairValues = pairs.map(p => [p.package_id, p.sub_package_id]).flat();

        const sql = `
            SELECT 
                v.vendor_id,
                v.vendorType,
                IF(v.vendorType='company', cdet.companyName, idet.name) AS vendorName,
                IF(v.vendorType='company', cdet.companyEmail, idet.email) AS vendorEmail,
                IF(v.vendorType='company', cdet.companyPhone, idet.phone) AS vendorPhone,
                IF(v.vendorType='company', cdet.profileImage, idet.profileImage) AS profileImage,
                IFNULL(AVG(r.rating),0) AS avgRating,
                COUNT(r.rating_id) AS totalReviews,
                GROUP_CONCAT(DISTINCT vpf.package_id) AS package_ids
            FROM vendors v
            LEFT JOIN individual_details idet ON idet.vendor_id = v.vendor_id
            LEFT JOIN company_details cdet ON cdet.vendor_id = v.vendor_id
            LEFT JOIN vendor_settings vst ON vst.vendor_id = v.vendor_id
            INNER JOIN vendor_package_items_flat vpf
                ON vpf.vendor_id = v.vendor_id
                AND (vpf.package_id, vpf.package_item_id) IN (${pairPlaceholders})
            LEFT JOIN service_booking sb_rating ON sb_rating.vendor_id = v.vendor_id
            LEFT JOIN ratings r ON r.booking_id = sb_rating.booking_id AND r.package_id = vpf.package_id
            INNER JOIN packages p ON p.package_id = vpf.package_id
            INNER JOIN service_type st ON st.service_type_id = p.service_type_id
            INNER JOIN services s ON s.service_id = st.service_id
            WHERE vst.manual_assignment_enabled = 1
              AND NOT EXISTS (
                  SELECT 1
                  FROM service_booking sb
                  WHERE sb.vendor_id = v.vendor_id
                    AND sb.bookingStatus IN (${blocking.map(() => '?').join(",")})
                    AND sb.bookingDate = ?
                    AND STR_TO_DATE(CONCAT(?, ' ', ?), '%Y-%m-%d %H:%i:%s') BETWEEN 
                        COALESCE(sb.start_time, STR_TO_DATE(CONCAT(sb.bookingDate, ' ', sb.bookingTime), '%Y-%m-%d %H:%i:%s'))
                        AND DATE_ADD(
                            COALESCE(sb.end_time, STR_TO_DATE(CONCAT(sb.bookingDate, ' ', sb.bookingTime), '%Y-%m-%d %H:%i:%s')),
                            INTERVAL ? MINUTE
                        )
              )
            GROUP BY v.vendor_id
            HAVING COUNT(DISTINCT CONCAT(vpf.package_id, '-', IFNULL(vpf.package_item_id, 0))) = ?
            ORDER BY vendorName ASC
        `;

        const params = [
            ...pairValues,
            ...blocking,
            date,
            date, time,
            vendorBreakMinutes,
            pairs.length
        ];

        const [vendors] = await db.query(sql, params);

        const vendorsWithPackageArray = vendors.map(v => ({
            ...v,
            package_ids: v.package_ids ? v.package_ids.split(',').map(Number) : []
        }));

        if (!vendorsWithPackageArray.length) {
            return res.status(200).json({ message: "No vendors found for the given criteria" });
        }

        res.status(200).json({
            message: "Available vendors fetched successfully",
            vendors: vendorsWithPackageArray
        });

    } catch (err) {
        console.error("getAvailableVendors error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});



module.exports = {
    bookService,
    getVendorBookings,
    getUserBookings,
    approveOrRejectBooking,
    assignBookingToVendor,
    getEligiblevendors,
    approveOrAssignBooking,
    getAvailableVendors
};
