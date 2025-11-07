const adminGetQueries = {

    vendorDetails: `
    SELECT
        v.vendor_id,
        v.vendorType,
        v.is_authenticated,

        -- Individual Vendor Details
        i.vendor_id AS individual_id,
        i.name AS individual_name,
        i.email AS individual_email,
        i.phone AS individual_phone,
        i.otherInfo AS individual_otherInfo,
        i.resume AS individual_resume,
        i.expertise AS individual_expertise,
        i.aboutMe AS individual_aboutMe,

        -- Company Vendor Details
        c.vendor_id AS company_id,
        c.companyName AS company_companyName,
        c.googleBusinessProfileLink AS company_googleBusinessProfileLink,
        c.companyEmail AS company_companyEmail,
        c.companyPhone AS company_companyPhone,
        c.companyAddress AS company_companyAddress,
        c.contactPerson AS company_contactPerson,
        c.expertise AS company_expertise,
        c.aboutMe AS company_aboutMe,

        vs.manual_assignment_enabled AS status,

        -- 🟩 Packages (via vendor_p    ackage_items_flat)
        COALESCE(
            (
                SELECT CONCAT(
                    '[',
                    GROUP_CONCAT(
                        DISTINCT JSON_OBJECT(
                            'package_id', p.package_id,
                            'serviceLocation', i.serviceLocation,
                            'service_id', s.service_id,
                            'serviceName', TRIM(s.serviceName),
                            'serviceImage', s.serviceImage,
                            'category_id', sc.service_categories_id,
                            'categoryName', sc.serviceCategory
                        )
                    ),
                    ']'
                )
                FROM vendor_package_items_flat vpf
                INNER JOIN packages p ON p.package_id = vpf.package_id
                INNER JOIN service_type st ON st.service_type_id = p.service_type_id
                INNER JOIN services s ON s.service_id = st.service_id
                INNER JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id
                WHERE vpf.vendor_id = v.vendor_id
            ),
            '[]'
        ) AS packages,

        -- 🟦 Package Items (via vendor_package_items_flat)
        COALESCE(
            (
                SELECT CONCAT(
                    '[',
                    GROUP_CONCAT(
                        JSON_OBJECT(
                            'vendor_packages_id', vpf.vendor_packages_id,
                            'package_id', p.package_id,
                            'package_item_id', pi.item_id,
                            'itemName', pi.itemName,
                            'description', pi.description,
                            'itemMedia', pi.itemMedia
                        )
                    ),
                    ']'
                )
                FROM vendor_package_items_flat vpf
                INNER JOIN package_items pi ON pi.item_id = vpf.package_item_id
                INNER JOIN packages p ON p.package_id = vpf.package_id
                WHERE vpf.vendor_id = v.vendor_id
            ),
            '[]'
        ) AS package_items

    FROM vendors v
    LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
    LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
    LEFT JOIN vendor_settings vs ON v.vendor_id = vs.vendor_id
    GROUP BY v.vendor_id
    ORDER BY v.vendor_id DESC
    `,


    getAllServiceTypes: `
    SELECT
        st.service_type_id,

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
            LIMIT ? OFFSET ?
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
