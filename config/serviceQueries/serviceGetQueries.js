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
                sc.service_categories_id,
                sc.serviceCategory,
                ssc.subcategory_id,
                ssc.subCategories
            FROM service_categories sc
            LEFT JOIN service_subcategories ssc 
                ON sc.service_categories_id = ssc.service_categories_id
            ORDER BY sc.service_categories_id, ssc.subtype_id`,

    getCities: `SELECT * FROM service_city ORDER BY serviceCityName ASC`,

    getAllServices: `SELECT * FROM services WHERE service_id = ?`

}

module.exports = serviceGetQueries;
