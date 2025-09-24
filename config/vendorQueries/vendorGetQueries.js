const vendorGetQueries = {

  getVendorService: `
    SELECT
        vendors.vendor_id,
        vendors.vendorType,

        service_type.service_type_id,

        services.service_id,
        services.serviceName,
        services.service_categories_id AS category_id,
        service_categories.serviceCategory AS categoryName,

        COALESCE(individual_services.serviceLocation, company_services.serviceLocation) AS serviceLocation,
        COALESCE(individual_services.serviceDescription, company_services.serviceDescription) AS serviceDescription,

        packages.package_id,
        package_items.item_id,
        package_items.itemName,
        package_items.itemMedia,
        package_items.description AS itemDescription,
        package_items.price AS itemPrice,
        package_items.timeRequired,

        booking_preferences.preference_id,
        booking_preferences.preferenceValue

    FROM vendors

    LEFT JOIN service_type ON service_type.vendor_id = vendors.vendor_id
    LEFT JOIN services ON services.service_id = service_type.service_id
    LEFT JOIN service_categories ON services.service_categories_id = service_categories.service_categories_id

    LEFT JOIN individual_services ON individual_services.vendor_id = vendors.vendor_id AND individual_services.service_id = service_type.service_id
    LEFT JOIN company_services ON company_services.vendor_id = vendors.vendor_id AND company_services.service_id = service_type.service_id

    LEFT JOIN packages ON packages.service_type_id = service_type.service_type_id
    LEFT JOIN package_items ON package_items.package_id = packages.package_id
    LEFT JOIN booking_preferences ON booking_preferences.package_id = packages.package_id

    WHERE vendors.vendor_id = ?
    ORDER BY service_type.service_type_id, packages.package_id, package_items.item_id, booking_preferences.preference_id
    `,

  getServiceTypesByVendorId: `
    SELECT
                                 serviceTypeName
                                  FROM
                                    service_type
                                        JOIN services ON services.service_id = service_type.service_id
                                        WHERE vendor_id = ? AND service_type.is_approved = 1
    `,

  getIndividualVendorServices: `
        SELECT s.service_id, s.serviceName
        FROM individual_services vs
        JOIN services s ON vs.service_id = s.service_id
        WHERE vs.vendor_id = ?
    `,

  getCompanyVendorServices: `
    SELECT s.service_id, s.serviceName
    FROM company_services vs
    JOIN services s ON vs.service_id = s.service_id
    WHERE vs.vendor_id = ?
    `,

  getProfileVendor: `
    SELECT
        vendors.vendor_id,
        vendors.vendorType,
        COALESCE(individual_details.name, company_details.companyName) AS name,
        COALESCE(individual_details.email, company_details.companyEmail) AS email,
        COALESCE(individual_details.phone, company_details.companyPhone) AS phone,
        COALESCE(individual_details.dob, company_details.dob) AS birthDate,
        COALESCE(individual_details.profileImage, company_details.profileImage) AS profileImage,
        COALESCE(individual_details.otherInfo) AS otherInfo,
        COALESCE(individual_details.address) AS address,
        COALESCE(company_details.googleBusinessProfileLink) AS googleBusinessProfileLink,
        COALESCE(company_details.companyAddress) AS companyAddress,
        COALESCE(company_details.contactPerson) AS contactPerson,
        vendors.created_at
    FROM vendors
    LEFT JOIN individual_details ON vendors.vendor_id = individual_details.vendor_id
    LEFT JOIN company_details ON vendors.vendor_id = company_details.vendor_id
    WHERE vendors.vendor_id = ?
    `,

  getCertificate: `
    SELECT certificate_id, certificateName, certificateFile, created_at
            FROM certificates
            WHERE vendor_id = ?
    `,

  getVendorFullPayment: `
    SELECT
        sb.booking_id,
        sb.service_id,
        sb.vendor_id,
        sb.assigned_employee_id,
        sb.user_id,
        sb.bookingDate,
        sb.bookingTime,
        sb.bookingStatus,
        sb.payment_intent_id,
        sb.notes,
        sb.bookingMedia,
        sb.created_at,

        -- User Info
        CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, '')) AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        
        -- Vendor Info
        v.vendorType,
        cdet.contactPerson,
        COALESCE(idet.name, cdet.companyName) AS vendor_name,
        COALESCE(idet.email, cdet.companyEmail) AS vendor_email,
        COALESCE(idet.phone, cdet.companyPhone) AS vendor_phone,

        -- Package Info
        pkg.package_id,
        pkg.packageName,

        -- Payment Info (apply platform fee)
        CAST((p.amount * (1 - ? / 100)) AS DECIMAL(10,2)) AS totalPrice,
        p.currency AS payment_currency,
        p.status AS payment_status

    FROM service_booking sb

    JOIN users u ON sb.user_id = u.user_id
    JOIN vendors v ON sb.vendor_id = v.vendor_id

    LEFT JOIN individual_details idet 
        ON v.vendor_id = idet.vendor_id 
        AND v.vendorType = 'individual'
    LEFT JOIN company_details cdet 
        ON v.vendor_id = cdet.vendor_id 
        AND v.vendorType = 'company'

    LEFT JOIN service_booking_packages sbp 
        ON sbp.booking_id = sb.booking_id
    LEFT JOIN packages pkg 
        ON pkg.package_id = sbp.package_id

    -- 🔹 Join payments to pull amount & currency
    LEFT JOIN payments p 
        ON p.payment_intent_id = sb.payment_intent_id

    WHERE sb.vendor_id = ? 
      AND sb.payment_intent_id IS NOT NULL

    ORDER BY sb.created_at DESC
`,


  getVendorAssignedPackages: `
            SELECT
                service_type.service_type_id,
                service_type.serviceTypeName,
                service_type.serviceTypeMedia,

                service.service_id,
                service.serviceName,

                service_category.service_categories_id,
                service_category.serviceCategory,

                COALESCE((
                    SELECT CONCAT('[', GROUP_CONCAT(
                        JSON_OBJECT(
                            'package_id', package_table.package_id,

                            'sub_packages', IFNULL((
                                SELECT CONCAT('[', GROUP_CONCAT(
                                    JSON_OBJECT(
                                        'sub_package_id', package_item.item_id,
                                        'title', package_item.itemName,
                                        'description', package_item.description,
                                        'price', package_item.price,
                                        'time_required', package_item.timeRequired,
                                        'item_media', package_item.itemMedia
                                    )
                                ), ']')
                                FROM package_items AS package_item
                                WHERE package_item.package_id = package_table.package_id
                            ), '[]'),

                            'preferences', IFNULL((
                                SELECT CONCAT('[', GROUP_CONCAT(
                                    JSON_OBJECT(
                                        'preference_id', booking_preference.preference_id,
                                        'preference_value', booking_preference.preferenceValue
                                    )
                                ), ']')
                                FROM booking_preferences AS booking_preference
                                WHERE booking_preference.package_id = package_table.package_id
                            ), '[]')
                        )
                    ), ']')
                    FROM packages AS package_table
                    JOIN vendor_packages AS vendor_package_link ON vendor_package_link.package_id = package_table.package_id
                    WHERE package_table.service_type_id = service_type.service_type_id AND vendor_package_link.vendor_id = ?
                ), '[]') AS packages

            FROM service_type
            JOIN services AS service ON service.service_id = service_type.service_id
            JOIN service_categories AS service_category ON service_category.service_categories_id = service.service_categories_id

            WHERE EXISTS (
                SELECT 1 FROM vendor_packages AS vendor_package_check
                JOIN packages AS package_check ON package_check.package_id = vendor_package_check.package_id
                WHERE package_check.service_type_id = service_type.service_type_id AND vendor_package_check.vendor_id = ?
            )

            ORDER BY service_type.service_type_id DESC
    `,

  getAllPackagesForVendor: `
        SELECT
          sc.service_categories_id,
          sc.serviceCategory,

          s.service_id,
          s.serviceName,

          st.service_type_id,

          -- Packages grouped per service_type
          COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'package_id', p.package_id,
                'is_applied', IF(vp.vendor_id IS NOT NULL, 1, 0),
                'subPackages', IFNULL((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'sub_package_id', pi.item_id,
                      'itemName', pi.itemName,
                      'itemMedia', pi.itemMedia,
                      'description', pi.description,
                      'price', pi.price,
                      'timeRequired', pi.timeRequired
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
            LEFT JOIN vendor_packages vp ON vp.package_id = p.package_id AND vp.vendor_id = ?
            WHERE p.service_type_id = st.service_type_id
          ), '[]') AS packages

        FROM service_categories sc
        JOIN services s ON s.service_categories_id = sc.service_categories_id
        JOIN service_type st ON st.service_id = s.service_id

        GROUP BY st.service_type_id
        ORDER BY sc.serviceCategory, s.serviceName DESC
    `
}

module.exports = vendorGetQueries;
