const contractorPostQueries = {
    createContractor: `
        INSERT INTO contractors (
            company_name,
            contact_person,
            email,
            phone,
            address,
            business_license,
            insurance_certificate,
            commission_rate,
            is_verified,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,

    addContractorService: `
        INSERT INTO contractor_services (
            contractor_id,
            service_id,
            hourly_rate,
            is_available
        ) VALUES (?, ?, ?, ?)
    `,

    assignContractorToBooking: `
        INSERT INTO contractor_bookings (
            booking_id,
            contractor_id,
            estimated_hours,
            hourly_rate,
            total_amount,
            booking_status,
            assigned_date
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,

    createContractorPayout: `
        INSERT INTO contractor_payouts (
            contractor_id,
            booking_id,
            amount,
            commission_rate,
            commission_amount,
            net_amount,
            payout_status,
            payout_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      getContractorHourlyRateForBooking: `
    SELECT cs.hourly_rate 
    FROM contractor_services cs
    JOIN service_booking sb ON cs.service_id = sb.service_id
    WHERE cs.contractor_id = ? AND sb.booking_id = ?
  `,

  // Assign contractor to the booking
  assignContractorToBooking: `
    INSERT INTO booking_contractors
    (booking_id, contractor_id, estimated_hours, hourly_rate, total_amount, booking_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  // Update service booking status (kept in case you'd want to modularize it too)
  updateBookingStatus: `
    UPDATE service_booking 
    SET bookingStatus = 1 
    WHERE booking_id = ?
  `
};

module.exports = contractorPostQueries;