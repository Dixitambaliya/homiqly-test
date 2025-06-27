const serviceGetQueries = {

    getAllServicesWithCategory: `
        SELECT
        service_categories.serviceCategory AS categoryName,
        service_categories.service_categories_id AS serviceCategoryId,
        services.service_id AS serviceId,
        services.serviceName,
        services.serviceDescription,
        services.serviceImage,
        services.slug
                FROM service_categories
                LEFT JOIN services services ON service_categories.service_categories_id = services.service_categories_id`,


    getServiceCategories: `SELECT
                                serviceCategory,
                                service_categories_id
                                    FROM service_categories`,
    getCities: `SELECT * FROM service_city ORDER BY serviceCityName ASC`,

}

module.exports = serviceGetQueries;