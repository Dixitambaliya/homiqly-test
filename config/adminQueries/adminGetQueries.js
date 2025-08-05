const adminGetQueries = {

    vendorDetails: `
SELECT
    vendors.vendor_id,
    vendors.vendorType,
    vendors.is_authenticated,

    -- Individual Vendor Details
    individual_details.vendor_id AS individual_id,
    individual_details.name AS individual_name,
    individual_details.email AS individual_email,
    individual_details.phone AS individual_phone,
    individual_details.otherInfo AS individual_otherInfo,
    individual_details.resume AS individual_resume,

    -- Company Vendor Details
    company_details.vendor_id AS company_id,
    company_details.companyName AS company_companyName,
    company_details.googleBusinessProfileLink AS company_googleBusinessProfileLink,
    company_details.companyEmail AS company_companyEmail,
    company_details.companyPhone AS company_companyPhone,
    company_details.companyAddress AS company_companyAddress,
    company_details.contactPerson AS company_contactPerson,

    -- Vendor settings
    vendor_settings.manual_assignment_enabled AS status,

    -- Services JSON Array
    COALESCE(
        CONCAT(
            '[',
            GROUP_CONCAT(
                DISTINCT CASE
                    WHEN vendors.vendorType = 'individual' THEN JSON_OBJECT(
                        'category_id', sc.service_categories_id,
                        'categoryName', sc.serviceCategory,
                        'service_id', s.service_id,
                        'serviceName', TRIM(s.serviceName),
                        'serviceLocation', iser.serviceLocation,
                        'serviceDescription', iser.serviceDescription
                    )
                    WHEN vendors.vendorType = 'company' THEN JSON_OBJECT(
                        'category_id', sc.service_categories_id,
                        'categoryName', sc.serviceCategory,
                        'service_id', s.service_id,
                        'serviceName', TRIM(s.serviceName),
                        'serviceLocation', cser.serviceLocation,
                        'serviceDescription', cser.serviceDescription
                    )
                END
                ORDER BY COALESCE(iser.service_id, cser.service_id)
            ),
            ']'
        ),
        '[]'
    ) AS services

FROM vendors

-- Join individual and company profile data
LEFT JOIN individual_details AS individual_details
    ON vendors.vendor_id = individual_details.vendor_id

LEFT JOIN company_details AS company_details
    ON vendors.vendor_id = company_details.vendor_id

-- Join individual and company services
LEFT JOIN individual_services AS iser
    ON vendors.vendor_id = iser.vendor_id

LEFT JOIN company_services AS cser
    ON vendors.vendor_id = cser.vendor_id

-- Join the actual services table
LEFT JOIN services AS s
    ON s.service_id = COALESCE(iser.service_id, cser.service_id)

-- ✅ Correct category join via services
LEFT JOIN service_categories AS sc
    ON sc.service_categories_id = s.service_categories_id

-- Vendor settings
LEFT JOIN vendor_settings
    ON vendors.vendor_id = vendor_settings.vendor_id

GROUP BY vendors.vendor_id;
`,


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
    ORDER BY st.service_type_id DESC
`,

    getAllUserDetails: `
SELECT 
    user_id, 
    firstName, 
    lastName,
    profileImage,
    email,
    phone,
    address,
    state,
    postalcode,
    created_at
    FROM users
    ORDER BY created_at DESC
`,

    getAllBookings: `
SELECT
    sb.booking_id,
    sb.bookingDate,
    sb.bookingTime,
    sb.bookingStatus,
    sb.notes,
    sb.bookingMedia,
    sb.payment_intent_id,

    u.user_id,
    CONCAT(u.firstName, ' ', u.lastName) AS userName,
    u.email AS userEmail,
    u.phone AS userPhone,

    sc.serviceCategory,
    s.serviceName,

    st.service_type_id,
    st.serviceTypeName,
    st.serviceTypeMedia,

    v.vendor_id,
    v.vendorType,

    idet.id AS individual_id,
    idet.name AS individual_name,
    idet.phone AS individual_phone,
    idet.email AS individual_email,

    cdet.id AS company_id,
    cdet.companyName AS company_name,
    cdet.contactPerson AS company_contact_person,
    cdet.companyEmail AS company_email,
    cdet.companyPhone AS company_phone,

    p.status AS payment_status,
    p.amount AS payment_amount,
    p.currency AS payment_currency,

    pk.package_id,
    pk.packageName,
    pk.totalPrice,
    pk.totalTime,
    pk.availabilityCity,
    pk.packageMedia,

    pi.item_id AS package_item_id,
    pi.itemName AS package_item_name,
    pi.price AS package_item_price,
    pi.timeRequired AS package_item_time,
    pi.itemMedia AS package_item_media,

    pr.preference_id,
    pr.preferenceName,
    pr.preferenceValue

        FROM service_booking sb
        LEFT JOIN users u ON sb.user_id = u.user_id
        LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
        LEFT JOIN services s ON sb.service_id = s.service_id

        -- Service Type
        LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
        LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id

        -- Vendor
        LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
        LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
        LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id

        -- Payment
        LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id

        -- Packages
        LEFT JOIN booking_packages bp ON sb.booking_id = bp.booking_id
        LEFT JOIN packages pk ON bp.package_id = pk.package_id

        -- Package Items
        LEFT JOIN booking_package_items bpi ON bp.booking_package_id = bpi.booking_package_id
        LEFT JOIN package_items pi ON bpi.package_item_id = pi.item_id

        -- Preferences
        LEFT JOIN booking_preferences pr ON pr.booking_package_item_id = bpi.booking_package_item_id

        -- Ratings
        LEFT JOIN rating r ON r.package_id = pk.package_id AND r.user_id = u.user_id

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
