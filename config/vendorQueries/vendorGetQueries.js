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
        COALESCE(individual_details.policeClearance, company_details.policeClearance) AS policeClearance,
        COALESCE(individual_details.businessLicense, company_details.businessLicense) AS businessLicense,
        COALESCE(individual_details.businessLicenseExpireDate, company_details.businessLicenseExpireDate) AS businessLicenseExpireDate,
        COALESCE(individual_details.certificateOfExpertise, company_details.certificateOfExpertise) AS certificateOfExpertise,
        COALESCE(individual_details.certificateOfExpertiseExpireDate, company_details.certificateOfExpertiseExpireDate) AS certificateOfExpertiseExpireDate,
        COALESCE(individual_details.aboutMe, company_details.aboutMe) AS aboutMe,
        COALESCE(individual_details.expertise, company_details.expertise) AS expertise,
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

    getVendorPayoutHistory: `
    SELECT
        vp.payout_id,
        vp.booking_id,
        vp.vendor_id,
        vp.user_id,
        vp.platform_fee_percentage,
        vp.payout_amount,
        vp.currency,
        vp.payout_status,
        vp.created_at,

        sb.bookingDate,
        sb.bookingTime,
        CONCAT(u.firstName, ' ', u.lastName) AS user_name,

        sbs.sub_package_id,

        pkg.package_id,
        pkg.packageName,
        pkg.packageMedia,

        spi.itemName AS sub_package_name,
        spi.itemMedia AS sub_package_media,
        spi.description AS sub_package_description

    FROM vendor_payouts vp
    LEFT JOIN service_booking sb ON vp.booking_id = sb.booking_id
    LEFT JOIN users u ON vp.user_id = u.user_id
    LEFT JOIN service_booking_sub_packages sbs ON sbs.booking_id = sb.booking_id
    LEFT JOIN package_items spi ON spi.item_id = sbs.sub_package_id
    LEFT JOIN packages pkg ON pkg.package_id = spi.package_id
    WHERE vp.vendor_id = ?
    ORDER BY sb.bookingDate DESC;
`,

    getAdminPayoutHistory: `
SELECT
    vp.payout_id,
    vp.booking_id,
    vp.vendor_id,
    vp.user_id,
    vp.platform_fee_percentage,
    vp.payout_amount,
    vp.currency,
    vp.payout_status,
    vp.created_at,

    id.name AS vendor_name,
    id.email AS vendor_email,
    id.phone AS vendor_phone,

    sb.bookingDate,
    sb.bookingTime,
    CONCAT(u.firstName, ' ', u.lastName) AS user_name,

    sbs.sub_package_id,

    pkg.package_id,
    pkg.packageName,
    pkg.packageMedia,

    spi.itemName AS sub_package_name,
    spi.itemMedia AS sub_package_media,
    spi.description AS sub_package_description

FROM vendor_payouts vp
LEFT JOIN service_booking sb ON vp.booking_id = sb.booking_id
LEFT JOIN users u ON vp.user_id = u.user_id
LEFT JOIN service_booking_sub_packages sbs ON sbs.booking_id = sb.booking_id
LEFT JOIN package_items spi ON spi.item_id = sbs.sub_package_id
LEFT JOIN packages pkg ON pkg.package_id = spi.package_id
LEFT JOIN individual_details id ON vp.vendor_id = id.vendor_id
WHERE vp.vendor_id = ?
ORDER BY sb.bookingDate DESC;
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
