const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const userGetQueries = require("../config/userQueries/userGetQueries")

const getServiceCategories = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(userGetQueries.getServiceCategories)

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
        console.error("Error fetching cities:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getServiceNames = asyncHandler(async (req, res) => {
    const { service_categories_id } = req.params;

    if (!service_categories_id) {
        return res.status(400).json({ message: "Service category ID is required" });
    }

    try {
        const [services] = await db.query(`
            SELECT
                s.service_id,
                s.serviceName,
                s.serviceDescription,
                s.serviceImage,
                s.service_categories_id,
                sc.serviceCategory
            FROM services s
            JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
            WHERE s.service_categories_id = ?
        `, [service_categories_id]);

        return res.status(200).json({
            message: "Admin services fetched successfully by category",
            services
        });
    } catch (err) {
        console.error("Error fetching admin services by category:", err);
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});


const getServiceByCategory = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(userGetQueries.getAllServicesWithCategory);

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

const getServiceTypesByServiceId = asyncHandler(async (req, res) => {
    const service_id = req.params.service_id;

    try {
        const [rows] = await db.query(`
        SELECT
          st.service_type_id,
          st.serviceTypeName,
          st.serviceTypeMedia,
          st.is_approved,
          st.service_id,

          v.vendor_id,
          v.vendorType,

          ind.id AS individual_id,
          ind.name AS individual_name,
          ind.phone AS individual_phone,
          ind.email AS individual_email,

          comp.id AS company_id,
          comp.companyName,
          comp.contactPerson,
          comp.companyEmail,
          comp.companyPhone,

          IFNULL(serviceRatingStats.average_rating, 0) AS service_average_rating,
          IFNULL(serviceRatingStats.total_reviews, 0) AS service_total_reviews,

          COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'package_id', p.package_id,
                'title', p.packageName,
                'package_media', p.packageMedia,
                'description', p.description,
                'price', p.totalPrice,
                'time_required', p.totalTime,
                'average_rating', IFNULL(packageRatingStats.average_rating, 0),
                'total_reviews', IFNULL(packageRatingStats.total_reviews, 0),
                'sub_packages', IFNULL((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'sub_package_id', pi.item_id,
                      'title', pi.itemName,
                      'item_media', pi.itemMedia,
                      'description', pi.description,
                      'price', pi.price,
                      'time_required', pi.timeRequired
                    )
                  ), ']')
                  FROM package_items pi
                  WHERE pi.package_id = p.package_id
                ), '[]')
              )
            ), ']')
            FROM packages p
            LEFT JOIN (
              SELECT package_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS total_reviews
              FROM ratings
              WHERE package_id IS NOT NULL
              GROUP BY package_id
            ) AS packageRatingStats ON p.package_id = packageRatingStats.package_id
            WHERE p.service_type_id = st.service_type_id
          ), '[]') AS packages,

          COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'preference_id', bp.preference_id,
                'preference_value', bp.preferenceValue
              )
            ), ']')
            FROM booking_preferences bp
            JOIN packages p ON p.package_id = bp.package_id
            WHERE p.service_type_id = st.service_type_id
          ), '[]') AS preferences

        FROM service_type st
        LEFT JOIN vendors v ON st.vendor_id = v.vendor_id
        LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
        LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id

        LEFT JOIN (
          SELECT service_type_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS total_reviews
          FROM ratings
          WHERE service_type_id IS NOT NULL AND package_id IS NULL
          GROUP BY service_type_id
        ) AS serviceRatingStats ON st.service_type_id = serviceRatingStats.service_type_id

        WHERE st.service_id = ? AND st.is_approved = 1
        ORDER BY st.service_type_id DESC;
      `, [service_id]);

        const cleanedRows = rows.map(row => {
            let parsedPackages = [];
            let parsedPreferences = [];

            try {
                parsedPackages = JSON.parse(row.packages || '[]').map(pkg => ({
                    ...pkg,
                    sub_packages: typeof pkg.sub_packages === 'string'
                        ? JSON.parse(pkg.sub_packages || '[]')
                        : (pkg.sub_packages || [])
                }));
            } catch (err) {
                console.warn(`⚠️ Failed to parse packages for service_type_id ${row.service_type_id}:`, err.message);
            }

            try {
                parsedPreferences = JSON.parse(row.preferences || '[]');
            } catch (err) {
                console.warn(`Failed to parse preferences for service_type_id ${row.service_type_id}:`, err.message);
            }

            const cleanedRow = Object.fromEntries(
                Object.entries(row).filter(([key, val]) =>
                    val !== null && val !== undefined && !['packages', 'preferences'].includes(key)
                )
            );

            return {
                ...cleanedRow,
                packages: parsedPackages,
                preferences: parsedPreferences
            };
        });

        res.status(200).json({
            message: "Service types fetched successfully",
            rows: cleanedRows
        });

    } catch (err) {
        console.error("Error fetching service types by service_id:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getApprovedServices = asyncHandler(async (req, res) => {

    try {
        const [rows] = await db.query(userGetQueries.getServiceNames);

        const cleanedRows = rows.map(row => {
            // Parse JSON fields
            const packages = JSON.parse(row.packages || '[]');

            const parsedPackages = packages.map(pkg => ({
                ...pkg,
                sub_packages: typeof pkg.sub_packages === 'string'
                    ? JSON.parse(pkg.sub_packages)
                    : pkg.sub_packages
            }));

            // Filter out null fields
            const cleanedRow = {};
            for (const key in row) {
                if (row[key] !== null) {
                    cleanedRow[key] = row[key];
                }
            }

            return {
                ...cleanedRow,
                packages: parsedPackages
            };
        });

        res.status(200).json({
            message: "Service types fetched successfully",
            rows: cleanedRows
        });
    } catch (err) {
        console.error("Error fetching service types:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getUserData = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const results = await db.query(userGetQueries.getUsersData, [user_id])

        if (!results || results.length === 0) {
            return res.status(404).json({ message: "User data not found" });
        }

        res.status(200).json({
            message: "User data fetched successfully",
            data: results[0]
        });

    } catch (err) {
        console.error("Error fetching service types:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
})

const updateUserData = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { firstName, lastName, email, phone } = req.body;

    try {
        // Step 1: Fetch existing user data
        const [existingRows] = await db.query(
            `SELECT firstName, lastName, email, phone, profileImage FROM users WHERE user_id = ?`,
            [user_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const existing = existingRows[0];

        const updatedFirstName = firstName || existing.firstName;
        const updatedLastName = lastName || existing.lastName;
        const updatedEmail = email || existing.email;
        const updatedPhone = phone || existing.phone;
        const updatedProfileImage = req.uploadedFiles?.profileImage?.[0]?.url || existing.profileImage;

        // Step 3: Update the user record
        await db.query(
            `UPDATE users SET profileImage = ?, firstName = ?, lastName = ?, email = ?, phone = ? WHERE user_id = ?`,
            [updatedProfileImage, updatedFirstName, updatedLastName, updatedEmail, updatedPhone, user_id]
        );

        res.status(200).json({
            message: "User data updated successfully"
        });

    } catch (err) {
        console.error("Error updating user data:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const addUserData = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { firstName, lastName, phone, address, state, postalcode } = req.body;

    try {
        const [userCheck] = await db.query(
            `SELECT user_id FROM users WHERE user_id = ?`,
            [user_id]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const [userDataInsert] = await db.query(
            `UPDATE users SET firstName = ?, lastName = ? , phone = ?, address = ?, state = ?, postalcode = ? WHERE user_id = ?`,
            [firstName, lastName, phone, address, state, postalcode, user_id]
        );

        res.status(200).json({
            message: "User data updated successfully"
        });
    } catch (err) {
        console.error("Error updating user data:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

module.exports = {
    getServiceCategories,
    getServiceByCategory,
    getServiceNames,
    getService,
    getApprovedServices,
    getServiceTypesByServiceId,
    getUserData,
    updateUserData,
    addUserData
}
