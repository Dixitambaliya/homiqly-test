const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const ratingGetQueries = require('../config/ratingQueries/ratingGetQueries');

const addVendorServiceRating = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const vendor_type = req.user.vendor_type; // "individual" or "company"
    const { service_id, rating, review } = req.body;

    if (!service_id || !rating) {
        return res.status(400).json({ message: "Service ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // ✅ Ensure the service is assigned to this vendor
        let serviceCheckQuery = "";
        if (vendor_type === "individual") {
            serviceCheckQuery = `
                SELECT 1 FROM individual_services
                WHERE vendor_id = ? AND service_id = ?
            `;
        } else if (vendor_type === "company") {
            serviceCheckQuery = `
                SELECT 1 FROM company_services
                WHERE vendor_id = ? AND service_id = ?
            `;
        } else {
            return res.status(400).json({ message: "Invalid vendor type" });
        }

        const [isAssigned] = await db.query(serviceCheckQuery, [vendor_id, service_id]);

        if (isAssigned.length === 0) {
            return res.status(403).json({ message: "You are not assigned to this service" });
        }

        // ✅ Prevent duplicate ratings
        const [existingRating] = await db.query(`
            SELECT rating_id FROM vendor_service_ratings
            WHERE vendor_id = ? AND service_id = ?
        `, [vendor_id, service_id]);

        if (existingRating.length > 0) {
            return res.status(400).json({ message: "You have already rated this service" });
        }

        // ✅ Submit the new rating
        await db.query(`
            INSERT INTO vendor_service_ratings (vendor_id, service_id, rating, review, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [vendor_id, service_id, rating, review]);

        res.status(201).json({ message: "Rating submitted successfully" });

    } catch (error) {
        console.error("Error submitting rating:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


const getVendorRatings = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [ratings] = await db.query(ratingGetQueries.getServiceRatings, [vendor_id]);
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

const addRatingToPackages = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { package_id, rating, review } = req.body;

    if (!package_id || !rating) {
        return res.status(400).json({ message: "Package ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // Check if user has booked this package
        const [booked] = await db.query(`
            SELECT 1 FROM service_booking_packages sbp
            JOIN service_booking sb ON sb.booking_id = sbp.booking_id
            WHERE sb.user_id = ? AND sbp.package_id = ?
        `, [user_id, package_id]);

        if (booked.length === 0) {
            return res.status(403).json({ message: "You can only rate packages you've booked." });
        }

        // Prevent duplicate rating
        const [existing] = await db.query(`
            SELECT rating_id FROM ratings
            WHERE user_id = ? AND package_id = ?
        `, [user_id, package_id]);

        if (existing.length > 0) {
            return res.status(400).json({ message: "You have already rated this package." });
        }

        // Insert the rating (no vendor or service_id)
        await db.query(`
            INSERT INTO ratings (user_id, package_id, rating, review, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [user_id, package_id, rating, review]);

        res.status(201).json({ message: "Rating for package submitted successfully" });
    } catch (error) {
        console.error("Error submitting package rating:", error);
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
                p.totalPrice,
                p.totalTime,
                st.serviceTypeName,
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


module.exports = {
    getVendorRatings,
    addVendorServiceRating,
    getAllRatings,
    addRatingToServiceType,
    addRatingToPackages,
    getBookedPackagesForRating,
    getVendorServicesForReview
};
