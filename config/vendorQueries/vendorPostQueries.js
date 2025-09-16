const vendorPostQueries = {

    getServiceIdByName: `SELECT service_id FROM services WHERE serviceName = ?`,

    checkServiceType: `SELECT 1 FROM service_type WHERE service_id = ?`,



    insertServiceType: `INSERT INTO service_type (service_id, vendor_id,serviceTypeName, serviceTypeMedia, is_approved) VALUES (?, ?, ?, ?,?)`

}

module.exports = vendorPostQueries;
