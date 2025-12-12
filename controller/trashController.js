const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");

const trashBookingByAdmin = asyncHandler(async (req, res) => {
    let { booking_id } = req.body;

    // Validate input
    if (!booking_id || !Array.isArray(booking_id) || booking_id.length === 0) {
        return res.status(400).json({
            error: "booking_id must be an array of IDs"
        });
    }

    // Remove duplicates
    booking_id = [...new Set(booking_id)];

    // Step 1: Check existing booking IDs
    const placeholders = booking_id.map(() => "?").join(",");
    const [existingRows] = await db.query(
        `SELECT booking_id FROM service_booking WHERE booking_id IN (${placeholders})`,
        booking_id
    );

    const existingIds = existingRows.map(row => row.booking_id);

    if (existingIds.length === 0) {
        return res.status(404).json({
            error: "No valid booking IDs found",
            booking_id
        });
    }

    // Step 2: Trash only existing IDs
    const updatePlaceholders = existingIds.map(() => "?").join(",");
    await db.query(
        `UPDATE service_booking SET is_trashed = 1 
         WHERE booking_id IN (${updatePlaceholders})`,
        existingIds
    );

    // Step 3: IDs not found in database

    return res.status(200).json({
        message: "Selected bookings moved to trash successfully",
        trashed_ids: existingIds
    });
});




module.exports = { trashBookingByAdmin };