const serviceDeleteQueries = {
    
    CheckServiceById: `SELECT * FROM services WHERE service_id = ? `,

    DeleteService: `DELETE FROM services WHERE service_id = ? `,

    CheckServicesUnderCategory: `SELECT * FROM services WHERE service_categories_id = ?`,

    CheckCategoryById: `SELECT * FROM service_categories WHERE service_categories_id = ?`,

    deleteCategory: `DELETE FROM service_categories WHERE service_categories_id = ?`,

    deleteCity: `DELETE FROM service_city WHERE service_city_id = ?`,

    checkCityById: `
        SELECT * FROM service_city WHERE service_city_id = ?
    `

}

module.exports = serviceDeleteQueries;