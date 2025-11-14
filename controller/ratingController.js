const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const ratingGetQueries = require('../config/ratingQueries/ratingGetQueries');

const vendorRatesUser = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { booking_id, rating, review } = req.body;

    if (!booking_id || !rating) {
        return res.status(400).json({ message: "booking_id and rating are required" });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // ✅ Get user_id and service_id from this booking
        const [bookingRows] = await db.query(
            `SELECT user_id, service_id FROM service_booking WHERE booking_id = ? AND vendor_id = ?`,
            [booking_id, vendor_id]
        );

        if (bookingRows.length === 0) {
            return res.status(403).json({ message: "You are not authorized to rate this booking" });
        }

        const { user_id, service_id } = bookingRows[0];

        // ✅ Check if rating already exists
        const [existingRows] = await db.query(
            `SELECT * FROM vendor_service_ratings WHERE booking_id = ? AND vendor_id = ?`,
            [booking_id, vendor_id]
        );

        if (existingRows.length > 0) {
            return res.status(400).json({ message: "Rating already submitted for this booking" });
        }

        // ✅ Insert rating with service_id
        await db.query(
            `INSERT INTO vendor_service_ratings (booking_id, vendor_id, user_id, service_id, rating, review)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [booking_id, vendor_id, user_id, service_id, rating, review]
        );

        res.status(201).json({ message: "Rating submitted successfully" });

    } catch (error) {
        console.error("Error submitting rating:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorRatings = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        // Fetch detailed service ratings
        const [ratings] = await db.query(ratingGetQueries.getServiceRatings, [vendor_id]);

        // Fetch average rating and total reviews
        const [avgRating] = await db.query(ratingGetQueries.getVendorAverageRating, [vendor_id]);

        res.status(200).json({
            message: "Vendor ratings fetched successfully",
            ratings,
            average_rating: avgRating[0]?.average_rating || 0,
            total_reviews: avgRating[0]?.total_reviews || 0
        });

    } catch (error) {
        console.error("Error fetching vendor ratings:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllRatings = asyncHandler(async (req, res) => {
    try {
        const [ratings] = await db.query(ratingGetQueries.getAllRatings);

        res.status(200).json({
            message: "All ratings fetched successfully",
            ratings
        });

    } catch (error) {
        console.error("Error fetching all ratings:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const addRatingToServiceType = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { vendor_id, service_id, service_type_id, rating, review } = req.body;

    if (!vendor_id || !service_id || !service_type_id || !rating) {
        return res.status(400).json({
            message: "Vendor ID, service ID, service type ID, and rating are required"
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // Prevent duplicate rating for this service type by the same user
        const [existing] = await db.query(`
            SELECT rating_id FROM ratings
            WHERE user_id = ? AND service_type_id = ? AND package_id IS NULL
        `, [user_id, service_type_id]);

        if (existing.length > 0) {
            return res.status(400).json({ message: "You have already rated this service type." });
        }

        await db.query(`
            INSERT INTO ratings (user_id, vendor_id, service_id, service_type_id, rating, review, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [user_id, vendor_id, service_id, service_type_id, rating, review]);

        res.status(201).json({ message: "Service type rating submitted successfully" });
    } catch (error) {
        console.error("Error submitting rating for service type:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const addRatingToBooking = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { booking_id, rating, review } = req.body;

    if (!booking_id || !rating) {
        return res.status(400).json({ message: "Booking ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // 1️⃣ Verify the booking belongs to this user and get vendor_id
        const [bookingInfo] = await db.query(
            `SELECT vendor_id
             FROM service_booking
             WHERE user_id = ? AND booking_id = ?`,
            [user_id, booking_id]
        );

        if (bookingInfo.length === 0) {
            return res.status(403).json({ message: "You can only rate your own bookings." });
        }

        const vendor_id = bookingInfo[0].vendor_id;

        // 2️⃣ Check if the user already rated this booking
        const [existingRatings] = await db.query(
            `SELECT rating_id FROM ratings WHERE user_id = ? AND booking_id = ?`,
            [user_id, booking_id]
        );

        if (existingRatings.length > 0) {
            return res.status(400).json({ message: "You have already rated this booking." });
        }

        // 3️⃣ Fetch all package_ids linked to this booking
        const [packages] = await db.query(
            `SELECT DISTINCT package_id
             FROM service_booking_packages
             WHERE booking_id = ?`,
            [booking_id]
        );

        if (packages.length === 0) {
            return res.status(404).json({ message: "No packages found for this booking." });
        }

        // 4️⃣ Prepare bulk insert values with vendor_id
        const values = packages.map(pkg => [
            user_id,
            booking_id,
            pkg.package_id,
            vendor_id,
            rating,
            review || null,
            new Date()
        ]);

        // 5️⃣ Insert into ratings including vendor_id
        await db.query(
            `INSERT INTO ratings (user_id, booking_id, package_id, vendor_id, rating, review, created_at)
             VALUES ?`,
            [values]
        );

        res.status(201).json({
            message: "✅ Rating submitted successfully for all packages in this booking.",
            vendor_id,
            packagesRated: packages.map(p => p.package_id)
        });

    } catch (error) {
        console.error("❌ Error submitting package rating:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


const getBookedPackagesForRating = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const [packages] = await db.query(`
            SELECT
                sbp.package_id,
                p.packageName,
                sbp.booking_id,
                s.serviceName
            FROM service_booking_packages sbp
            JOIN service_booking sb ON sb.booking_id = sbp.booking_id
            JOIN packages p ON sbp.package_id = p.package_id
            JOIN service_type st ON p.service_type_id = st.service_type_id
            JOIN services s ON st.service_id = s.service_id
            WHERE sb.user_id = ?
            GROUP BY sbp.package_id
        `, [user_id]);

        res.status(200).json({ bookedPackages: packages });
    } catch (error) {
        console.error("Error fetching booked packages:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorServicesForReview = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const vendor_type = req.user.vendor_type; // "individual" or "company"

    try {
        let serviceQuery = "";

        if (vendor_type === "individual") {
            serviceQuery = `
                SELECT s.service_id, s.serviceName, s.serviceImage
                FROM individual_services vs
                JOIN services s ON vs.service_id = s.service_id
                WHERE vs.vendor_id = ?
            `;
        } else if (vendor_type === "company") {
            serviceQuery = `
                SELECT s.service_id, s.serviceName, s.serviceImage
                FROM company_services vs
                JOIN services s ON vs.service_id = s.service_id
                WHERE vs.vendor_id = ?
            `;
        } else {
            return res.status(400).json({ message: "Invalid vendor type" });
        }

        const [services] = await db.query(serviceQuery, [vendor_id]);

        res.status(200).json({ services });

    } catch (error) {
        console.error("Error fetching vendor services:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getPackageRatings = asyncHandler(async (req, res) => {
    try {
        const [ratings] = await db.query(
            `SELECT
                r.rating_id,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,
                r.package_id,
                p.packageName,
                r.rating,
                r.vendor_id,
                r.review,
                r.created_at,


                COALESCE(id.name, cd.companyName) AS vendor_name,
                COALESCE(id.email, cd.companyEmail) AS vendor_email,
                COALESCE(id.phone, cd.companyPhone) AS vendor_phone

            FROM ratings r
            LEFT JOIN users u ON r.user_id = u.user_id
            LEFT JOIN packages p ON r.package_id = p.package_id
            LEFT JOIN vendors v ON r.vendor_id = v.vendor_id
            LEFT JOIN individual_details id ON r.vendor_id = id.vendor_id
            LEFT JOIN company_details cd ON r.vendor_id = cd.vendor_id

            ORDER BY r.created_at DESC`
        );
        
        res.status(200).json({
            message: "Package ratings fetched successfully",
            rating: ratings,
        });
    } catch (error) {
        console.error("Error fetching package ratings:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

const getPackageAverageRating = asyncHandler(async (req, res) => {
    const { package_id } = req.params;

    try {
        // 1. Get package details with average rating and total review count
        const [packageRows] = await db.query(
            `SELECT
                p.packageName,
                p.packageMedia,
                AVG(r.rating) AS average_rating,
                COUNT(r.rating_id) AS total_reviews
            FROM packages p
            LEFT JOIN ratings r ON p.package_id = r.package_id
            WHERE p.package_id = ?
            GROUP BY p.package_id`,
            [package_id]
        );

        if (packageRows.length === 0) {
            return res.status(404).json({ message: "Package not found" });
        }

        const packageData = packageRows[0];

        // 2. Get individual reviews with user names
        const [reviews] = await db.query(
            `SELECT
                r.rating_id,
                r.user_id,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,
                r.rating,
                r.review,
                r.created_at
            FROM ratings r
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE r.package_id = ?
            ORDER BY r.created_at DESC`,
            [package_id]
        );

        // 3. Send combined result
        res.status(200).json({
            message: "Package reviews fetched successfully",
            review: {
                packageName: packageData.packageName,
                packageMedia: packageData.packageMedia,
                average_rating: parseFloat(packageData.average_rating || 0).toFixed(2),
                total_reviews: packageData.total_reviews || 0,
                rating: reviews || []
            }
        });

    } catch (error) {
        console.error("Error fetching full package review info:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

const getAllVendorRatings = asyncHandler(async (req, res) => {
    try {
        const [ratings] = await db.query(`
        SELECT
            vsr.rating_id,
            vsr.booking_id,
            vsr.user_id,
            vsr.vendor_id,
            vsr.service_id,
            vsr.rating,
            vsr.review,
            vsr.created_at,

            CONCAT(u.firstName, ' ', u.lastName) AS user_name,
            s.serviceName,
            sc.serviceCategory,

            v.vendorType,

            CONCAT_WS(' ', id.name, cd.companyName) AS vendor_name,
            CONCAT_WS(' ', id.email, cd.companyEmail) AS vendor_email,
            CONCAT_WS(' ', id.phone, cd.companyPhone) AS vendor_phone


        FROM vendor_service_ratings vsr
        JOIN users u ON vsr.user_id = u.user_id
        JOIN services s ON vsr.service_id = s.service_id
        JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
        JOIN vendors v ON vsr.vendor_id = v.vendor_id
        LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id AND v.vendorType = 'individual'
        LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id AND v.vendorType = 'company'
        ORDER BY vsr.created_at DESC
        `);

        res.status(200).json({
            message: "All vendor ratings fetched successfully",
            ratings
        });
    } catch (error) {
        console.error("Error fetching all vendor ratings:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


module.exports = {
    getVendorRatings,
    vendorRatesUser,
    getAllRatings,
    addRatingToServiceType,
    addRatingToBooking,
    getBookedPackagesForRating,
    getVendorServicesForReview,
    getPackageRatings,
    getPackageAverageRating,
    getAllVendorRatings
};
