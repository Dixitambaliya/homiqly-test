const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const contractorGetQueries = require('../config/contractorQueries/contractorGetQueries');
const  contractorPostQueries = require('../config/contractorQueries/contractorPostQueries');

const createContractor = asyncHandler(async (req, res) => {
    const {
        company_name,
        contact_person,
        email,
        phone,
        address,
        commission_rate,
        services
    } = req.body;

    const business_license = req.uploadedFiles?.business_license?.[0]?.url || null;
    const insurance_certificate = req.uploadedFiles?.insurance_certificate?.[0]?.url || null;

    if (!company_name || !contact_person || !email || !phone) {
        return res.status(400).json({ message: "Required fields missing" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Create contractor
        const [contractorResult] = await connection.query(contractorPostQueries.createContractor, [
            company_name,
            contact_person,
            email,
            phone,
            address,
            business_license,
            insurance_certificate,
            commission_rate || 20, // default 20%
            0, // is_verified (pending)
            1  // is_active
        ]);

        const contractor_id = contractorResult.insertId;

        // Add services if provided
        if (services && Array.isArray(services)) {
            for (const service of services) {
                await connection.query(contractorPostQueries.addContractorService, [
                    contractor_id,
                    service.service_id,
                    service.hourly_rate,
                    1 // is_available
                ]);
            }
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            message: "Contractor created successfully",
            contractor_id
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("Error creating contractor:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllContractors = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(contractorGetQueries.getAllContractors);

        const processedContractors = rows.map(contractor => ({
            ...contractor,
            services: JSON.parse(contractor.services || '[]')
        }));

        res.status(200).json({
            message: "Contractors fetched successfully",
            contractors: processedContractors
        });

    } catch (error) {
        console.error("Error fetching contractors:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const assignContractorToBooking = asyncHandler(async (req, res) => {
  const { booking_id, contractor_id, estimated_hours } = req.body;

  if (!booking_id || !contractor_id || !estimated_hours) {
    return res.status(400).json({ message: "Booking ID, contractor ID, and estimated hours are required" });
  }

  try {
    const [contractorService] = await db.query(
      contractorPostQueries.getContractorHourlyRateForBooking,
      [contractor_id, booking_id]
    );

    if (contractorService.length === 0) {
      return res.status(400).json({ message: "Contractor not available for this service" });
    }

    const hourly_rate = contractorService[0].hourly_rate;
    const total_amount = hourly_rate * estimated_hours;

    await db.query(contractorPostQueries.assignContractorToBooking, [
      booking_id,
      contractor_id,
      estimated_hours,
      hourly_rate,
      total_amount,
      'assigned'
    ]);

    await db.query(contractorPostQueries.updateBookingStatus, [booking_id]);

    res.status(200).json({
      message: "Contractor assigned successfully",
      total_amount
    });

  } catch (error) {
    console.error("Error assigning contractor:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

const getContractorBookings = asyncHandler(async (req, res) => {
    const { contractor_id } = req.params;

    try {
        const [bookings] = await db.query(contractorGetQueries.getContractorBookings, [contractor_id]);

        res.status(200).json({
            message: "Contractor bookings fetched successfully",
            bookings
        });

    } catch (error) {
        console.error("Error fetching contractor bookings:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    createContractor,
    getAllContractors,
    assignContractorToBooking,
    getContractorBookings
};