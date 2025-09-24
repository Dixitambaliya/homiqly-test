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
                    parkingInstruction,
                    postalCode AS postalcode,
                    address,
                    email
                        FROM users WHERE user_id = ?`,


    getServices: `SELECT
    services.service_id,
    services.serviceName,
    services.serviceFilter,
    service_categories.serviceCategory AS serviceCategory
        FROM services
        LEFT JOIN service_categories ON services.service_categories_id = service_categories.service_categories_id;`,

    getAllServicesWithCategory: `
       SELECT 
    sc.serviceCategory AS categoryName,
    sc.service_categories_id AS serviceCategoryId,
    s.service_id AS serviceId,
    s.serviceName,
    s.serviceDescription,
    s.serviceImage,
    s.serviceFilter,
    s.slug,
    st.service_type_id
FROM services s
JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
JOIN service_type st ON st.service_id = s.service_id
JOIN packages p ON p.service_type_id = st.service_type_id
-- ensure package is valid
WHERE p.package_id IS NOT NULL AND p.package_id <> ''
GROUP BY s.service_id, st.service_type_id;

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
    st.created_at
FROM service_type st
WHERE st.service_id = ?
ORDER BY st.service_type_id DESC`,


}

module.exports = userGetQueries;
