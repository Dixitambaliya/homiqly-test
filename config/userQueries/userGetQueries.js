const userGetQueries = {

    getServiceCategories: `SELECT
                                serviceCategory,
                                service_categories_id
                                    FROM service_categories`,

    getUsersData: `SELECT
                    firstName,
                    lastName,
                    profileImage,
                    phone,
                    email
                        FROM users WHERE user_id = ?`,


    getServices: `SELECT
    services.service_id,
    services.serviceName,
    service_categories.serviceCategory AS serviceCategory
        FROM services
        LEFT JOIN service_categories ON services.service_categories_id = service_categories.service_categories_id;`,

    getAllServicesWithCategory: `
        SELECT
        service_categories.serviceCategory AS categoryName,
        service_categories.service_categories_id AS serviceCategoryId,
        services.service_id AS serviceId,
        services.serviceName,
        services.serviceDescription,
        services.serviceImage,
        services.slug
                FROM service_categories
                LEFT JOIN services services ON service_categories.service_categories_id = services.service_categories_id`,

    getCategoriesById: `SELECT
                        service_id,
                        serviceName,
                        serviceImage,
                        serviceDescription
                        FROM services WHERE service_categories_id = ?`,

    getServiceNames: `
    SELECT
    st.service_type_id,
    st.serviceTypeName,
    st.serviceTypeMedia,
    
    s.service_id,
    s.service_categories_id,
    s.serviceName,
    s.serviceDescription,

    v.vendor_id,
    v.vendorType,

    CASE WHEN v.vendorType = 'individual' THEN ind.id END AS id,
    CASE WHEN v.vendorType = 'individual' THEN ind.name END AS name,
    CASE WHEN v.vendorType = 'individual' THEN ind.phone END AS phone,
    CASE WHEN v.vendorType = 'individual' THEN ind.email END AS email,

    CASE WHEN v.vendorType = 'company' THEN comp.id END AS company_id,
    CASE WHEN v.vendorType = 'company' THEN comp.companyName END AS companyName,
    CASE WHEN v.vendorType = 'company' THEN comp.contactPerson END AS contactPerson,
    CASE WHEN v.vendorType = 'company' THEN comp.companyEmail END AS companyEmail,
    CASE WHEN v.vendorType = 'company' THEN comp.companyPhone END AS companyPhone,

    IFNULL(ratingStats.average_rating, 0) AS average_rating,
    IFNULL(ratingStats.total_reviews, 0) AS total_reviews,

    COALESCE((
        SELECT CONCAT('[', GROUP_CONCAT(
        JSON_OBJECT(
            'package_id', p.package_id,
            'title', p.packageName,
            'description', p.description,
            'price', p.totalPrice,
            'time_required', p.totalTime,
            'sub_packages', IFNULL((
            SELECT CONCAT('[', GROUP_CONCAT(
                JSON_OBJECT(
                'sub_package_id', pi.item_id,
                'title', pi.itemName,
                'description', pi.description,
                'price', pi.price,
                'time_required', pi.timeRequired
                )
            ), ']')
            FROM package_items pi
            WHERE pi.package_id = p.package_id
            ), '[]')
        )
        ), ']')
        FROM packages p
        WHERE p.service_type_id = st.service_type_id
    ), '[]') AS packages

    FROM service_type st
    LEFT JOIN vendors v ON st.vendor_id = v.vendor_id
    LEFT JOIN services s ON st.service_id = s.service_id
    LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
    LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id

    LEFT JOIN (
    SELECT
        service_id,
        ROUND(AVG(rating), 1) AS average_rating,
        COUNT(*) AS total_reviews
    FROM ratings
    GROUP BY service_id
    ) AS ratingStats ON s.service_id = ratingStats.service_id

    WHERE st.service_id = ?
    ORDER BY st.service_type_id DESC`,


}

module.exports = userGetQueries;
