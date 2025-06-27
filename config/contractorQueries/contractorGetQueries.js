const contractorGetQueries = {
    getAllContractors: `
        SELECT 
            c.contractor_id,
            c.company_name,
            c.contact_person,
            c.email,
            c.phone,
            c.address,
            c.business_license,
            c.insurance_certificate,
            c.is_verified,
            c.is_active,
            c.commission_rate,
            c.created_at,
            
            COALESCE((
                SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                        'service_id', cs.service_id,
                        'serviceName', s.serviceName,
                        'categoryName', sc.serviceCategory
                    )
                ), ']')
                FROM contractor_services cs
                JOIN services s ON cs.service_id = s.service_id
                JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
                WHERE cs.contractor_id = c.contractor_id
            ), '[]') AS services
            
        FROM contractors c
        ORDER BY c.created_at DESC
    `,

    getContractorById: `
        SELECT * FROM contractors WHERE contractor_id = ?
    `,

    getContractorServices: `
        SELECT 
            cs.contractor_service_id,
            cs.service_id,
            s.serviceName,
            sc.serviceCategory,
            cs.hourly_rate,
            cs.is_available
        FROM contractor_services cs
        JOIN services s ON cs.service_id = s.service_id
        JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
        WHERE cs.contractor_id = ?
    `,

    getContractorBookings: `
        SELECT 
            cb.contractor_booking_id,
            cb.booking_id,
            cb.contractor_id,
            cb.estimated_hours,
            cb.hourly_rate,
            cb.total_amount,
            cb.booking_status,
            cb.assigned_date,
            cb.completion_date,
            
            sb.bookingDate,
            sb.bookingTime,
            sb.notes,
            
            CONCAT(u.firstName, ' ', u.lastName) AS customer_name,
            u.phone AS customer_phone,
            u.address AS customer_address,
            
            s.serviceName,
            sc.serviceCategory
            
        FROM contractor_bookings cb
        JOIN service_booking sb ON cb.booking_id = sb.booking_id
        JOIN users u ON sb.user_id = u.user_id
        JOIN services s ON sb.service_id = s.service_id
        JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
        WHERE cb.contractor_id = ?
        ORDER BY cb.assigned_date DESC
    `
};

module.exports = contractorGetQueries;