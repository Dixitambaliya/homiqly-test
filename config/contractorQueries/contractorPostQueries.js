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
    `
};

module.exports = contractorPostQueries;