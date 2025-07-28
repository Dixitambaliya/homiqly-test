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
            LEFT JOIN service_booking_types ON service_booking.booking_id = service_booking_types.booking_id
            LEFT JOIN service_type ON service_booking_types.service_type_id = service_type.service_type_id
            WHERE service_booking.vendor_id = ?
            ORDER BY service_booking.bookingDate DESC, service_booking.bookingTime DESC`,

    userGetBooking: `SELECT
                sb.booking_id,
                sb.bookingDate,
                sb.bookingTime,
                sb.bookingStatus,
                sb.notes,
                sb.bookingMedia,
                sb.payment_intent_id,

                sc.serviceCategory,
                s.serviceName,

                st.serviceTypeName,
                st.serviceTypeMedia,

                v.vendorType,

                COALESCE(idet.id, cdet.id) AS vendor_id,
                COALESCE(idet.name, cdet.companyName) AS vendor_name,
                COALESCE(idet.email, cdet.companyEmail) AS vendor_email,
                COALESCE(idet.phone, cdet.companyPhone) AS vendor_phone,

                p.status AS payment_status,
                p.amount AS payment_amount,
                p.currency AS payment_currency

            FROM service_booking sb
            LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
            LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
            WHERE sb.user_id = ?
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC`,


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
    SELECT vendor_id FROM vendor_packages
    WHERE package_id IN (
        SELECT package_id FROM packages WHERE service_type_id = ?
    )
    LIMIT 1`,

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
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
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
