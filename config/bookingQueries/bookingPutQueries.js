const bookingPutQueries = {

    approveOrRejectBooking: `
    UPDATE service_booking
    SET bookingStatus = ?
    WHERE service_booking_id = ? AND vendor_id = ?
`,
}

module.exports = bookingPutQueries; 
