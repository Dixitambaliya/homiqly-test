const vendorQueries = {


    vendorCheck: `SELECT * FROM vendors WHERE email = ?`,

    vendorMailCheck: 'SELECT * FROM vendors WHERE email = ?',



    getServiceCity: `SELECT serviceCity FROM services WHERE service_id = ?`,


    updateServiceType: `UPDATE
                    service_type
                    SET serviceTypeName = ?,
                    serviceTypeMedia = ?
                    WHERE service_id = ?`,


    getCategoryByName: 'SELECT * FROM service_categories WHERE serviceCategory = ?',





}

module.exports = vendorQueries;
