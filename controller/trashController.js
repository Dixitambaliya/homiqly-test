const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");

const trashBookingByAdmin = asyncHandler(async (req, res) => {
    const { booking_id } = req.params;

    if (!booking_id) {
        return res.status(400).json({ error: "Booking ID is required" });
    }

    // Check if booking exists
    const [existing] = await db.query(
        "SELECT booking_id FROM service_booking WHERE booking_id = ?",
        [booking_id]
    );

    if (existing.length === 0) {
        return res.status(404).json({ error: `Booking with ID ${booking_id} not found` });
    }

    // Update trash flag
    await db.query(
        `UPDATE service_booking SET is_trashed = 1 WHERE booking_id = ?`,
        [booking_id]
    );

    return res.status(200).json({
        message: `Booking ${booking_id} moved to trash successfully`,
        trashed: true
    });
});

module.exports = { trashBookingByAdmin };