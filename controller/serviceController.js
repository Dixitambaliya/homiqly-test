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

const addService = asyncHandler(async (req, res) => {
    const { serviceName, categoryName, serviceDescription } = req.body;

    if (!serviceName) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const serviceImage = req.uploadedFiles?.serviceImage?.[0]?.url || null;

    if (!serviceImage) {
        return res.status(400).json({ message: "Service image is required" });
    }

    try {
        // Check if service already exists
        const [existingServices] = await db.query(servicePostQueries.CheckExistingServices, [serviceName]);
        if (existingServices.length > 0) {
            return res.status(400).json({ message: "Service already exists" });
        }

        // Check if category exists
        const [existingCategory] = await db.query(servicePostQueries.CheckExistingCategory, [categoryName]);
        if (existingCategory.length === 0) {
            return res.status(400).json({ message: "Category does not exist. Please add the category first." });
        }

        const service_categories_id = existingCategory[0].service_categories_id;
        const slug = generateSlug(serviceName);
        // Insert the service
        await db.query(servicePostQueries.insertService, [
            service_categories_id,
            serviceName,
            serviceDescription,
            serviceImage,
            slug
        ]);

        const [rows] = await db.query("SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL")
        console.log("tokenResult", rows);

        const tokens = rows.map((row) => row.fcmToken).filter(Boolean)
        console.log("tokens", tokens);

        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "New service Available!",
                    body: `${serviceName} has been added under ${categoryName}`
                },
                tokens,
            }
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("FCM Notification sent:", response.successCount, "successes");
        }

        res.status(201).json({ message: "Service added successfully" });
    } catch (err) {
        console.error("Service addition failed:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const addCategory = asyncHandler(async (req, res) => {
    const { categoryName } = req.body;

    try {
        const [existingCategory] = await db.query(servicePostQueries.CheckExistingCategory, [categoryName]);
        if (existingCategory.length > 0) {
            return res.status(400).json({ message: "Category already exists" });
        }

        await db.query(servicePostQueries.InsertCategory, [categoryName]);

        const [rows] = await db.query("SELECT fcmToken FROM vendors WHERE fcmToken IS NOT NULL")
        console.log("tokenResult", rows);

        const tokens = rows.map((row) => row.fcmToken).filter(Boolean)
        console.log("tokens", tokens);

        if (tokens.length > 0) {
            const message = {
                notification: {
                    title: "New service Available!",
                    body: `Explore services under the new category: ${categoryName}`,
                },
                tokens,
            }
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log("FCM Notification sent:", response.successCount, "successes");
        }
        res.status(201).json({ message: "Category added successfully" });
    } catch (err) {
        console.error("Category addition failed:", err);
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
    const { serviceName, serviceTypeName } = req.body;
    const { vendor_id } = req.user.vendor_id;

    if (!serviceName || !serviceTypeName || serviceTypeName.trim() === "") {
        return res.status(400).json({ message: "Service name and type are required" });
    }

    try {
        // Step 1: Get service_id by serviceName
        const [serviceRows] = await db.query(servicePostQueries.getServiceIdByName, [serviceName.trim()]);
        if (serviceRows.length === 0) {
            return res.status(400).json({ message: "Service name not found" });
        }

        const serviceId = serviceRows[0].service_id;

        // Step 2: Check if the type already exists for this service
        const [existing] = await db.query(servicePostQueries.checkServiceType, [serviceId, serviceTypeName.trim()]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Service type already exists for this service" });
        }

        // Step 3: Insert new service type
        await db.query(servicePostQueries.insertServiceType, [serviceId, serviceTypeName.trim()]);

        res.status(201).json({ message: "Service type added successfully" });
    } catch (err) {
        console.error("Error adding service type:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getAdminService = asyncHandler(async (req, res) => {
    try {
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
        const [rows] = await db.query(serviceGetQueries.getServiceCategories)

        const categories = rows.map(row => ({
            serviceCategory: row.serviceCategory,
            serviceCategoryId: row.service_categories_id
        }))

        res.status(200).json({
            message: "Service fetched successfully",
            categories
        });
    } catch (err) {
        console.error("Error fetching cities:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

const getcity = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(serviceGetQueries.getCities);

        const city = rows.map(row => ({
            serviceCityId: row.serviceCityId,
            cityName: row.serviceCityName,
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
    const { serviceCityId } = req.body;

    if (!serviceCityId) {
        return res.json(400).json({ message: "City ID is required" })
    }
    try {
        const [existingCity] = await db.query(serviceDeleteQueries.checkCityById, [serviceCityId]);
        if (existingCity.length === 0) {
            return res.status(404).json({ message: "City not found" });
        }
        await db.query(serviceDeleteQueries.deleteCity, [serviceCityId]);
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
    getAdminService
}
