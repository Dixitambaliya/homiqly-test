const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const moment = require('moment-timezone');

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

        // 🧠 Format date and time nicely using Moment
        const formattedAvailability = availability.map((item) => ({
            ...item,
            startDate: moment(item.startDate).format("YYYY-MM-DD"),
            endDate: moment(item.endDate).format("YYYY-MM-DD"),
            startTime: moment(item.startTime, "HH:mm:ss").format("HH:mm"),
            endTime: moment(item.endTime, "HH:mm:ss").format("HH:mm"),
            created_at: moment(item.created_at).format("YYYY-MM-DD HH:mm"),
            updated_at: moment(item.updated_at).format("YYYY-MM-DD HH:mm"),
        }));

        res.json({ vendor_id, availabilities: formattedAvailability });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching availability", error });
    }
});

const editAvailability = asyncHandler(async (req, res) => {
    try {
        const vendor_id = req.user.vendor_id;
        const { vendor_availability_id } = req.params;
        const { startDate, endDate, startTime, endTime } = req.body;

        if (!startDate || !endDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date" });
        }

        const formattedStartTime = moment(startTime, ["HH:mm", "hh:mm A"]).format("HH:mm:ss");
        const formattedEndTime = moment(endTime, ["HH:mm", "hh:mm A"]).format("HH:mm:ss");

        // ✅ Check if availability exists
        const [existing] = await db.query(
            "SELECT * FROM vendor_availability WHERE vendor_availability_id = ? AND vendor_id = ?",
            [vendor_availability_id, vendor_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Availability not found or not authorized" });
        }

        // ✅ Check for booked dates in the new range
        const [bookings] = await db.query(
            `
            SELECT DATE(bookingDate) AS bookedDate
            FROM service_booking
            WHERE vendor_id = ?
              AND bookingStatus NOT IN ('2', '4') -- exclude cancelled/completed
              AND bookingDate BETWEEN ? AND ?
            `,
            [vendor_id, startDate, endDate]
        );

        if (bookings.length > 0) {
            const bookedDates = bookings.map(b => moment(b.bookedDate).format("YYYY-MM-DD"));
            return res.status(400).json({
                message: "Cannot update availability — there are existing bookings within the selected range.",
                bookedDates
            });
        }

        // ✅ Safe to update (no bookings in this range)
        await db.query(
            `
            UPDATE vendor_availability
            SET startDate = ?, endDate = ?, startTime = ?, endTime = ?
            WHERE vendor_availability_id = ? AND vendor_id = ?
            `,
            [startDate, endDate, formattedStartTime, formattedEndTime, vendor_availability_id, vendor_id]
        );

        res.json({ message: "Availability updated successfully", updatedRange: { startDate, endDate } });
    } catch (error) {
        console.error("Error updating availability:", error);
        res.status(500).json({ message: "Error updating availability", error });
    }
});

const deleteAvailability = asyncHandler(async (req, res) => {
    try {
        const { vendor_availability_id } = req.params;
        await db.query("DELETE FROM vendor_availability WHERE vendor_availability_id = ?", [vendor_availability_id]);
        res.json({ message: "Availability deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting availability", error });
    }
});


module.exports = {
    setAvailability,
    getAvailability,
    deleteAvailability,
    editAvailability
};