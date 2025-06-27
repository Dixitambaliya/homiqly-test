const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const ratingGetQueries = require('../config/ratingQueries/ratingGetQueries');

const addRating = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { booking_id, vendor_id, rating, review } = req.body;

    if (!booking_id || !vendor_id || !rating) {
        return res.status(400).json({ message: "Booking ID, vendor ID, and rating are required" });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // Check if user has already rated this booking
        const [existingRating] = await db.query(`
            SELECT rating_id FROM ratings 
            WHERE booking_id = ? AND user_id = ?
        `, [booking_id, user_id]);

        if (existingRating.length > 0) {
            return res.status(400).json({ message: "You have already rated this service" });
        }

        // Verify booking belongs to user and is completed
        const [booking] = await db.query(`
            SELECT booking_id FROM service_booking 
            WHERE booking_id = ? AND user_id = ? AND bookingStatus = 1
        `, [booking_id, user_id]);

        if (booking.length === 0) {
            return res.status(400).json({ message: "Invalid booking or service not completed" });
        }

        // Add rating
        await db.query(`
            INSERT INTO ratings (booking_id, user_id, vendor_id, rating, review, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [booking_id, user_id, vendor_id, rating, review]);

        res.status(201).json({
            message: "Rating added successfully"
        });

    } catch (error) {
        console.error("Error adding rating:", error);
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

module.exports = {
    addRating,
    getVendorRatings,
    getAllRatings
};