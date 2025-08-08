const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bookingPostQueries = require('../config/bookingQueries/bookingPostQueries');
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');
const bookingPutQueries = require('../config/bookingQueries/bookingPutQueries');
const { sendServiceBookingNotification,
    sendBookingNotificationToUser,
    sendBookingAssignedNotificationToVendor
} = require("../config/fcmNotifications/adminNotification")
const sendEmail = require('../config/mailer');


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
        // ✅ Prevent duplicate bookings
        for (const pkg of parsedPackages) {
            const { package_id } = pkg;
            if (!package_id) continue;

            const [existing] = await db.query(
                `SELECT sb.booking_id
         FROM service_booking sb
         JOIN service_booking_packages sbp ON sb.booking_id = sbp.booking_id
         JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
         WHERE sb.user_id = ? AND sbt.service_type_id = ? AND sbp.package_id = ? 
           AND sb.bookingStatus NOT IN (2, 4)
         LIMIT 1`,
                [user_id, service_type_id, package_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    message: `You have already booked package ID ${package_id} for this service type and it is not yet completed or rejected.`,
                });
            }
        }

        // ✅ Create booking (no paymentIntentId yet)
        const [insertBooking] = await db.query(
            `INSERT INTO service_booking (
        service_categories_id, service_id, user_id,
        bookingDate, bookingTime, vendor_id,
        notes, bookingMedia, payment_status
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            [
                service_categories_id,
                serviceId,
                user_id,
                bookingDate,
                bookingTime,
                notes || null,
                bookingMedia || null,
                "pending"
            ]
        );

        const booking_id = insertBooking.insertId;

        // Link service type
        await db.query(
            "INSERT INTO service_booking_types (booking_id, service_type_id) VALUES (?, ?)",
            [booking_id, service_type_id]
        );

        // Link packages + sub-packages
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages = [] } = pkg;

            await db.query(
                "INSERT INTO service_booking_packages (booking_id, package_id) VALUES (?, ?)",
                [booking_id, package_id]
            );

            for (const item of sub_packages) {
                if (!item.sub_package_id || item.price == null) continue;

                const quantity =
                    item.quantity && Number.isInteger(item.quantity) && item.quantity > 0
                        ? item.quantity
                        : 1;

                await db.query(
                    `INSERT INTO service_booking_sub_packages (booking_id, sub_package_id, price, quantity)
           VALUES (?, ?, ?, ?)`,
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

        // 🔔 ────────────────────────────────────────────────────────────────
        // NOTIFICATIONS: include WHO booked (only booking_id, user_id, name)

        // Fetch who booked
        try {
            const [userRows] = await db.query(
                `SELECT firstname, lastname FROM users WHERE user_id = ? LIMIT 1`,
                [user_id]
            );

            const bookedBy = userRows?.[0] || {};
            const userFullName = [bookedBy.firstname, bookedBy.lastname].filter(Boolean).join(" ") || `User #${user_id}`;

            // Admin broadcast notification (NO data field)
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

        } catch (err) {
            console.error("Error fetching user name for notification:", err.message);
        }

        // (Keep your existing email/push/etc.)
        await sendServiceBookingNotification(booking_id, service_type_id, user_id);

        res.status(200).json({
            message: "Booking created successfully.",
            booking_id,
            vendor_assigned: false,
            payment_status: "pending"
        });

    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getVendorBookings = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        // 🔹 Fetch latest platform fee percentage
        const [platformSettings] = await db.query(
            "SELECT platform_fee_percentage FROM platform_settings ORDER BY id DESC LIMIT 1"
        );
        const platformFee = platformSettings[0]?.platform_fee_percentage || 0;

        const [bookings] = await db.query(
            `
      SELECT
          sb.*,
          s.serviceName,
          sc.serviceCategory,
          st.serviceTypeName,
          sb.payment_status AS payment_status,
          p.amount AS payment_amount,
          p.currency AS payment_currency,
          CONCAT(u.firstName,' ', u.lastName) AS userName,
          u.profileImage AS userProfileImage,
          u.email AS userEmail,
          u.phone AS userPhone,
          u.address AS userAddress,
          u.state AS userState,
          u.postalcode AS userPostalCode,

          -- 🔹 Assigned Employee Info
          e.employee_id AS assignedEmployeeId,
          e.first_name AS employeeFirstName,
          e.last_name AS employeeLastName,
          e.email AS employeeEmail,
          e.phone AS employeePhone

      FROM service_booking sb
      LEFT JOIN services s ON sb.service_id = s.service_id
      LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
      LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
      LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
      LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
      LEFT JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN company_employees e ON sb.assigned_employee_id = e.employee_id
      WHERE sb.vendor_id = ?
      ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
      `,
            [vendor_id]
        );

        for (const booking of bookings) {
            const bookingId = booking.booking_id;

            // 🔹 Fetch Packages
            const [bookingPackages] = await db.query(
                `
        SELECT
            p.package_id,
            p.packageName,
            p.totalPrice,
            p.totalTime,
            p.packageMedia
        FROM service_booking_packages sbp
        JOIN packages p ON sbp.package_id = p.package_id
        WHERE sbp.booking_id = ?
      `,
                [bookingId]
            );

            // 🔹 Fetch Items with platform fee deducted from price
            const [packageItems] = await db.query(
                `
        SELECT
            sbsp.sub_package_id AS item_id,
            pi.itemName,
            sbsp.quantity,
            ROUND((sbsp.price * sbsp.quantity) * (1 - ? / 100), 2) AS price,
            pi.itemMedia,
            pi.timeRequired,
            pi.package_id
        FROM service_booking_sub_packages sbsp
        LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
        WHERE sbsp.booking_id = ?
      `,
                [platformFee, bookingId]
            );

            // 🔹 Group items under packages
            const groupedPackages = bookingPackages.map((pkg) => {
                const items = packageItems.filter(
                    (item) => item.package_id === pkg.package_id
                );
                return { ...pkg, items };
            });

            // 🔹 Fetch Preferences
            const [bookingPreferences] = await db.query(
                `
        SELECT
            sp.preference_id,
            bp.preferenceValue
        FROM service_preferences sp
        JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
        WHERE sp.booking_id = ?
      `,
                [bookingId]
            );

            booking.packages = groupedPackages;
            booking.package_items = packageItems;
            booking.preferences = bookingPreferences;

            // 🔹 Combine employee info
            if (booking.assignedEmployeeId) {
                booking.assignedEmployee = {
                    employee_id: booking.assignedEmployeeId,
                    name: `${booking.employeeFirstName} ${booking.employeeLastName}`,
                    email: booking.employeeEmail,
                    phone: booking.employeePhone,
                };
            }

            // 🔹 Clean unnecessary fields
            delete booking.assignedEmployeeId;
            delete booking.employeeFirstName;
            delete booking.employeeLastName;
            delete booking.employeeEmail;
            delete booking.employeePhone;

            Object.keys(booking).forEach((key) => {
                if (booking[key] === null) delete booking[key];
            });
        }

        res.status(200).json({
            message: "Vendor bookings fetched successfully",
            bookings,
        });
    } catch (error) {
        console.error("Error fetching vendor bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

const getUserBookings = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const [userBookings] = await db.query(bookingGetQueries.userGetBooking, [user_id]);

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
            console.log("vendor_id:", vendor_id, "vendorType:", vendorType);

            let query = '';
            if (vendorType === 'individual') {
                query = `SELECT name FROM individual_details WHERE vendor_id = ?`;
            } else if (vendorType === 'company') {
                query = `SELECT companyName AS name FROM company_details WHERE vendor_id = ?`;
            }

            if (query) {
                const [rows] = await connection.query(query, [vendor_id]);
                console.log("Fetched vendor rows:", rows);

                if (rows.length > 0) {
                    vendorName = rows[0].name;
                }
            }

            console.log("Final vendorName:", vendorName);

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
                    `Hi ${vendorName}, ${vendor_id} you have been assigned a new booking (#${booking_id}).`,
                ]
            );

        } catch (err) {
            console.error(`⚠️ Failed to insert admin notification for booking_id ${booking_id}:`, err.message);
        }

        try {
            await sendBookingAssignedNotificationToVendor(vendor_id, booking_id);
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

module.exports = {
    bookService,
    getVendorBookings,
    getUserBookings,
    approveOrRejectBooking,
    assignBookingToVendor,
    getEligiblevendors,
    approveOrAssignBooking
};
