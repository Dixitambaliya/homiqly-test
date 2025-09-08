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
    const { categoryName, subCategories = [] } = req.body; // subCategories should be an array

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

        // Insert subcategories if provided
        if (Array.isArray(subCategories) && subCategories.length > 0) {
            const subcategoryValues = subCategories.map((sub) => [sub.trim(), serviceCategoryId]);
            await connection.query(
                `INSERT INTO service_subcategoriestype (subCategories, service_categories_id) VALUES ?`,
                [subcategoryValues]
            );
        }

        // Commit transaction
        await connection.commit();

        // Send FCM notification to vendors
        const [rows] = await connection.query(
            "SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL"
        );

        const tokens = rows.map((row) => row.fcmToken).filter(Boolean);
        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "New service Available!",
                    body: `Explore services under the new category: ${categoryName}`,
                },
                tokens,
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("FCM Notification sent:", response.successCount, "successes");
        }

        res.status(201).json({
            message: "Category and subcategories added successfully",
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
    let { serviceName, categoryName, serviceDescription, subCategories = [] } = req.body;

    if (!serviceName) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const serviceImage = req.uploadedFiles?.serviceImage?.[0]?.url || null;

    if (!serviceImage) {
        return res.status(400).json({ message: "Service image is required" });
    }

    // ✅ Convert string -> array if sub_categories is JSON string like '["man","female"]'
    if (typeof subCategories === "string") {
        try {
            subCategories = JSON.parse(sub_categories);
        } catch (e) {
            console.error("Invalid sub_categories format:", subCategories);
            subCategories = [];
        }
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if service already exists
        const [existingServices] = await connection.query(
            servicePostQueries.CheckExistingServices,
            [serviceName]
        );
        if (existingServices.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Service already exists" });
        }

        // Check if category exists
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

        // Insert the service
        const [insertResult] = await connection.query(
            servicePostQueries.insertService,
            [service_categories_id, serviceName, serviceDescription, serviceImage, slug]
        );

        const service_id = insertResult.insertId;

        // ✅ Insert sub_categories
        if (Array.isArray(subCategories) && subCategories.length > 0) {
            for (const subCat of subCategories) {
                await connection.query(
                    `INSERT INTO service_subcategories (subCategories, service_categories_id) VALUES (?, ?)`,
                    [subCat.trim(), service_categories_id]
                );
            }
        }

        console.log("Subcategories received:", subCategories);

        // FCM notifications
        const [rows] = await connection.query(
            "SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL"
        );
        const tokens = rows.map((row) => row.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "New Service Available!",
                    body: `${serviceName} has been added under ${categoryName}`,
                },
                tokens,
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("FCM Notification sent:", response.successCount, "successes");
        }

        await connection.commit();
        res.status(201).json({ message: "Service and subcategories added successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Service addition failed:", err);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        connection.release();
    }
});


const addSubCategory = asyncHandler(async (req, res) => {
    const { serviceCategoryId, subCategories } = req.body;

    if (!serviceCategoryId || !subCategories) {
        return res.status(400).json({ message: "serviceCategoryId and subCategories are required" });
    }

    // Check if category exists
    const [category] = await db.query(
        `SELECT service_categories_id FROM service_categories WHERE service_categories_id = ?`,
        [serviceCategoryId]
    );
    if (category.length === 0) {
        return res.status(404).json({ message: "Category not found" });
    }

    // Prevent duplicate
    const [existing] = await db.query(
        `SELECT 1 FROM service_subcategoriestype WHERE service_categories_id = ? AND subCategories = ?`,
        [serviceCategoryId, subCategories.trim()]
    );
    if (existing.length > 0) {
        return res.status(409).json({ message: "Subcategory already exists under this category" });
    }

    const [result] = await db.query(
        `INSERT INTO service_subcategoriestype (subCategories, service_categories_id) VALUES (?, ?)`,
        [subCategories.trim(), serviceCategoryId]
    );

    res.status(201).json({
        message: "Subcategory created successfully",
        subcategory_id: result.insertId
    });
});



const getSubCategories = asyncHandler(async (req, res) => {
    try {
        // Fetch all subcategories
        const [subCategories] = await db.query(
            `SELECT subCategories, service_categories_id FROM service_subcategories`
        );

        res.status(200).json({
            subCategories
        });
    } catch (err) {
        console.error("Error fetching all subcategories:", err);
        res.status(500).json({ error: "Internal server error" });
    }
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
    const { service_id, subtype_id = null, subtypeName = null, serviceTypeName } = req.body;
    const serviceTypeMedia = req.uploadedFiles?.serviceTypeMedia?.[0]?.url || null;
    const subtypeMedia = req.uploadedFiles?.subtypeMedia?.[0]?.url || null;

    if (!service_id || !serviceTypeName) {
        return res.status(400).json({ message: "service_id and serviceTypeName are required." });
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
        `SELECT 1 FROM service_subtypes WHERE service_id = ? AND (subtype_id <=> ?) AND subtypeName = ?`,
        [service_id, finalSubtypeId, serviceTypeName.trim()]
    );
    if (existingType.length > 0) {
        return res.status(409).json({ message: "Service type already exists under this service/subtype." });
    }

    // Insert new service type
    const [result] = await db.query(
        `INSERT INTO service_type (service_id, serviceTypeName, serviceTypeMedia)
         VALUES (?, ?, ?)`,
        [service_id, serviceTypeName.trim(), serviceTypeMedia]
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
        // Fetch all services with category
        const [rows] = await db.query(serviceGetQueries.getAllServicesWithCategory);

        const grouped = {};

        rows.forEach(row => {
            const category = row.categoryName;
            if (!grouped[category]) {
                grouped[category] = {
                    categoryName: category,
                    services: []
                };
            }

            // Only add service if it exists
            if (row.serviceId) {
                grouped[category].services.push({
                    serviceId: row.serviceId,
                    serviceCategoryId: row.serviceCategoryId,
                    title: row.serviceName,
                    description: row.serviceDescription,
                    serviceImage: row.serviceImage,
                    slug: row.slug
                });
            }
        });

        const result = Object.values(grouped);

        res.status(200).json({ services: result });
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
            serviceCategory: row.serviceCategory
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
                    subcategoryId: row.subcategory_type_id,
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
    const { serviceId, serviceName, categoryName, serviceDescription } = req.body;
    const serviceImage = req.file?.path; // optional

    if (!serviceId || !serviceName || !categoryName) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // 1. Check if service exists
        const [existingService] = await db.query(servicePutQueries.CheckServiceById, [serviceId]);
        if (existingService.length === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        // 2. Check if category exists
        const [existingCategory] = await db.query(servicePutQueries.CheckExistingCategory, [categoryName]);
        if (existingCategory.length === 0) {
            return res.status(400).json({ message: "Category does not exist" });
        }

        const service_categories_id = existingCategory[0].service_categories_id;

        // 3. Prepare dynamic update query depending on image presence
        const query = serviceImage
            ? servicePutQueries.updateServiceWithImage
            : servicePutQueries.updateServiceWithoutImage;

        const params = serviceImage
            ? [service_categories_id, serviceName, serviceDescription, serviceImage, serviceId]
            : [service_categories_id, serviceName, serviceDescription, serviceId];

        // 4. Update service
        await db.query(query, params);

        res.status(200).json({ message: "Service updated successfully" });
    } catch (err) {
        console.error("Service update failed:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
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
    const { serviceCategoryId, newCategoryName } = req.body;

    try {
        // Check if the category exists
        const [existingCategory] = await db.query(servicePutQueries.CheckCategoryById, [serviceCategoryId]);
        if (existingCategory.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Update category
        await db.query(servicePutQueries.updateCategory, [newCategoryName, serviceCategoryId]);

        res.status(200).json({ message: "Category updated successfully" });
    } catch (err) {
        console.error("Category update failed:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
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
    addSubCategory,
    getSubCategories
}
