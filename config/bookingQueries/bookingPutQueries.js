const bookingPutQueries = {

    approveOrRejectBooking: `
    UPDATE service_booking
    SET bookingStatus = ?
    WHERE booking_id = ? AND vendor_id = ?
`,
}

module.exports = bookingPutQueries;