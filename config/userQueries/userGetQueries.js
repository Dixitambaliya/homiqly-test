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
    service_type.service_type_id,
    services.serviceName,
    service_type.serviceTypeName,
    service_type.is_approved,
    service_type.serviceTypeMedia,
    services.serviceDescription

        FROM service_type
        JOIN vendors ON service_type.vendor_id = vendors.vendor_id
        JOIN services ON service_type.service_id = services.service_id

        LEFT JOIN individual_details ON individual_details.vendor_id = vendors.vendor_id
        LEFT JOIN individual_services ON individual_services.vendor_id = vendors.vendor_id
        AND individual_services.service_id = service_type.service_id

        LEFT JOIN company_details ON company_details.vendor_id = vendors.vendor_id
        LEFT JOIN company_services ON company_services.vendor_id = vendors.vendor_id
        AND company_services.service_id = service_type.service_id

        WHERE service_type.service_id = ?
        AND service_type.is_approved = 1

        GROUP BY service_type.service_type_id

        ORDER BY service_type.service_type_id DESC`,

    getApprovedServices: `
    SELECT
      st.service_type_id,
      st.serviceTypeName,
      st.serviceTypeMedia,
      st.is_approved,

      s.service_id,
      s.service_categories_id,
      s.serviceName,
      s.serviceDescription,

        v.vendor_id,
        v.vendorType,

        CASE WHEN v.vendorType = 'individual' THEN ind.id END AS id,
        CASE WHEN v.vendorType = 'individual' THEN ind.name END AS name,
        CASE WHEN v.vendorType = 'individual' THEN ind.phone END AS phone,
        CASE WHEN v.vendorType = 'individual' THEN ind.email END AS email,

        CASE WHEN v.vendorType = 'company' THEN comp.id END AS company_id,
        CASE WHEN v.vendorType = 'company' THEN comp.companyName END AS companyName,
        CASE WHEN v.vendorType = 'company' THEN comp.contactPerson END AS contactPerson,
        CASE WHEN v.vendorType = 'company' THEN comp.companyEmail END AS companyEmail,
        CASE WHEN v.vendorType = 'company' THEN comp.companyPhone END AS companyPhone,

      COALESCE((
        SELECT CONCAT('[', GROUP_CONCAT(
          JSON_OBJECT(
            'addon_id', a.addon_id,
            'title', a.title,
            'description', a.description,
            'price', a.price,
            'time_required', a.time_required,
            'frequency', a.frequency
          )
        ), ']')
        FROM addons a
        WHERE a.service_type_id = st.service_type_id
      ), '[]') AS addons,

      COALESCE((
        SELECT CONCAT('[', GROUP_CONCAT(
          JSON_OBJECT(
            'package_id', p.package_id,
            'title', p.package_name,
            'description', p.description,
            'price', p.total_price,
            'time_required', p.total_time,
            'sub_packages', IFNULL((
              SELECT CONCAT('[', GROUP_CONCAT(
                JSON_OBJECT(
                  'sub_package_id', pi.item_id,
                  'title', pi.item_name,
                  'description', pi.description,
                  'price', pi.price,
                  'time_required', pi.time_required
                )
              ), ']')
              FROM package_items pi
              WHERE pi.package_id = p.package_id
            ), '[]')
          )
        ), ']')
        FROM packages p
        WHERE p.service_type_id = st.service_type_id
      ), '[]') AS packages

    FROM service_type st
    LEFT JOIN vendors v ON st.vendor_id = v.vendor_id
    LEFT JOIN services s ON st.service_id = s.service_id
    LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
    LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id

    WHERE is_approved = 1
    ORDER BY st.service_type_id DESC`,


}

module.exports = userGetQueries;
