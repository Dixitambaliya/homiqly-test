const bookingGetQueries = {

    getVendorBookings: `SELECT
        service_booking.booking_id AS bookingId,
        CONCAT(users.firstName, ' ', users.lastName) AS userName,
        service_categories.serviceCategory AS serviceCategory,
        services.serviceName AS serviceName,
        service_type.serviceTypeName AS serviceType,
        service_booking.bookingDate,
        service_booking.bookingTime,
        service_booking.bookingStatus
        FROM service_booking
            JOIN users ON service_booking.user_id = users.user_id
            JOIN service_categories ON service_booking.service_categories_id = service_categories.service_categories_id
            JOIN services ON service_booking.service_id = services.service_id
            JOIN service_type ON service_booking.service_type_id = service_type.service_type_id
            WHERE service_booking.vendor_id = ?
            ORDER BY service_booking.bookingDate DESC, service_booking.bookingTime DESC`,

    getUserBookings: `
   SELECT
    sb.booking_id,
    sb.bookingDate,
    sb.bookingTime,
    sb.bookingStatus,
    sb.notes,
    sb.bookingMedia,

    sc.serviceCategory,
    s.serviceName,
    st.serviceTypeName,
    st.serviceTypeMedia,
    st.is_approved,

    v.vendor_id,
    v.vendorType,

    -- Individual vendor details
    ind.id AS individual_id,
    ind.name AS individualName,
    ind.phone AS individualPhone,
    ind.email AS individualEmail,

    -- Company vendor details
    comp.id AS company_id,
    comp.companyName,
    comp.contactPerson,
    comp.companyEmail,
    comp.companyPhone

FROM service_booking sb
JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
JOIN services s ON sb.service_id = s.service_id
JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
JOIN service_type st ON sbt.service_type_id = st.service_type_id
JOIN vendors v ON sb.vendor_id = v.vendor_id
LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
WHERE sb.user_id = ?
ORDER BY sb.bookingDate DESC, sb.bookingTime DESC`,

    getVendorByServiceTypeId: `
    SELECT vendor_id FROM service_type WHERE service_type_id = ?`,

    getBookingDetail: `
    SELECT
        sb.booking_id,
        sb.bookingDate,
        sc.serviceCategory AS serviceCategoryName,
        s.serviceName AS serviceName,
        COALESCE(st.serviceTypeName, 'Not specified') AS serviceTypeName,
        CONCAT(u.firstName, ' ', u.lastName) AS userName,

        p.package_name AS packageName,
        pi.item_name AS subPackageName,
        a.title AS addonName

        FROM service_booking sb
            JOIN service_categories sc ON sc.service_categories_id = sb.service_categories_id
            JOIN services s ON s.service_id = sb.service_id
            LEFT JOIN service_type st ON st.service_type_id = sb.service_type_id
            JOIN users u ON u.user_id = sb.user_id

            LEFT JOIN packages p ON p.package_id = sb.package_id
            LEFT JOIN package_items pi ON pi.item_id = sb.sub_package_id
            LEFT JOIN addons a ON a.addon_id = sb.addon_id

            WHERE sb.booking_id = ?`,

    checkVendorAvailability: `
    SELECT * FROM service_booking
    WHERE vendor_id = ? AND bookingDate = ? AND bookingTime = ?`,

}

module.exports = bookingGetQueries;
