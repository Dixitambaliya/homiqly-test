const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const moment = require('moment-timezone');

const setAvailability = asyncHandler(async (req, res) => {
    try {
        const vendor_id = req.user.vendor_id;
        const { startDate, endDate, startTime, endTime } = req.body;

        if (!vendor_id || !startDate || !endDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Validate date logic
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date" });
        }

        // ✅ Check for overlapping availability for this vendor
        const [existing] = await db.query(
            `
      SELECT *
      FROM vendor_availability
      WHERE vendor_id = ?
      AND (
          (? BETWEEN startDate AND endDate OR ? BETWEEN startDate AND endDate)
          OR
          (startDate BETWEEN ? AND ? OR endDate BETWEEN ? AND ?)
      )
      AND (
          (TIME(?) < endTime AND TIME(?) > startTime)
          OR
          (TIME(startTime) < ? AND TIME(endTime) > ?)
      )
      `,
            [
                vendor_id,
                startDate, endDate,
                startDate, endDate,
                startDate, endDate,
                startTime, endTime,
                endTime, startTime
            ]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                message: "Availability already exists or overlaps with an existing time slot"
            });
        }

        // ✅ Insert new availability
        await db.query(
            `
      INSERT INTO vendor_availability (vendor_id, startDate, endDate, startTime, endTime)
      VALUES (?, ?, ?, ?, ?)
      `,
            [vendor_id, startDate, endDate, startTime, endTime]
        );

        res.status(201).json({ message: "Availability set successfully" });
    } catch (error) {
        console.error("Error setting availability:", error);
        res.status(500).json({ message: "Error setting availability", error: error.message });
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
        const { startDate, endDate } = req.body || {}; // ensure safe destructure

        // 🧩 Fetch existing availability
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

        // 🟢 If body is empty OR no startDate/endDate provided — delete entire availability
        const isFullDelete =
            !startDate && !endDate &&
            Object.keys(req.body || {}).length === 0;

        if (isFullDelete) {
            // 🚫 Check for existing bookings
            const [bookings] = await db.query(
                `
                SELECT booking_id, bookingDate
                FROM service_booking
                WHERE vendor_id = ?
                  AND bookingStatus NOT IN ('2', '4')
                  AND bookingDate BETWEEN ? AND ?
                `,
                [vendor_id, start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")]
            );

            if (bookings.length > 0) {
                const bookedDates = bookings.map(b => moment(b.bookingDate).format("YYYY-MM-DD"));
                return res.status(400).json({
                    message: "Cannot delete entire availability — bookings exist within this date range.",
                    bookedDates
                });
            }

            // ✅ Safe to delete entire record
            await db.query(
                "DELETE FROM vendor_availability WHERE vendor_availability_id = ?",
                [vendor_availability_id]
            );

            return res.json({ message: "Entire availability deleted successfully" });
        }

        // 🧠 Validate input date range
        if (!startDate || !moment(startDate, "YYYY-MM-DD", true).isValid()) {
            return res.status(400).json({ message: "Invalid or missing startDate" });
        }

        const delStart = moment(startDate, "YYYY-MM-DD");
        const delEnd = endDate
            ? moment(endDate, "YYYY-MM-DD")
            : delStart;

        if (delStart.isBefore(start) || delEnd.isAfter(end)) {
            return res.status(400).json({
                message: "Delete range must fall within the existing availability period"
            });
        }

        // 🛑 Step 1: Check for active bookings within delete range
        const [bookings] = await db.query(
            `
            SELECT booking_id, bookingDate
            FROM service_booking
            WHERE vendor_id = ?
              AND bookingStatus NOT IN ('2', '4')
              AND bookingDate BETWEEN ? AND ?
            `,
            [vendor_id, delStart.format("YYYY-MM-DD"), delEnd.format("YYYY-MM-DD")]
        );

        if (bookings.length > 0) {
            const bookedDates = bookings.map(b => moment(b.bookingDate).format("YYYY-MM-DD"));
            return res.status(400).json({
                message: "Cannot delete availability — bookings exist within this date range.",
                bookedDates
            });
        }

        // 🧩 Step 2: Handle partial deletion logic
        if (delStart.isSame(start) && delEnd.isSame(end)) {
            await db.query(
                "DELETE FROM vendor_availability WHERE vendor_availability_id = ?",
                [vendor_availability_id]
            );
            return res.json({ message: "Entire availability deleted successfully" });

        } else if (delStart.isSame(start) && delEnd.isBefore(end)) {
            const newStart = delEnd.clone().add(1, "day").format("YYYY-MM-DD");
            await db.query(
                "UPDATE vendor_availability SET startDate = ? WHERE vendor_availability_id = ?",
                [newStart, vendor_availability_id]
            );
            return res.json({
                message: "Availability updated (beginning trimmed)",
                updatedRange: { startDate: newStart, endDate: existing.endDate }
            });

        } else if (delStart.isAfter(start) && delEnd.isSame(end)) {
            const newEnd = delStart.clone().subtract(1, "day").format("YYYY-MM-DD");
            await db.query(
                "UPDATE vendor_availability SET endDate = ? WHERE vendor_availability_id = ?",
                [newEnd, vendor_availability_id]
            );
            return res.json({
                message: "Availability updated (ending trimmed)",
                updatedRange: { startDate: existing.startDate, endDate: newEnd }
            });

        } else if (delStart.isAfter(start) && delEnd.isBefore(end)) {
            const leftEnd = delStart.clone().subtract(1, "day").format("YYYY-MM-DD");
            const rightStart = delEnd.clone().add(1, "day").format("YYYY-MM-DD");

            await db.query(
                "UPDATE vendor_availability SET endDate = ? WHERE vendor_availability_id = ?",
                [leftEnd, vendor_availability_id]
            );

            await db.query(
                `
                INSERT INTO vendor_availability (vendor_id, startDate, endDate, startTime, endTime)
                VALUES (?, ?, ?, ?, ?)
                `,
                [vendor_id, rightStart, existing.endDate, existing.startTime, existing.endTime]
            );

            return res.json({
                message: "Availability split successfully after partial deletion",
                newRanges: [
                    { startDate: existing.startDate, endDate: leftEnd },
                    { startDate: rightStart, endDate: existing.endDate }
                ]
            });
        }

        return res.status(400).json({ message: "Invalid delete range" });

    } catch (error) {
        console.error("Error deleting availability:", error);
        res.status(500).json({ message: "Error deleting availability", error });
    }
});


// ADMIN
const adminSetAvailability = asyncHandler(async (req, res) => {
    try {
        const { startDate, endDate, startTime, endTime } = req.body;
        const { vendor_id } = req.params

        // ✅ STRICT ADMIN AUTH CHECK
        if (!req.user || !req.user.admin_id) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (!vendor_id || !startDate || !endDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date" });
        }

        // Check for overlapping availability
        const [existing] = await db.query(
            `
            SELECT *
            FROM vendor_availability
            WHERE vendor_id = ?
            AND (
                (? BETWEEN startDate AND endDate OR ? BETWEEN startDate AND endDate)
                OR
                (startDate BETWEEN ? AND ? OR endDate BETWEEN ? AND ?)
            )
            AND (
                (TIME(?) < endTime AND TIME(?) > startTime)
                OR
                (TIME(startTime) < ? AND TIME(endTime) > ?)
            )
            `,
            [vendor_id, startDate, endDate, startDate, endDate, startDate, endDate, startTime, endTime, endTime, startTime]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                message: "Availability overlaps with an existing slot"
            });
        }

        await db.query(
            `INSERT INTO vendor_availability (vendor_id, startDate, endDate, startTime, endTime)
             VALUES (?, ?, ?, ?, ?)`,
            [vendor_id, startDate, endDate, startTime, endTime]
        );

        res.status(201).json({ message: "Availability added successfully by admin" });

    } catch (error) {
        console.error("Admin availability error:", error);
        res.status(500).json({ message: "Error setting availability", error });
    }
});

const adminEditAvailability = asyncHandler(async (req, res) => {
    try {
        const { vendor_availability_id } = req.params;
        const { vendor_id, startDate, endDate, startTime, endTime } = req.body;

        // STRICT ADMIN CHECK
        if (!req.user || !req.user.admin_id) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (!vendor_id || !startDate || !endDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date" });
        }

        const formattedStartTime = moment(startTime, ["HH:mm", "hh:mm A"]).format("HH:mm:ss");
        const formattedEndTime = moment(endTime, ["HH:mm", "hh:mm A"]).format("HH:mm:ss");

        // Fetch existing
        const [existing] = await db.query(
            `SELECT * FROM vendor_availability WHERE vendor_availability_id = ? AND vendor_id = ?`,
            [vendor_availability_id, vendor_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Availability not found" });
        }

        const oldStartDate = existing[0].startDate;
        const oldEndDate = existing[0].endDate;

        // Fetch bookings inside old range
        const [bookings] = await db.query(
            `
            SELECT DATE(bookingDate) AS bookedDate
            FROM service_booking
            WHERE vendor_id = ?
              AND bookingStatus NOT IN ('2','4')
              AND bookingDate BETWEEN ? AND ?
            `,
            [vendor_id, oldStartDate, oldEndDate]
        );

        const restricted = bookings.filter(b => {
            const d = new Date(b.bookedDate);
            return d < new Date(startDate) || d > new Date(endDate);
        });

        if (restricted.length > 0) {
            return res.status(400).json({
                message: "Cannot update — bookings exist in this date range",
                bookedDates: restricted.map(b => moment(b.bookedDate).format("YYYY-MM-DD"))
            });
        }

        // Update
        await db.query(
            `UPDATE vendor_availability SET startDate = ?, endDate = ?, startTime = ?, endTime = ?
             WHERE vendor_availability_id = ? AND vendor_id = ?`,
            [startDate, endDate, formattedStartTime, formattedEndTime, vendor_availability_id, vendor_id]
        );

        res.json({
            message: "Availability updated successfully by admin",
            updated: { startDate, endDate, startTime: formattedStartTime, endTime: formattedEndTime }
        });

    } catch (error) {
        console.error("Admin update availability error:", error);
        res.status(500).json({ message: "Error updating availability", error });
    }
});

const adminDeleteAvailability = asyncHandler(async (req, res) => {
    try {
        const { vendor_id } = req.body;
        const { vendor_availability_id } = req.params;
        const { startDate, endDate } = req.body || {}; // may be provided for partial delete
        // STRICT ADMIN CHECK
        if (!req.user || !req.user.admin_id) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (!vendor_id) {
            return res.status(400).json({ message: "vendor_id is required" });
        }

        // 🧩 Fetch existing availability
        const [existingRows] = await db.query(
            "SELECT * FROM vendor_availability WHERE vendor_availability_id = ? AND vendor_id = ?",
            [vendor_availability_id, vendor_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Availability not found" });
        }

        const existing = existingRows[0];
        const start = moment(existing.startDate, "YYYY-MM-DD");
        const end = moment(existing.endDate, "YYYY-MM-DD");

        // 🟢 If body has no startDate/endDate provided — delete entire availability
        // Note: we consider absence of startDate & endDate as full delete (admin may send vendor_id only)
        const isFullDelete = !req.body.startDate && !req.body.endDate;

        if (isFullDelete) {
            // 🚫 Check for existing bookings in the full availability range
            const [bookings] = await db.query(
                `
                SELECT booking_id, bookingDate
                FROM service_booking
                WHERE vendor_id = ?
                  AND bookingStatus NOT IN ('2','4')
                  AND bookingDate BETWEEN ? AND ?
                `,
                [vendor_id, start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")]
            );

            if (bookings.length > 0) {
                return res.status(400).json({
                    message: "Cannot delete entire availability — bookings exist",
                    bookedDates: bookings.map(b => moment(b.bookingDate).format("YYYY-MM-DD"))
                });
            }

            // ✅ Safe to delete entire record
            await db.query("DELETE FROM vendor_availability WHERE vendor_availability_id = ?", [
                vendor_availability_id,
            ]);

            return res.json({ message: "Availability deleted successfully by admin" });
        }

        // 🧠 Validate input date range for partial delete
        if (!startDate || !moment(startDate, "YYYY-MM-DD", true).isValid()) {
            return res.status(400).json({ message: "Invalid or missing startDate for delete range" });
        }

        const delStart = moment(startDate, "YYYY-MM-DD");
        const delEnd = endDate
            ? moment(endDate, "YYYY-MM-DD")
            : delStart;

        if (delStart.isBefore(start) || delEnd.isAfter(end)) {
            return res.status(400).json({
                message: "Delete range must fall within the existing availability period"
            });
        }

        // 🛑 Step 1: Check for active bookings within delete range
        const [bookings] = await db.query(
            `
            SELECT booking_id, bookingDate
            FROM service_booking
            WHERE vendor_id = ?
              AND bookingStatus NOT IN ('2','4')
              AND bookingDate BETWEEN ? AND ?
            `,
            [vendor_id, delStart.format("YYYY-MM-DD"), delEnd.format("YYYY-MM-DD")]
        );

        if (bookings.length > 0) {
            return res.status(400).json({
                message: "Cannot delete availability — bookings exist within this date range.",
                bookedDates: bookings.map(b => moment(b.bookingDate).format("YYYY-MM-DD"))
            });
        }

        // 🧩 Step 2: Handle partial deletion logic (mirror of vendor logic)
        // Case A: delete range equals full range
        if (delStart.isSame(start) && delEnd.isSame(end)) {
            await db.query(
                "DELETE FROM vendor_availability WHERE vendor_availability_id = ?",
                [vendor_availability_id]
            );
            return res.json({ message: "Entire availability deleted successfully by admin" });

        }
        // Case B: trim beginning
        else if (delStart.isSame(start) && delEnd.isBefore(end)) {
            const newStart = delEnd.clone().add(1, "day").format("YYYY-MM-DD");
            await db.query(
                "UPDATE vendor_availability SET startDate = ? WHERE vendor_availability_id = ?",
                [newStart, vendor_availability_id]
            );
            return res.json({
                message: "Availability updated (beginning trimmed) by admin",
                updatedRange: { startDate: newStart, endDate: existing.endDate }
            });

        }
        // Case C: trim ending
        else if (delStart.isAfter(start) && delEnd.isSame(end)) {
            const newEnd = delStart.clone().subtract(1, "day").format("YYYY-MM-DD");
            await db.query(
                "UPDATE vendor_availability SET endDate = ? WHERE vendor_availability_id = ?",
                [newEnd, vendor_availability_id]
            );
            return res.json({
                message: "Availability updated (ending trimmed) by admin",
                updatedRange: { startDate: existing.startDate, endDate: newEnd }
            });

        }
        // Case D: split into two ranges (delete middle)
        else if (delStart.isAfter(start) && delEnd.isBefore(end)) {
            const leftEnd = delStart.clone().subtract(1, "day").format("YYYY-MM-DD");
            const rightStart = delEnd.clone().add(1, "day").format("YYYY-MM-DD");

            // update left segment (existing record becomes left segment)
            await db.query(
                "UPDATE vendor_availability SET endDate = ? WHERE vendor_availability_id = ?",
                [leftEnd, vendor_availability_id]
            );

            // insert right segment as new availability row
            await db.query(
                `
                INSERT INTO vendor_availability (vendor_id, startDate, endDate, startTime, endTime)
                VALUES (?, ?, ?, ?, ?)
                `,
                [vendor_id, rightStart, existing.endDate, existing.startTime, existing.endTime]
            );

            return res.json({
                message: "Availability split successfully after partial deletion by admin",
                newRanges: [
                    { startDate: existing.startDate, endDate: leftEnd },
                    { startDate: rightStart, endDate: existing.endDate }
                ]
            });
        }

        return res.status(400).json({ message: "Invalid delete range" });

    } catch (error) {
        console.error("Admin delete availability error:", error);
        res.status(500).json({ message: "Error deleting availability", error: error.message });
    }
});


const adminGetAvailability = asyncHandler(async (req, res) => {
    try {
        const { vendor_id } = req.params;
        // STRICT ADMIN CHECK
        if (!req.user || !req.user.admin_id) {
            return res.status(403).json({ message: "Access denied" });
        }

        const [rows] = await db.query(
            `SELECT 
                va.vendor_availability_id,
                va.vendor_id,
                id.name,
                id.email,
                va.startDate,
                va.endDate,
                va.startTime,
                va.endTime,
                va.created_at,
                va.updated_at
             FROM vendor_availability va
             LEFT JOIN individual_details id ON va.vendor_id = id.vendor_id
             WHERE va.vendor_id = ?`,
            [vendor_id]
        );

        const formatted = rows.map(item => ({
            ...item,
            startDate: moment(item.startDate).format("YYYY-MM-DD"),
            endDate: moment(item.endDate).format("YYYY-MM-DD"),
            startTime: moment(item.startTime, "HH:mm:ss").format("HH:mm"),
            endTime: moment(item.endTime, "HH:mm:ss").format("HH:mm"),
        }));

        res.json({ vendor_id, availabilities: formatted });
    } catch (error) {
        res.status(500).json({ message: "Error fetching availability", error });
    }
});

const getVendors = asyncHandler(async (req, res) => {
    try {
        if (!req.user || !req.user.admin_id) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { limit } = req.query;

        let sql = `
            SELECT vendor_id, name, email
            FROM individual_details
        `;

        if (!limit || limit !== "all") {
            sql += " LIMIT 2";
        }

        const [rows] = await db.query(sql);

        res.json({
            limit: limit === "all" ? "all" : 2,
            vendors: rows
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching vendors", error });
    }
});


module.exports = {
    setAvailability,
    getAvailability,
    deleteAvailability,
    editAvailability,
    adminSetAvailability,
    adminEditAvailability,
    adminDeleteAvailability,
    adminGetAvailability,
    getVendors
};