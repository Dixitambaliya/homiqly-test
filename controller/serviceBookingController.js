const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');

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
        preferences
    } = req.body;

    const bookingMedia = req.uploadedFiles?.bookingMedia?.[0]?.url || null;

    if (!service_categories_id || !serviceId || !service_type_id || !bookingDate || !bookingTime) {
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
        // Check if user already booked this slot
        const [existingBooking] = await db.query(
            bookingPostQueries.checkUserBookingSlot,
            [user_id, serviceId, bookingDate, bookingTime]
        );
        if (existingBooking.length > 0) {
            return res.status(409).json({ message: "You already booked this service for the selected slot." });
        }

        // Get vendor from service_type
        const [vendorResult] = await db.query(
            bookingGetQueries.getVendorByServiceTypeId,
            [service_type_id]
        );
        if (!vendorResult.length) {
            return res.status(400).json({ message: "Vendor not found for selected service type." });
        }

        const vendor_id = vendorResult[0].vendor_id;

        // Check vendor availability
        const [availability] = await db.query(
            bookingPostQueries.checkVendorAvailability,
            [vendor_id, bookingDate, bookingTime]
        );
        if (availability.length > 0) {
            return res.status(409).json({ message: "Vendor is not available at this time slot." });
        }

        // Validate packages against vendor_packages
        for (const pkg of parsedPackages) {
            const { package_id } = pkg;
            if (!package_id) continue;

            const [assigned] = await db.query(
                `SELECT * FROM vendor_packages WHERE vendor_id = ? AND package_id = ?`,
                [vendor_id, package_id]
            );
            if (assigned.length === 0) {
                return res.status(400).json({ message: `Package ID ${package_id} is not assigned to this vendor.` });
            }
        }

        // Insert booking
        const [insertBooking] = await db.query(bookingPostQueries.insertBooking, [
            service_categories_id,
            serviceId,
            vendor_id,
            user_id,
            bookingDate,
            bookingTime,
            0,
            notes || null,
            bookingMedia || null
        ]);
        const booking_id = insertBooking.insertId;

        // Link service_type
        await db.query(
            "INSERT INTO service_booking_types (booking_id, service_type_id) VALUES (?, ?)",
            [booking_id, service_type_id]
        );

        // Link packages and items
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

        // Link preferences
        for (const pref of parsedPreferences || []) {
            const preference_id = typeof pref === 'object' ? pref.preference_id : pref;
            if (!preference_id) continue;

            await db.query(
                "INSERT INTO service_preferences (booking_id, preference_id) VALUES (?, ?)",
                [booking_id, preference_id]
            );
        }

        res.status(200).json({
            message: "Booking successfully created",
            booking_id
        });

    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getVendorBookings = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [bookings] = await db.query(bookingGetQueries.getVendorBookings, [vendor_id]);

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
        // Step 1: Get all bookings for the user
        const [userBookings] = await db.query(`
            SELECT
                service_booking.booking_id,
                service_booking.bookingDate,
                service_booking.bookingTime,
                service_booking.bookingStatus,
                service_booking.notes,
                service_booking.bookingMedia,

                service_categories.serviceCategory,
                services.serviceName,

                service_type.serviceTypeName,
                service_type.serviceTypeMedia,
                service_type.is_approved,

                vendors.vendor_id,
                vendors.vendorType,

                individual_details.id AS individual_id,
                individual_details.name AS individual_name,
                individual_details.phone AS individual_phone,
                individual_details.email AS individual_email,

                company_details.id AS company_id,
                company_details.companyName AS company_name,
                company_details.contactPerson AS company_contact_person,
                company_details.companyEmail AS company_email,
                company_details.companyPhone AS company_phone

            FROM service_booking
            LEFT JOIN service_categories ON service_booking.service_categories_id = service_categories.service_categories_id
            LEFT JOIN services ON service_booking.service_id = services.service_id
            LEFT JOIN service_booking_types ON service_booking.booking_id = service_booking_types.booking_id
            LEFT JOIN service_type ON service_booking_types.service_type_id = service_type.service_type_id
            LEFT JOIN vendors ON service_booking.vendor_id = vendors.vendor_id
            LEFT JOIN individual_details ON vendors.vendor_id = individual_details.vendor_id
            LEFT JOIN company_details ON vendors.vendor_id = company_details.vendor_id
            WHERE service_booking.user_id = ?
            ORDER BY service_booking.bookingDate DESC, service_booking.bookingTime DESC
        `, [user_id]);

        for (const booking of userBookings) {
            const bookingId = booking.booking_id;

            // Fetch packages
            const [bookingPackages] = await db.query(`
                SELECT
                    packages.package_id,
                    packages.packageName,
                    packages.totalPrice,
                    packages.totalTime,
                    packages.packageMedia
                FROM service_booking_packages
                JOIN packages ON service_booking_packages.package_id = packages.package_id
                WHERE service_booking_packages.booking_id = ?
            `, [bookingId]);

            // Fetch package items
            const [packageItems] = await db.query(`
                SELECT
                    service_booking_sub_packages.sub_package_id AS item_id,
                    package_items.itemName,
                    service_booking_sub_packages.price,
                    package_items.itemMedia,
                    package_items.timeRequired,
                    package_items.package_id
                FROM service_booking_sub_packages
                LEFT JOIN package_items ON service_booking_sub_packages.sub_package_id = package_items.item_id
                WHERE service_booking_sub_packages.booking_id = ?
            `, [bookingId]);

            // Group items under each package
            const groupedPackages = bookingPackages.map(packageData => {
                const itemsForThisPackage = packageItems.filter(item => item.package_id === packageData.package_id);
                return {
                    ...packageData,
                    items: itemsForThisPackage
                };
            });

            // Fetch preferences
            const [bookingPreferences] = await db.query(`
                SELECT
                    service_preferences.preference_id,
                    booking_preferences.preferenceValue
                FROM service_preferences
                JOIN booking_preferences ON service_preferences.preference_id = booking_preferences.preference_id
                WHERE service_preferences.booking_id = ?
            `, [bookingId]);

            // Attach nested and extra data
            booking.packages = groupedPackages;
            booking.package_items = packageItems; // top-level array
            booking.preferences = bookingPreferences;

            // Remove null values from booking object
            Object.keys(booking).forEach(key => {
                if (booking[key] === null) {
                    delete booking[key];
                }
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
