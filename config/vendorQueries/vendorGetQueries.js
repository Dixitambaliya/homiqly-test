const vendorGetQueries = {

    getVendorService: `
SELECT
    vendors.vendor_id,
    vendors.vendorType,

    service_type.service_type_id,
    service_type.is_approved,
    service_type.serviceTypeName,
    service_type.serviceTypeMedia,

    services.service_id,
    services.serviceName,
    services.service_categories_id AS category_id,
    service_categories.serviceCategory AS categoryName,

    COALESCE(individual_services.serviceLocation, company_services.serviceLocation) AS serviceLocation,
    COALESCE(individual_services.serviceDescription, company_services.serviceDescription) AS serviceDescription,

    packages.package_id,
    packages.packageName,
    packages.description AS packageDescription,
    packages.totalPrice,
    packages.totalTime,
    packages.packageMedia,

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
ORDER BY service_type.service_type_id, packages.package_id, package_items.item_id, booking_preferences.preference_id`,

    getServiceTypesByVendorId: `SELECT
                                 serviceTypeName
                                  FROM
                                    service_type
                                        JOIN services ON services.service_id = service_type.service_id
                                        WHERE vendor_id = ? AND service_type.is_approved = 1`,

    getIndividualVendorServices: `
        SELECT s.service_id, s.serviceName
        FROM individual_services vs
        JOIN services s ON vs.service_id = s.service_id
        WHERE vs.vendor_id = ?`,

    getCompanyVendorServices: `
    SELECT s.service_id, s.serviceName
    FROM company_services vs
    JOIN services s ON vs.service_id = s.service_id
    WHERE vs.vendor_id = ?`,

    getProfileVendor: `SELECT
        vendors.vendor_id,
        vendors.vendorType,
        COALESCE(individual_details.name, company_details.companyName) AS name,
        COALESCE(individual_details.email, company_details.companyEmail) AS email,
        COALESCE(individual_details.phone, company_details.companyPhone) AS phone,
        COALESCE(individual_details.profileImage, company_details.profileImage) AS profileImage,
        COALESCE(company_details.googleBusinessProfileLink) AS googleBusinessProfileLink,
        COALESCE(company_details.companyAddress) AS companyAddress,
        COALESCE(company_details.contactPerson) AS contactPerson,
        vendors.created_at
    FROM vendors
    LEFT JOIN individual_details ON vendors.vendor_id = individual_details.vendor_id
    LEFT JOIN company_details ON vendors.vendor_id = company_details.vendor_id
    WHERE vendors.vendor_id = ?`
}

module.exports = vendorGetQueries;
