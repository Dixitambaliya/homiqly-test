const bookingGetQueries = {

    getVendorBookings: ` 
      SELECT
    sb.*,
    s.serviceName,
    sb.payment_status AS payment_status,
    (p.amount * (1 - ? / 100)) AS payment_amount,
    p.currency AS payment_currency,
    CONCAT(u.firstName, ' ', u.lastName) AS userName,
    u.profileImage AS userProfileImage,
    u.email AS userEmail,
    u.phone AS userPhone,
    u.address AS userAddress,
    u.state AS userState,
    u.postalcode AS userPostalCode,

    e.employee_id AS assignedEmployeeId,
    e.first_name AS employeeFirstName,
    e.last_name AS employeeLastName,
    e.email AS employeeEmail,
    e.phone AS employeePhone

      FROM service_booking sb
      LEFT JOIN services s ON sb.service_id = s.service_id
      LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
      LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
      LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
      LEFT JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN company_employees e ON sb.assigned_employee_id = e.employee_id
      WHERE sb.vendor_id = ?
        ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
`,

    userGetBooking: `
       SELECT
    sb.booking_id,
    sb.bookingDate,
    sb.bookingTime,
    sb.bookingStatus,
    sb.notes,
    sb.bookingMedia,
    sb.payment_intent_id,
    sb.payment_status,

    sc.serviceCategory,
    s.serviceName,

    v.vendorType,
    COALESCE(idet.id, cdet.id) AS vendor_id,
    COALESCE(idet.name, cdet.companyName) AS vendor_name,
    COALESCE(idet.email, cdet.companyEmail) AS vendor_email,
    COALESCE(idet.phone, cdet.companyPhone) AS vendor_phone,

    p.amount AS payment_amount,
    p.currency AS payment_currency

FROM service_booking sb
LEFT JOIN services s 
    ON sb.service_id = s.service_id
LEFT JOIN service_categories sc 
    ON s.service_categories_id = sc.service_categories_id
LEFT JOIN service_booking_types sbt 
    ON sb.booking_id = sbt.booking_id
LEFT JOIN service_type st 
    ON sbt.service_type_id = st.service_type_id
LEFT JOIN vendors v 
    ON sb.vendor_id = v.vendor_id
LEFT JOIN individual_details idet 
    ON v.vendor_id = idet.vendor_id
LEFT JOIN company_details cdet 
    ON v.vendor_id = cdet.vendor_id
LEFT JOIN payments p 
    ON p.payment_intent_id = sb.payment_intent_id
WHERE sb.user_id = ?
ORDER BY sb.bookingDate DESC, sb.bookingTime DESC;

`,

    getUserBookedAddons: `
    SELECT 
    sba.package_id,
    sba.addon_id,
    a.addonName,
    a.addonMedia,
    sba.price,
    sba.quantity
FROM service_booking_addons sba
JOIN package_addons a ON sba.addon_id = a.addon_id
WHERE sba.booking_id = ?
`,

    getVendorIdForBooking: `
    SELECT 
    vendorType 
    FROM vendors 
    WHERE 
    vendor_id = ?
`,

    getPlateFormFee: `
    SELECT 
    platform_fee_percentage 
    FROM platform_settings 
    WHERE vendor_type = ?
        ORDER BY id 
    DESC LIMIT 1
`,

    getBookedAddons: `
    SELECT 
        sba.package_id,
        sba.addon_id,
        a.addonName,
        sba.quantity
     FROM service_booking_addons sba
     LEFT JOIN package_addons a ON sba.addon_id = a.addon_id
     WHERE sba.booking_id = ?
        `,


    getBookedPackages: `
            SELECT
                sbp.package_id,
                p.packageName,
                p.packageMedia
                FROM service_booking_packages sbp
                LEFT JOIN packages p ON sbp.package_id = p.package_id
                WHERE sbp.booking_id = ?
`,

    getBookedSubPackages: `
        SELECT
            sbsp.sub_package_id AS item_id,
            pi.itemName,
            sbsp.quantity,
            pi.itemMedia,
            pi.timeRequired,
            pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
            WHERE sbsp.booking_id = ?
`,

    getBoookedPrefrences: `
                SELECT
                sp.preference_id,
                bp.preferenceValue
                FROM service_booking_preferences sp
                    LEFT JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                    WHERE sp.booking_id = ?
`,
    getBoookedConsents:
        `SELECT 
        c.consent_id,
        c.question,
        sbc.answer,
        sbc.package_id
        FROM service_booking_consents sbc
                    LEFT JOIN package_consent_forms c ON sbc.consent_id = c.consent_id
                    WHERE sbc.booking_id = ? `,

    getVendorByServiceTypeId: `
    SELECT vendor_id FROM vendor_packages
    WHERE package_id IN(
            SELECT package_id FROM packages WHERE service_type_id = ?
    )
    LIMIT 1
`,

    getBookingDetail: `
SELECT
    sb.booking_id,
    sb.bookingDate,
    sb.bookingTime,
    sb.bookingStatus,
    sb.notes,
    sb.bookingMedia,
    sb.payment_intent_id,
    sb.payment_status,

    sc.serviceCategory AS serviceCategoryName,
    s.serviceName AS serviceName,
    COALESCE(st.serviceTypeName, 'Not specified') AS serviceTypeName,

    CONCAT(u.firstName, ' ', u.lastName) AS userName,

    p.packageName AS packageName,
    pi.itemName AS subPackageName,
    a.title AS addonName,

    pay.amount AS payment_amount,
    pay.currency AS payment_currency

FROM service_booking sb
    -- 🔗 Join service types attached to this booking
    LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
    LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id

    -- 🔗 Get service + category via service_type
    LEFT JOIN services s ON st.service_id = s.service_id
    LEFT JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id

    -- 🔗 User info
    LEFT JOIN users u ON u.user_id = sb.user_id

    -- 🔗 Packages + items + addons
    LEFT JOIN packages p ON p.package_id = sbt.package_id
    LEFT JOIN package_items pi ON pi.item_id = sbt.sub_package_id
    LEFT JOIN addons a ON a.addon_id = sbt.addon_id

    -- 🔗 Payment info
    LEFT JOIN payments pay ON pay.payment_intent_id = sb.payment_intent_id

WHERE sb.booking_id = ?;

`,

    checkVendorAvailability: `
    SELECT * FROM service_booking
    WHERE vendor_id = ? AND bookingDate = ? AND bookingTime = ?
`,

    getBookingAvilability: `
    SELECT sb.booking_id
                FROM service_booking sb
                WHERE sb.user_id = ?
    AND sb.bookingDate = ?
        AND sb.bookingTime = ?
            AND sb.bookingStatus NOT IN(2, 4)-- allow only if previous is Rejected(2) or Completed(4)
                LIMIT 1
`,

    getUserBookedpackages: `
        SELECT
            p.package_id,
            p.packageName,
            p.packageMedia
                FROM service_booking_packages sbp
                JOIN packages p ON sbp.package_id = p.package_id
                WHERE sbp.booking_id = ?
`,

    getUserPackageItems: `
                SELECT
                    sbsp.sub_package_id AS item_id,
                    pi.itemName,
                    sbsp.price,
                    sbsp.quantity,
                    pi.itemMedia,
                    pi.timeRequired,
                    pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                WHERE sbsp.booking_id = ?
`,

    getUserBookedPrefrences: `
                SELECT
                    sp.preference_id,
                    bp.preferenceValue,
                    bp.preferencePrice
                FROM service_booking_preferences sp
                JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                WHERE sp.booking_id = ?
`

}

module.exports = bookingGetQueries;
