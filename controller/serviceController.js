const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");
const admin = require("../config/firebaseConfig");
const serviceGetQueries = require("../config/serviceQueries/serviceGetQueries");
const servicePostQueries = require("../config/serviceQueries/servicePostQueries");
const servicePutQueries = require("../config/serviceQueries/servicePutQueries");
const serviceDeleteQueries = require("../config/serviceQueries/serviceDeleteQueries");
const userGetQueries = require("../config/userQueries/userGetQueries");

const generateSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')       // Replace spaces with -
        .replace(/[^\w\-]+/g, '')   // Remove all non-word characters
        .replace(/\-\-+/g, '-');    // Replace multiple - with single -
};

const addCategory = asyncHandler(async (req, res) => {
    const { categoryName } = req.body;

    if (!categoryName) {
        return res.status(400).json({ message: "Category name is required" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check duplicate category
        const [existingCategory] = await connection.query(
            servicePostQueries.CheckExistingCategory,
            [categoryName]
        );
        if (existingCategory.length > 0) {
            return res.status(400).json({ message: "Category already exists" });
        }

        // Insert category
        const [result] = await connection.query(
            servicePostQueries.InsertCategory,
            [categoryName]
        );
        const serviceCategoryId = result.insertId;

        await connection.commit();

        // Send FCM notification to vendors
        const [rows] = await connection.query(
            "SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL"
        );
        const tokens = rows.map((row) => row.fcmToken).filter(Boolean);
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "New Category Available!",
                    body: `Explore services under the new category: ${categoryName}`,
                },
                tokens,
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("FCM Notification sent:", response.successCount, "successes");
        }

        res.status(201).json({
            message: "Category added successfully",
            serviceCategoryId,
        });
    } catch (err) {
        await connection.rollback();
        console.error("Category addition failed:", err);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        connection.release();
    }
});

const addService = asyncHandler(async (req, res) => {
    let { serviceName, categoryName, serviceDescription, serviceFilter } = req.body;

    if (!serviceName || !categoryName || !serviceFilter) {
        return res.status(400).json({ message: "serviceName, categoryName, and serviceFilter are required" });
    }

    const serviceImage = req.uploadedFiles?.serviceImage?.[0]?.url || null;
    if (!serviceImage) {
        return res.status(400).json({ message: "Service image is required" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // ✅ Check if service already exists
        const [existingServices] = await connection.query(
            servicePostQueries.CheckExistingServices,
            [serviceName]
        );
        if (existingServices.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Service already exists" });
        }

        // ✅ Check if category exists
        const [existingCategory] = await connection.query(
            servicePostQueries.CheckExistingCategory,
            [categoryName]
        );
        if (existingCategory.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                message: "Category does not exist. Please add the category first.",
            });
        }

        const service_categories_id = existingCategory[0].service_categories_id;
        const slug = generateSlug(serviceName);

        // ✅ Insert service with serviceFilter
        await connection.query(
            `INSERT INTO services 
            (service_categories_id, serviceName, serviceDescription, serviceImage, slug, serviceFilter) 
            VALUES (?, ?, ?, ?, ?, ?)` ,
            [service_categories_id, serviceName, serviceDescription, serviceImage, slug, serviceFilter]
        );

        // ✅ Send FCM Notifications
        const [rows] = await connection.query(
            "SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL"
        );
        const tokens = rows.map((row) => row.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "New Service Available!",
                    body: `${serviceName} (${serviceFilter}) has been added under ${categoryName}`,
                },
                tokens,
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("FCM Notification sent:", response.successCount, "successes");
        }

        await connection.commit();
        res.status(201).json({ message: "Service added successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Service addition failed:", err);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        connection.release();
    }
});

// ✅ Create Service Filter
const addServiceFilter = asyncHandler(async (req, res) => {
    const { serviceFilter } = req.body;

    if (!serviceFilter) {
        return res.status(400).json({ message: "serviceFilter is required" });
    }

    const [existing] = await db.query(
        "SELECT * FROM service_filters WHERE serviceFilter = ?",
        [serviceFilter]
    );

    if (existing.length > 0) {
        return res.status(400).json({ message: "Service filter already exists" });
    }

    await db.query(
        "INSERT INTO service_filters (serviceFilter) VALUES (?)",
        [serviceFilter]
    );

    res.status(201).json({ message: "Service filter created successfully" });
});

const getServiceFilters = asyncHandler(async (req, res) => {
    const [filters] = await db.query("SELECT service_filter_id , serviceFilter FROM service_filters ORDER BY serviceFilter ASC");
    res.status(200).json(filters);
});

// ✅ Update Service Filter
const updateServiceFilter = asyncHandler(async (req, res) => {
    const { service_filter_id } = req.params;
    const { serviceFilter } = req.body;

    const [existing] = await db.query(
        "SELECT * FROM service_filters WHERE service_filter_id = ?",
        [service_filter_id]
    );

    if (existing.length === 0) {
        return res.status(404).json({ message: "Service filter not found" });
    }

    await db.query(
        "UPDATE service_filters SET serviceFilter = ? WHERE service_filter_id = ?",
        [serviceFilter || existing[0].serviceFilter, service_filter_id]
    );

    res.status(200).json({ message: "Service filter updated successfully" });
});

// ✅ Delete Service Filter
const deleteServiceFilter = asyncHandler(async (req, res) => {
    const { service_filter_id } = req.params;

    const [existing] = await db.query(
        "SELECT * FROM service_filters WHERE service_filter_id = ?",
        [service_filter_id]
    );

    if (existing.length === 0) {
        return res.status(404).json({ message: "Service filter not found" });
    }

    await db.query("DELETE FROM service_filters WHERE service_filter_id = ?", [service_filter_id]);

    res.status(200).json({ message: "Service filter deleted successfully" });
});


const addServiceCity = asyncHandler(async (req, res) => {
    const { serviceCity } = req.body;

    if (!serviceCity || serviceCity.trim() === '') {
        return res.status(400).json({ message: "City name is required" });
    }

    try {
        const [checkExistingCity] = await db.query(servicePostQueries.checkCity, [serviceCity.trim()])

        if (checkExistingCity.length > 0) {
            return res.json(400).status({ message: "City not found" })
        }
        await db.query(servicePostQueries.insertCity, [serviceCity.trim()])

        res.status(201).json({ message: "City added successfully" });

    } catch (err) {
        console.error("Error fetching vendor details:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

const addServiceType = asyncHandler(async (req, res) => {
    const { service_id, subtype_id = null, subtypeName = null } = req.body;
    const serviceTypeMedia = req.uploadedFiles?.serviceTypeMedia?.[0]?.url || null;
    const subtypeMedia = req.uploadedFiles?.subtypeMedia?.[0]?.url || null;

    if (!service_id) {
        return res.status(400).json({ message: "service_id are required." });
    }

    // Ensure service exists
    const [serviceExists] = await db.query(
        `SELECT service_id FROM services WHERE service_id = ?`,
        [service_id]
    );
    if (serviceExists.length === 0) {
        return res.status(404).json({ message: "Service not found." });
    }

    let finalSubtypeId = null;

    // Case 1: subtype_id given → validate it
    if (subtype_id) {
        const [subtypeExists] = await db.query(
            `SELECT subtype_id FROM service_subtypes WHERE subtype_id = ? AND service_id = ?`,
            [subtype_id, service_id]
        );
        if (subtypeExists.length === 0) {
            return res.status(404).json({ message: "Subtype not found under this service." });
        }
        finalSubtypeId = subtype_id;
    }

    // Case 2: subtypeName given (create new one if not exists)
    else if (subtypeName) {
        const [existingSubtype] = await db.query(
            `SELECT subtype_id FROM service_subtypes WHERE service_id = ? AND subtypeName = ?`,
            [service_id, subtypeName.trim()]
        );

        if (existingSubtype.length > 0) {
            finalSubtypeId = existingSubtype[0].subtype_id; // reuse old one
        } else {
            const [insertSubtype] = await db.query(
                `INSERT INTO service_subtypes (service_id, subtypeName, subtypeMedia)
                 VALUES (?, ?, ?)`,
                [service_id, subtypeName.trim(), subtypeMedia]
            );
            finalSubtypeId = insertSubtype.insertId;
        }
    }

    // Prevent duplicate serviceType under same service + subtype
    const [existingType] = await db.query(
        `SELECT 1 FROM service_subtypes WHERE service_id = ? AND (subtype_id <=> ?)`,
        [service_id, finalSubtypeId]
    );
    if (existingType.length > 0) {
        return res.status(409).json({ message: "Service type already exists under this service/subtype." });
    }

    // Insert new service type
    const [result] = await db.query(
        `INSERT INTO service_type (service_id, serviceTypeMedia)
         VALUES (?, ?, ?)`,
        [service_id, serviceTypeMedia]
    );

    res.status(201).json({
        message: "Service type created successfully.",
        service_type_id: result.insertId,
        subtype_id: finalSubtypeId
    });
});

// Get service type by ID
const getServiceTypeById = asyncHandler(async (req, res) => {
    const { service_id } = req.params;

    if (!service_id) {
        return res.status(400).json({ message: "service_type_id is required." });
    }

    const [rows] = await db.query(
        `SELECT
            service_type_id,
            service_id,
            serviceTypeName,
            serviceTypeMedia
         FROM service_type
         WHERE service_id = ?`,
        [service_id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Service type not found." });
    }

    res.status(200).json(rows[0]);
});

const getAdminService = asyncHandler(async (req, res) => {
    try {
        // Fetch all services with category + subcategories
        const [rows] = await db.query(serviceGetQueries.getAllServicesWithCategory);

        const grouped = rows.reduce((acc, row) => {
            const category = row.categoryName;

            if (!acc[category]) {
                acc[category] = {
                    categoryName: category,
                    serviceCategoryId: row.serviceCategoryId,
                    services: []
                };
            }

            // ✅ Add service if not already added
            if (row.serviceId && !acc[category].services.some(s => s.serviceId === row.serviceId)) {
                acc[category].services.push({
                    serviceId: row.serviceId,
                    categoryName: category,
                    serviceCategoryId: row.serviceCategoryId,
                    serviceFilter: row.serviceFilter,
                    title: row.title,
                    description: row.serviceDescription,
                    serviceName: row.serviceName,
                    serviceImage: row.serviceImage,
                    slug: row.slug
                });
            }

            return acc;
        }, {});

        // Convert grouped object to array for easier frontend handling
        const result = Object.values(grouped);

        res.status(200).json({ services: result });
    } catch (err) {
        console.error("Error fetching services:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const getAdminServicesWithfilter = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                sc.service_categories_id AS serviceCategoryId,
                sc.serviceCategory AS categoryName,
                s.service_id AS serviceId,
                s.serviceName,
                -- ✅ Add hasValidPackage column
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM service_type st
                        JOIN packages p ON p.service_type_id = st.service_type_id
                        WHERE st.service_id = s.service_id
                          AND p.packageName IS NOT NULL AND p.packageName <> ''
                          AND p.packageMedia IS NOT NULL AND p.packageMedia <> ''
                    ) 
                    THEN 1 ELSE 0
                END AS hasValidPackage
            FROM services s
            JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
            -- ✅ Still only include services with valid packages
            WHERE NOT EXISTS (
                SELECT 1
                FROM service_type st
                JOIN packages p ON p.service_type_id = st.service_type_id
                WHERE st.service_id = s.service_id
                  AND (p.packageName IS NULL OR p.packageName = '' 
                       OR p.packageMedia IS NULL OR p.packageMedia = '')
            )
        `);

        const grouped = rows.reduce((acc, row) => {
            const category = row.categoryName;

            if (!acc[category]) {
                acc[category] = {
                    categoryName: category,
                    serviceCategoryId: row.serviceCategoryId,
                    services: []
                };
            }

            if (row.serviceId && !acc[category].services.some(s => s.serviceId === row.serviceId)) {
                acc[category].services.push({
                    serviceId: row.serviceId,
                    categoryName: category,
                    serviceCategoryId: row.serviceCategoryId,
                    serviceName: row.serviceName,
                    hasValidPackage: row.hasValidPackage === 1 // boolean
                });
            }

            return acc;
        }, {});

        res.status(200).json({ services: Object.values(grouped) });
    } catch (err) {
        console.error("Error fetching services:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


const getService = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(userGetQueries.getServices);

        const service = rows.map(row => ({
            service: row.serviceName,
            serviceId: row.service_id,
            subCategory: row.subCategory,
            serviceFilter: row.serviceFilter
        }))

        res.status(200).json({
            message: "Service fetched successfully",
            service
        });
    } catch (err) {
        console.error("Error fetching service:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getServiceCategories = asyncHandler(async (req, res) => {
    try {
        // Query categories + subcategoriestype
        const [rows] = await db.query(`
            SELECT
                sc.service_categories_id,
                sc.serviceCategory,
                ssct.subcategory_type_id,
                ssct.subCategories
            FROM service_categories sc
            LEFT JOIN service_subcategoriestype ssct
                ON sc.service_categories_id = ssct.service_categories_id
            ORDER BY sc.service_categories_id, ssct.subcategory_type_id
        `);

        // Group categories with their subcategoriestype
        const categoriesMap = {};

        rows.forEach(row => {
            // Add main category if it doesn't exist
            if (!categoriesMap[row.service_categories_id]) {
                categoriesMap[row.service_categories_id] = {
                    serviceCategoryId: row.service_categories_id,
                    serviceCategory: row.serviceCategory,
                    subCategoryTypes: []
                };
            }

            // Add subcategoriestype if exists
            if (row.subcategory_type_id) {
                categoriesMap[row.service_categories_id].subCategoryTypes.push({
                    subcategory_type_id: row.subcategory_type_id,
                    subCategory: row.subCategories
                });
            }
        });

        const categories = Object.values(categoriesMap);

        res.status(200).json({
            message: "Service categories with subcategoriestypes fetched successfully",
            categories
        });
    } catch (err) {
        console.error("Error fetching service categories:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getcity = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(serviceGetQueries.getCities);

        const city = rows.map(row => ({
            service_city_id: row.service_city_id,
            serviceCity: row.serviceCityName,
        }))

        res.status(200).json({
            message: "Cities fetched successfully",
            city
        });
    } catch (err) {
        console.error("Error fetching cities:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const editService = asyncHandler(async (req, res) => {
    const { serviceId, serviceName, categoryName, serviceDescription, serviceFilter } = req.body;

    if (!serviceId || !serviceName || !categoryName) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const serviceImage = req.uploadedFiles?.serviceImage?.[0]?.url || null;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if service exists
        const [existingService] = await connection.query(servicePutQueries.CheckServiceById, [serviceId]);
        if (existingService.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Service not found" });
        }

        // 2. Check if category exists
        const [existingCategory] = await connection.query(servicePutQueries.CheckExistingCategory, [categoryName]);
        if (existingCategory.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Category does not exist" });
        }

        const service_categories_id = existingCategory[0].service_categories_id;

        // 3. Build dynamic query
        const query = serviceImage
            ? `UPDATE services 
               SET service_categories_id = ?, serviceName = ?, serviceDescription = ?, serviceImage = ?, serviceFilter = ?
               WHERE service_id = ?`
            : `UPDATE services 
               SET service_categories_id = ?, serviceName = ?, serviceDescription = ?, serviceFilter = ?
               WHERE service_id = ?`;

        const params = serviceImage
            ? [service_categories_id, serviceName, serviceDescription, serviceImage, serviceFilter, serviceId]
            : [service_categories_id, serviceName, serviceDescription, serviceFilter, serviceId];

        // 4. Update service
        await connection.query(query, params);

        await connection.commit();
        res.status(200).json({ message: "Service updated successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Service update failed:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    } finally {
        connection.release();
    }
});


const deleteService = asyncHandler(async (req, res) => {
    const { serviceId } = req.body;

    try {
        const [existingService] = await db.query(serviceDeleteQueries.CheckServiceById, [serviceId])
        if (existingService.length === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        // Delete service
        await db.query(serviceDeleteQueries.DeleteService, [serviceId]);
        res.status(200).json({ message: "Service deleted successfully" })
    } catch (err) {
        console.error("Service deletion failed", err);
        res.status(500).json({ error: "Internal server error", details: err.message })
    }
})

const editCategory = asyncHandler(async (req, res) => {
    const { serviceCategoryId, newCategoryName, subCategories } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1️⃣ Check if the category exists
        const [existingCategory] = await connection.query(
            servicePutQueries.CheckCategoryById,
            [serviceCategoryId]
        );
        if (existingCategory.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Category not found" });
        }

        // 2️⃣ Update category name if provided
        if (newCategoryName) {
            await connection.query(
                `UPDATE service_categories
                 SET serviceCategory = ?
                 WHERE service_categories_id = ?`,
                [newCategoryName.trim(), serviceCategoryId]
            );
        }

        // 3️⃣ Replace subcategories with new ones
        if (Array.isArray(subCategories)) {
            // First, delete old subcategories for this category
            await connection.query(
                `DELETE FROM service_subcategoriestype WHERE service_categories_id = ?`,
                [serviceCategoryId]
            );

            // Then, insert new ones
            for (const subCat of subCategories) {
                await connection.query(
                    `INSERT INTO service_subcategoriestype (subCategories, service_categories_id)
                     VALUES (?, ?)`,
                    [subCat.trim(), serviceCategoryId]
                );
            }
        }

        await connection.commit();
        res.status(200).json({ message: "Category and subcategories updated successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Category update failed:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    } finally {
        connection.release();
    }
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { serviceCategoryId } = req.body;

    if (!serviceCategoryId) {
        return res.status(400).json({ message: "Category ID is required" });
    }

    try {
        const [existingCategory] = await db.query(serviceDeleteQueries.CheckCategoryById, [serviceCategoryId]);
        if (existingCategory.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        const [linkedServices] = await db.query(serviceDeleteQueries.CheckServicesUnderCategory, [serviceCategoryId])
        if (linkedServices.length > 0) {
            return res.status(400).json({ message: "Cannot delete category with linked services" });
        }
        await db.query(serviceDeleteQueries.deleteCategory, [serviceCategoryId])

        res.status(200).json({ message: "Category Delete successfully" });
    } catch (err) {
        console.error("Category deletion failed:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
})

const editServiceCity = asyncHandler(async (req, res) => {
    const { service_city_id, newCityName } = req.body;

    if (!service_city_id || !newCityName || newCityName.trim() === '') {
        return res.status(400).json({ message: "City ID and new name are required" });
    }
    try {
        const [existingCity] = await db.query(servicePutQueries.checkCityById, [service_city_id])
        if (existingCity.length === 0) {
            return res.status(404).json({ message: "City not found" });
        }

        await db.query(servicePutQueries.updateCity, [newCityName.trim(), service_city_id])
        res.status(200).json({ message: "City updated successfully" });
    } catch (err) {
        console.error("City update failed:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

const deleteServiceCity = asyncHandler(async (req, res) => {
    const { service_city_id } = req.params;

    if (!service_city_id) {
        return res.json(400).json({ message: "City ID is required" })
    }
    try {
        const [existingCity] = await db.query(serviceDeleteQueries.checkCityById, [service_city_id]);
        if (existingCity.length === 0) {
            return res.status(404).json({ message: "City not found" });
        }
        await db.query(serviceDeleteQueries.deleteCity, [service_city_id]);
        res.status(200).json({ message: "City deleted successfully" });
    } catch (err) {
        console.error("City deletion failed:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

module.exports = {
    addService,
    getcity,
    addServiceCity,
    addServiceType,
    getService,
    addCategory,
    getServiceCategories,
    editService,
    deleteService,
    editCategory,
    deleteCategory,
    editServiceCity,
    deleteServiceCity,
    getAdminService,
    getServiceTypeById,
    addServiceFilter,
    getServiceFilters,
    updateServiceFilter,
    deleteServiceFilter,
    getAdminServicesWithfilter
}
