const userGetQueries = {

    getServiceCategories: `SELECT
                                serviceCategory,
                                service_categories_id
                                    FROM service_categories`,

    getUsersData: `SELECT
                    CONCAT(firstName,' ',lastName) AS fullName,
                    profileImage,
                    phone,
                    email
                        FROM users WHERE user_id = ?`,


    getServices: `SELECT
    services.service_id,
    services.serviceName,
    service_categories.serviceCategory AS serviceCategory
        FROM services
        LEFT JOIN service_categories ON services.service_categories_id = service_categories.service_categories_id;`,

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

    getCategoriesById: `SELECT
                        service_id,
                        serviceName,
                        serviceImage,
                        serviceDescription
                        FROM services WHERE service_categories_id = ?`,

    getServiceNames: `
   SELECT
    st.service_type_id,
    st.service_id,
    st.serviceTypeName,
    st.serviceTypeMedia,
    st.created_at
FROM service_type st
WHERE st.is_approved = 1
ORDER BY st.service_type_id DESC`,


}

module.exports = userGetQueries;
