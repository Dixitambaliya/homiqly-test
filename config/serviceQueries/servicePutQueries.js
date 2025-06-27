const servicePutQueries = {

    CheckServiceById: `SELECT * FROM services WHERE service_id = ? `,

    CheckExistingCategory: `SELECT * FROM service_categories WHERE serviceCategory = ?;`,

    CheckCategoryById: `SELECT * FROM service_categories WHERE service_categories_id = ?`,

    updateCategory: `UPDATE service_categories SET serviceCategory = ? WHERE service_categories_id  = ?`,

    updateCity: `UPDATE service_city SET serviceCityName = ? WHERE service_city_id = ?`,

    checkCityById: `
        SELECT * FROM service_city WHERE service_city_id = ?
    `,
     updateServiceWithImage : `UPDATE services
    SET service_categories_id = ?, serviceName = ?, serviceDescription = ?, serviceImage = ?
    WHERE service_id = ?`,

    updateServiceWithoutImage: `
    UPDATE services
    SET service_categories_id = ?, serviceName = ?, serviceDescription = ?
    WHERE service_id = ?`,

      updateService: `UPDATE services SET serviceName = ? WHERE service_id = ?`,


}

module.exports = servicePutQueries;
