const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const bookingPostQueries = require('../config/bookingQueries/bookingPostQueries');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');
const bookingPutQueries = require('../config/bookingQueries/bookingPutQueries');

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
        paymentIntentId
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    if (!service_categories_id || !service_type_id || !bookingDate || !bookingTime) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let parsedPackages = [];
    let parsedPreferences = [];

    try {
        parsedPackages = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages)) {
            return res.status(400).json({ message: "'packages' must be a valid array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'packages' must be a valid JSON array.", error: e.message });
    }

    try {
        parsedPreferences = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
        if (parsedPreferences && !Array.isArray(parsedPreferences)) {
            return res.status(400).json({ message: "'preferences' must be a valid array." });
        }
    } catch (e) {
        return res.status(400).json({ message: "'preferences' must be a valid JSON array.", error: e.message });
    }

    try {
        // ✅ 1. Verify Stripe Payment if provided
        if (paymentIntentId) {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (!paymentIntent || paymentIntent.status !== "succeeded") {
                return res.status(402).json({ message: "Payment was not successful or is incomplete." });
            }
        }

        // ✅ 2. Check if user already booked each selected package for this service type
        for (const pkg of parsedPackages) {
            const { package_id } = pkg;
            if (!package_id) continue;

            const [existing] = await db.query(
                `
                SELECT sb.booking_id
                FROM service_booking sb
                JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
                JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
                WHERE sb.user_id = ?
                  AND sbt.service_type_id = ?
                  AND sbp.package_id = ?
                LIMIT 1
                `,
                [user_id, service_type_id, package_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    message: `You have already booked package ID ${package_id} for this service type.`,
                });
            }
        }

        // ✅ 3. Insert booking with no vendor
        const [insertBooking] = await db.query(bookingPostQueries.insertBooking, [
            service_categories_id,
            serviceId,
            user_id,
            bookingDate,
            bookingTime,
            0,
            notes || null,
            bookingMedia || null,
            paymentIntentId || null
        ]);
        const booking_id = insertBooking.insertId;

        // ✅ 4. Link service type
        await db.query(
            "INSERT INTO service_booking_types (booking_id, service_type_id) VALUES (?, ?)",
            [booking_id, service_type_id]
        );

        // ✅ 5. Link packages & sub-packages
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages = [] } = pkg;

            await db.query(
                "INSERT INTO service_booking_packages (booking_id, package_id) VALUES (?, ?)",
                [booking_id, package_id]
            );

            for (const item of sub_packages) {
                if (!item.sub_package_id || item.price == null) continue;

                const quantity = item.quantity && Number.isInteger(item.quantity) && item.quantity > 0
                    ? item.quantity
                    : 1;

                await db.query(
                    "INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, price, quantity) VALUES (?, ?, ?, ?)",
                    [booking_id, item.sub_package_id, item.price, quantity]
                );
            }
        }

        // ✅ 6. Link preferences
        for (const pref of parsedPreferences || []) {
            const preference_id = typeof pref === 'object' ? pref.preference_id : pref;
            if (!preference_id) continue;

            await db.query(
                "INSERT INTO service_preferences (booking_id, preference_id) VALUES (?, ?)",
                [booking_id, preference_id]
            );
        }

        // ✅ 7. Mark payment complete if paid
        if (paymentIntentId) {
            await db.query(
                `UPDATE payments SET status = 'completed' WHERE payment_intent_id = ?`,
                [paymentIntentId]
            );
        }

        res.status(200).json({
            message: "Booking successfully created. Vendor will be assigned by admin.",
            booking_id,
            vendor_assigned: false
        });

    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});


const getVendorBookings = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [bookings] = await db.query(`
            SELECT
                sb.*,
                s.serviceName,
                sc.serviceCategory,
                st.serviceTypeName,
                p.status AS payment_status,
                p.amount AS payment_amount,
                p.currency AS payment_currency
            FROM service_booking sb
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
            WHERE sb.vendor_id = ?
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `, [vendor_id]);

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
        const [userBookings] = await db.query(`
            SELECT
                sb.booking_id,
                sb.bookingDate,
                sb.bookingTime,
                sb.bookingStatus,
                sb.notes,
                sb.bookingMedia,
                sb.payment_intent_id,

                sc.serviceCategory,
                s.serviceName,

                st.serviceTypeName,
                st.serviceTypeMedia,

                v.vendor_id,
                v.vendorType,

                idet.id AS individual_id,
                idet.name AS individual_name,
                idet.phone AS individual_phone,
                idet.email AS individual_email,

                cdet.id AS company_id,
                cdet.companyName AS company_name,
                cdet.contactPerson AS company_contact_person,
                cdet.companyEmail AS company_email,
                cdet.companyPhone AS company_phone,

                p.status AS payment_status,
                p.amount AS payment_amount,
                p.currency AS payment_currency

            FROM service_booking sb
            LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
            LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
            WHERE sb.user_id = ?
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `, [user_id]);

        for (const booking of userBookings) {
            const bookingId = booking.booking_id;

            // Packages
            const [bookingPackages] = await db.query(`
                SELECT
                    p.package_id,
                    p.packageName,
                    p.totalPrice,
                    p.totalTime,
                    p.packageMedia
                FROM service_booking_packages sbp
                JOIN packages p ON sbp.package_id = p.package_id
                WHERE sbp.booking_id = ?
            `, [bookingId]);

            // Items
            const [packageItems] = await db.query(`
                SELECT
                    sbsp.sub_package_id AS item_id,
                    pi.itemName,
                    sbsp.price,
                    sbsp.quantity,
                    pi.itemMedia,
                    pi.timeRequired,
                    pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                WHERE sbsp.booking_id = ?
            `, [bookingId]);

            const groupedPackages = bookingPackages.map(pkg => {
                const items = packageItems.filter(item => item.package_id === pkg.package_id);
                return { ...pkg, items };
            });

            // Preferences
            const [bookingPreferences] = await db.query(`
                SELECT
                    sp.preference_id,
                    bp.preferenceValue
                FROM service_preferences sp
                JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                WHERE sp.booking_id = ?
            `, [bookingId]);

            booking.packages = groupedPackages;
            booking.package_items = packageItems;
            booking.preferences = bookingPreferences;

            // Clean nulls
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
    const vendor_id = req.user.vendor_id;
    const { booking_id, status } = req.body;

    if (!booking_id || status === undefined) {
        return res.status(400).json({ message: "booking_id and status are required" });
    }


    if (![1, 2].includes(status)) {
        return res.status(400).json({ message: "Invalid status value. Use 1 for approve, 2 for cancel." });
    }

    try {
        const [result] = await db.query(bookingPutQueries.approveOrRejectBooking, [
            status,
            booking_id,
            vendor_id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Booking not found or unauthorized" });
        }

        res.status(200).json({
            message: `Booking ${status === 1 ? 'approved' : 'cancelled'} successfully`,
            booking_id,
            status
        });
    } catch (error) {
        console.error("Error approving/rejecting booking:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


module.exports = { bookService, getVendorBookings, getUserBookings, approveOrRejectBooking };
