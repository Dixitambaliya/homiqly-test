const checkVendorOverlap = async (conn, vendorId, bookingDate, bookingTime, totalTime) => {
    const vendorBreakMinutes = 60;

    const [[row]] = await conn.query(`
        SELECT COUNT(*) AS overlap
        FROM service_booking
        WHERE vendor_id = ?
        AND bookingDate = ?
        AND (
            STR_TO_DATE(CONCAT(?, ' ', ?), '%Y-%m-%d %H:%i:%s')
                < DATE_ADD(
                    STR_TO_DATE(CONCAT(bookingDate, ' ', bookingTime), '%Y-%m-%d %H:%i:%s'),
                    INTERVAL totalTime + ${vendorBreakMinutes} MINUTE
                )
        AND
            STR_TO_DATE(CONCAT(bookingDate, ' ', bookingTime), '%Y-%m-%d %H:%i:%s')
                < DATE_ADD(
                    STR_TO_DATE(CONCAT(?, ' ', ?), '%Y-%m-%d %H:%i:%s'),
                    INTERVAL ? + ${vendorBreakMinutes} MINUTE
                )
      )
    `, [
        vendorId,
        bookingDate,
        bookingDate, bookingTime,
        bookingDate, bookingTime,
        totalTime
    ]);

    return row.overlap > 0;
};

module.exports = { checkVendorOverlap };