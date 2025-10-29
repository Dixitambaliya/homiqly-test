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

        // 🧾 1️⃣ Fetch existing availability
        const [existing] = await db.query(
            `SELECT * FROM vendor_availability WHERE vendor_availability_id = ? AND vendor_id = ?`,
            [vendor_availability_id, vendor_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Availability not found or not authorized" });
        }

        const oldStartDate = existing[0].startDate;
        const oldEndDate = existing[0].endDate;

        // 🧾 2️⃣ Fetch all bookings in the old availability range
        const [bookings] = await db.query(
            `
            SELECT DATE(bookingDate) AS bookedDate
            FROM service_booking
            WHERE vendor_id = ?
              AND bookingStatus NOT IN ('2', '4') -- exclude cancelled/completed
              AND bookingDate BETWEEN ? AND ?
            `,
            [vendor_id, oldStartDate, oldEndDate]
        );

        // 🧩 3️⃣ Check if any existing booked date falls outside new availability
        const restrictedDates = bookings.filter(b => {
            const bookedDate = new Date(b.bookedDate);
            return bookedDate < new Date(startDate) || bookedDate > new Date(endDate);
        });

        if (restrictedDates.length > 0) {
            const bookedDates = restrictedDates.map(b => moment(b.bookedDate).format("YYYY-MM-DD"));
            return res.status(400).json({
                message: "Cannot update — You have bookings within the selected time slot",
                bookedDates
            });
        }

        // ✅ 4️⃣ Update safely (no conflict with booked dates)
        await db.query(
            `
            UPDATE vendor_availability
            SET startDate = ?, endDate = ?, startTime = ?, endTime = ?
            WHERE vendor_availability_id = ? AND vendor_id = ?
            `,
            [startDate, endDate, formattedStartTime, formattedEndTime, vendor_availability_id, vendor_id]
        );

        res.json({
            message: "Availability updated successfully",
            updatedRange: { startDate, endDate, startTime: formattedStartTime, endTime: formattedEndTime }
        });

    } catch (error) {
        console.error("Error updating availability:", error);
        res.status(500).json({ message: "Error updating availability", error });
    }
});

const deleteAvailability = asyncHandler(async (req, res) => {
    try {
        const vendor_id = req.user.vendor_id;
        const { vendor_availability_id } = req.params;
        const { deleteStartDate, deleteEndDate } = req.body; // 👈 input dates to delete

        if (!deleteStartDate) {
            return res.status(400).json({ message: "deleteStartDate is required" });
        }

        // If deleteEndDate not provided, treat it as single day deletion
        const delStart = moment(deleteStartDate, "YYYY-MM-DD");
        const delEnd = deleteEndDate ? moment(deleteEndDate, "YYYY-MM-DD") : delStart;

        // Fetch existing record
        const [existingRows] = await db.query(
            "SELECT * FROM vendor_availability WHERE vendor_availability_id = ? AND vendor_id = ?",
            [vendor_availability_id, vendor_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Availability not found or not authorized" });
        }

        const existing = existingRows[0];
        const start = moment(existing.startDate);
        const end = moment(existing.endDate);

        // ❌ Check if delete range falls within existing range
        if (delStart.isBefore(start) || delEnd.isAfter(end)) {
            return res.status(400).json({
                message: "Delete range must be within existing availability period"
            });
        }

        // 🧩 Case 1: Delete entire range
        if (delStart.isSame(start) && delEnd.isSame(end)) {
            await db.query(
                "DELETE FROM vendor_availability WHERE vendor_availability_id = ?",
                [vendor_availability_id]
            );
            return res.json({ message: "Entire availability deleted successfully" });
        }

        // 🧩 Case 2: Delete beginning part (e.g. deleting 01-10-2025 → 03-10-2025)
        if (delStart.isSame(start) && delEnd.isBefore(end)) {
            const newStart = delEnd.clone().add(1, "day").format("YYYY-MM-DD");
            await db.query(
                "UPDATE vendor_availability SET startDate = ? WHERE vendor_availability_id = ?",
                [newStart, vendor_availability_id]
            );
            return res.json({
                message: "Availability updated after partial deletion (beginning trimmed)",
                updatedRange: { startDate: newStart, endDate: existing.endDate }
            });
        }

        // 🧩 Case 3: Delete ending part (e.g. deleting 08-10-2025 → 10-10-2025)
        if (delStart.isAfter(start) && delEnd.isSame(end)) {
            const newEnd = delStart.clone().subtract(1, "day").format("YYYY-MM-DD");
            await db.query(
                "UPDATE vendor_availability SET endDate = ? WHERE vendor_availability_id = ?",
                [newEnd, vendor_availability_id]
            );
            return res.json({
                message: "Availability updated after partial deletion (ending trimmed)",
                updatedRange: { startDate: existing.startDate, endDate: newEnd }
            });
        }

        // 🧩 Case 4: Delete middle part (split into two)
        if (delStart.isAfter(start) && delEnd.isBefore(end)) {
            const leftRangeEnd = delStart.clone().subtract(1, "day").format("YYYY-MM-DD");
            const rightRangeStart = delEnd.clone().add(1, "day").format("YYYY-MM-DD");

            // Update existing to left part
            await db.query(
                "UPDATE vendor_availability SET endDate = ? WHERE vendor_availability_id = ?",
                [leftRangeEnd, vendor_availability_id]
            );

            // Create new right part
            await db.query(
                `
                INSERT INTO vendor_availability (vendor_id, startDate, endDate, startTime, endTime)
                VALUES (?, ?, ?, ?, ?)
                `,
                [vendor_id, rightRangeStart, existing.endDate, existing.startTime, existing.endTime]
            );

            return res.json({
                message: "Availability split successfully after partial deletion",
                // newRanges: [
                //     { startDate: existing.startDate, endDate: leftRangeEnd },
                //     { startDate: rightRangeStart, endDate: existing.endDate }
                // ]
            });
        }

        return res.status(400).json({ message: "Invalid delete range" });
    } catch (error) {
        console.error("Error deleting availability:", error);
        res.status(500).json({ message: "Error deleting availability", error });
    }
});



module.exports = {
    setAvailability,
    getAvailability,
    deleteAvailability,
    editAvailability
};