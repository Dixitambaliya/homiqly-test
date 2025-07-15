const adminGetQueries = {


    vendorDetails: `SELECT
    vendors.vendor_id,
    vendors.vendorType,
    vendors.is_authenticated,

    individual_details.id AS individual_id,
    individual_details.name AS individual_name,
    individual_details.email AS individual_email,
    individual_details.phone AS individual_phone,
    individual_details.otherInfo AS individual_otherInfo,
    individual_details.resume AS individual_resume,

    company_details.id AS company_id,
    company_details.companyName AS company_companyName,
    company_details.googleBusinessProfileLink AS company_googleBusinessProfileLink,
    company_details.companyEmail AS company_companyEmail,
    company_details.companyPhone AS company_companyPhone,
    company_details.companyAddress AS company_companyAddress,
    company_details.contactPerson AS company_contactPerson,

    COALESCE(
        CONCAT(
            '[',
            GROUP_CONCAT(
                DISTINCT CASE
                    WHEN vendors.vendorType = 'individual' THEN JSON_OBJECT(
                        'category_id', service_categories.service_categories_id,
                        'categoryName', service_categories.serviceCategory,
                        'service_id', services.service_id,
                        'serviceName', services.serviceName,
                        'serviceLocation', individual_services.serviceLocation,
                        'serviceDescription ', individual_services.serviceDescription,
                        'categoryName', service_categories.serviceCategory
                    )
                    WHEN vendors.vendorType = 'company' THEN JSON_OBJECT(
                        'category_id', service_categories.service_categories_id,
                        'categoryName', service_categories.serviceCategory,
                        'service_id', services.service_id,
                        'serviceName', services.serviceName,
                        'serviceLocation', company_services.serviceLocation,
                        'serviceDescription ', company_services.serviceDescription,
                        'categoryName', service_categories.serviceCategory
                    )
                END
                ORDER BY
                COALESCE(individual_services.service_id, company_services.service_id)
            ),
            ']'
        ),
        '[]'
    ) AS services

FROM vendors

LEFT JOIN individual_details
    ON vendors.vendor_id = individual_details.vendor_id

LEFT JOIN company_details
    ON vendors.vendor_id = company_details.vendor_id

LEFT JOIN individual_services
    ON vendors.vendor_id = individual_services.vendor_id

LEFT JOIN company_services
    ON vendors.vendor_id = company_services.vendor_id

LEFT JOIN services
    ON services.service_id = COALESCE(individual_services.service_id, company_services.service_id)

LEFT JOIN individual_service_categories
    ON vendors.vendor_id = individual_service_categories.vendor_id

LEFT JOIN company_service_categories
    ON vendors.vendor_id = company_service_categories.vendor_id

LEFT JOIN service_categories
    ON service_categories.service_categories_id =
    COALESCE (
        individual_service_categories.service_categories_id,
        company_service_categories.service_categories_id
    )

GROUP BY vendors.vendor_id`,


    getAllServiceTypes: `
    SELECT
        st.service_type_id,
        st.serviceTypeName,
        st.serviceTypeMedia,
        st.is_approved,

        s.service_id,
        s.serviceName,
        s.serviceDescription,
        s.service_categories_id,

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

        -- Packages Subquery
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
                                'item_media',pi.itemMedia,
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
        ), '[]') AS packages,

        -- Preferences Subquery
        COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
                JSON_OBJECT(
                    'preference_id', pref.preference_id,
                    'preference_value', pref.preferenceValue
                )
            ), ']')
            FROM booking_preferences pref
            JOIN packages p ON pref.package_id = p.package_id
            WHERE p.service_type_id = st.service_type_id
        ), '[]') AS preferences

    FROM service_type st
    LEFT JOIN vendors v ON st.vendor_id = v.vendor_id
    JOIN services s ON st.service_id = s.service_id
    LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
    LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
    ORDER BY st.service_type_id DESC`,

    getAllUsers: `SELECT user_id, firstName, lastName,profileImage, email address, state, postalcode, phone, created_at
    FROM users
    ORDER BY created_at DESC`,

     getAllBookings: `
    SELECT
      sb.booking_id,
      sb.bookingDate,
      sb.bookingTime,
      sb.bookingStatus,
      sb.notes,
      CONCAT(u.firstName, ' ', u.lastName) AS userName,
      s.serviceName,
      sc.serviceCategory,
      CASE
        WHEN v.vendorType = 'individual' THEN ind.name
        WHEN v.vendorType = 'company' THEN comp.companyName
      END as vendorName
    FROM service_booking sb
    JOIN users u ON sb.user_id = u.user_id
    JOIN services s ON sb.service_id = s.service_id
    JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
    JOIN vendors v ON sb.vendor_id = v.vendor_id
    LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
    LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
    ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
  `,
   getAdminCreatedPackages: `
    SELECT
        st.service_type_id,
        st.serviceTypeName,
        st.serviceTypeMedia,

        s.service_id,
        s.serviceName,

        sc.service_categories_id,
        sc.serviceCategory,

        COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
                JSON_OBJECT(
                    'package_id', p.package_id,
                    'title', p.packageName,
                    'description', p.description,
                    'price', p.totalPrice,
                    'time_required', p.totalTime,
                    'package_media', p.packageMedia,
                    'sub_packages', IFNULL((
                        SELECT CONCAT('[', GROUP_CONCAT(
                            JSON_OBJECT(
                                'sub_package_id', pi.item_id,
                                'item_name', pi.itemName,
                                'description', pi.description,
                                'price', pi.price,
                                'time_required', pi.timeRequired,
                                'item_media', pi.itemMedia
                            )
                        ), ']')
                        FROM package_items pi
                        WHERE pi.package_id = p.package_id
                    ), '[]'),
                    'preferences', IFNULL((
                        SELECT CONCAT('[', GROUP_CONCAT(
                            JSON_OBJECT(
                                'preference_id', bp.preference_id,
                                'preference_value', bp.preferenceValue
                            )
                        ), ']')
                        FROM booking_preferences bp
                        WHERE bp.package_id = p.package_id
                    ), '[]')
                )
            ), ']')
            FROM packages p
            WHERE p.service_type_id = st.service_type_id
        ), '[]') AS packages

    FROM service_type st
    JOIN services s ON s.service_id = st.service_id
    JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id

    ORDER BY st.service_type_id DESC
  `,
    getManualAssignmentStatus: `
    SELECT setting_value FROM settings
    WHERE setting_key = 'manual_vendor_assignment'
    LIMIT 1
  `

}

module.exports = adminGetQueries;
