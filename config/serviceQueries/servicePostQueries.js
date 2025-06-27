const servicePostQueries = {
    CheckExistingServices: `SELECT * FROM services WHERE service_id = ?`,

    CheckExistingCategory: `SELECT * FROM service_categories WHERE serviceCategory = ?;`,

    InsertCategory: `INSERT INTO service_categories (serviceCategory) VALUES (?)`,


    insertService: `INSERT INTO services (
            service_categories_id,
            serviceName,
            serviceDescription,
            serviceImage,
            slug
        ) VALUES (?, ?, ?, ?, ?);`,

    checkCity: `SELECT * FROM service_city WHERE serviceCityName = ?`,

    insertCity: `INSERT INTO service_city (serviceCityName) VALUES (?)`,

    getServiceIdByName: `SELECT service_id FROM services WHERE serviceName = ?`,

    checkServiceType: `SELECT 1 FROM service_type WHERE service_id = ? AND serviceTypeName = ?`,

    insertServiceType: `INSERT INTO service_type (service_id, vendor_id, serviceTypeName) VALUES (?, ?)`,

}

module.exports = servicePostQueries;