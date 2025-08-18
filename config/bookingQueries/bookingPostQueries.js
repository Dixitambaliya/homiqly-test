const bookingPostQueries = {

    checkUserBookingSlot: `
    SELECT * FROM service_booking
    WHERE user_id = ? AND service_id = ? AND bookingDate = ? AND bookingTime = ?
    `,

    checkVendorAvailability: `
    SELECT * FROM service_booking
    WHERE vendor_id = ? AND bookingDate = ? AND bookingTime = ?
    `,

    insertBooking: `
        INSERT INTO 
        service_booking (
        service_categories_id, 
        service_id, 
        user_id,
        bookingDate, 
        bookingTime, 
        vendor_id,
        notes, 
        bookingMedia, 
        payment_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
 `,

    insertPackageBooking: `
    INSERT INTO
package_bookings
( user_id,
service_categories_id,
service_id,
package_id,
booking_date,
booking_time,
notes,
booking_media
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
 `,

    insertSubPackageBooking: `
    INSERT INTO sub_package_bookings (
package_booking_id,
sub_package_id,
sub_package_price
) VALUES (?, ?, ?)
 `,

    insertAddonBooking: `
    INSERT INTO package_addon_bookings (
package_booking_id,
addon_id
) VALUES (?, ?)
 `,

    insertserviceType: `INSERT INTO 
    service_booking_types 
    (booking_id, service_type_id) 
    VALUES (?, ?)
`,

    insertPackages: `INSERT INTO 
    service_booking_packages 
    (booking_id, package_id) 
    VALUES (?, ?)
    `,

    insertSubPackages: `
    INSERT INTO 
    service_booking_sub_packages 
    (booking_id, sub_package_id, price, quantity)
    VALUES (?, ?, ?, ?)
    `,

    insertPreference: `
    INSERT INTO 
    service_preferences 
    (booking_id, preference_id) 
    VALUES (?, ?)  
    `,


}

module.exports = bookingPostQueries;
