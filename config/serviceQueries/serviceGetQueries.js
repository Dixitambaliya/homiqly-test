const serviceGetQueries = {

    getAllServicesWithCategory: `
SELECT
    sc.service_categories_id AS serviceCategoryId,
    sc.serviceCategory AS categoryName,
    s.service_id AS serviceId,
    s.serviceName,
    s.subCategory,
    s.serviceDescription,
    s.serviceImage,
    s.slug,
    ss.subcategory_type_id,
    ss.subCategories AS subCategory
FROM service_categories sc
LEFT JOIN services s
    ON s.service_categories_id = sc.service_categories_id
LEFT JOIN service_subcategoriestype ss
    ON ss.service_categories_id = s.service_categories_id;
`,


    getServiceCategories: `
    SELECT
    sc.service_categories_id,
    sc.serviceCategory,
    ssct.subcategory_id,
    ssct.subCategories
FROM service_categories sc
LEFT JOIN service_subcategoriestype ssct
    ON sc.service_categories_id = ssct.service_categories_id
ORDER BY sc.service_categories_id, ssct.subcategory_id;

 `,

    getCities: `SELECT * FROM service_city ORDER BY serviceCityName ASC`,

    getAllServices: `SELECT * FROM services WHERE service_id = ?`

}

module.exports = serviceGetQueries;
