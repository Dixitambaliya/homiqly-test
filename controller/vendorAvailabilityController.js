const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");

const setAvailability = asyncHandler(async (req, res) => {
    try {
        const vendor_id = req.user.vendor_id
        const { startDate, endDate, startTime, endTime } = req.body;

        if (!vendor_id || !startDate || !endDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Optional: Validate date/time logic
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date" });
        }

        // Insert availability
        await db.query(
            `INSERT INTO vendor_availability (vendor_id, startDate, endDate, startTime, endTime)
             VALUES (?, ?, ?, ?, ?)`,
            [vendor_id, startDate, endDate, startTime, endTime]
        );

        res.status(201).json({ message: "Availability set successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error setting availability", error });
    }
});

const getAvailability = asyncHandler(async (req, res) => {
    try {
        const vendor_id = req.user.vendor_id;

        const [availability] = await db.query(
            "SELECT * FROM vendor_availability WHERE vendor_id = ? ORDER BY startDate ASC",
            [vendor_id]
        );

        res.json({ vendor_id: vendor_id, availabilities: availability });
    } catch (error) {
        res.status(500).json({ message: "Error fetching availability", error });
    }
});


module.exports = {
    setAvailability,
    getAvailability
};