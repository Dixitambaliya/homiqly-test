const userGetQueries = {

    getServiceCategories: `SELECT
                                serviceCategory,
                                service_categories_id
                                    FROM service_categories`,

    getUsersData: `SELECT
                    firstName,
                    lastName,
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
    sc.serviceCategory,
    s.service_id,
    s.service_categories_id ,
    s.serviceName,
    s.serviceDescription,
    s.serviceImage,
    s.slug,
    st.service_type_id,
    st.serviceTypeName,
    st.serviceTypeMedia
FROM service_categories sc
LEFT JOIN services s ON sc.service_categories_id  = s.service_categories_id 
LEFT JOIN service_type st ON s.service_id = st.service_id
`,

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
WHERE st.service_id = ?
ORDER BY st.service_type_id DESC`,


}

module.exports = userGetQueries;
