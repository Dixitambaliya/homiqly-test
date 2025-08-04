const ratingGetQueries = {
    getServiceRatings: `
        SELECT
            vsr.rating_id,
            vsr.booking_id,
            vsr.user_id,
            vsr.vendor_id,
            vsr.service_id,
            vsr.rating,
            vsr.review,
            vsr.created_at,

            CONCAT(u.firstName, ' ', u.lastName) AS user_name,
            s.serviceName,
            sc.serviceCategory

        FROM vendor_service_ratings vsr
        JOIN users u ON vsr.user_id = u.user_id
        JOIN services s ON vsr.service_id = s.service_id
        JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id

        WHERE vsr.vendor_id = ?
        ORDER BY vsr.created_at DESC`,

    getVendorAverageRating: `
            SELECT
                vendor_id,
                AVG(rating) as average_rating,
                COUNT(*) as total_reviews
            FROM vendor_service_ratings
            WHERE vendor_id = ?
            GROUP BY vendor_id`,

    getAllRatings: `
        SELECT
            r.rating_id,
            r.rating,
            r.review,
            r.created_at,

            CONCAT(u.firstName, ' ', u.lastName) AS customer_name,
            CASE
                WHEN v.vendorType = 'individual' THEN ind.name
                WHEN v.vendorType = 'company' THEN comp.companyName
            END as vendor_name,
            s.serviceName,
            sc.serviceCategory

        FROM ratings r
        JOIN users u ON r.user_id = u.user_id
        JOIN vendors v ON r.vendor_id = v.vendor_id
        LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
        LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
        JOIN service_booking sb ON r.booking_id = sb.booking_id
        JOIN services s ON sb.service_id = s.service_id
        JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
        ORDER BY r.created_at DESC
        LIMIT 100`
};

module.exports = ratingGetQueries;
