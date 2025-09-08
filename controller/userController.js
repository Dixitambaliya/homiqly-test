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
    const service_id = req.params.service_id;

    try {
        const [rows] = await db.query(userGetQueries.getServiceNames, [service_id]);

        const parsedRows = rows.map((row) => {
            let parsedPackages = [];
            try {
                parsedPackages = JSON.parse(row.packages || '[]').map(pkg => ({
                    ...pkg,
                    sub_packages: typeof pkg.sub_packages === 'string'
                        ? JSON.parse(pkg.sub_packages || '[]')
                        : (pkg.sub_packages || [])
                }));
            } catch (e) {
                console.warn(`Failed to parse packages for service_type_id ${row.service_type_id}`, e.message);
            }

            return {
                service_type_id: row.service_type_id,
                serviceName: row.serviceName,
                serviceTypeName: row.serviceTypeName,
                serviceTypeMedia: row.serviceTypeMedia,
                serviceDescription: row.serviceDescription,
                is_approved: row.is_approved,
                created_at: row.created_at,
                average_rating: row.average_rating,
                total_reviews: row.total_reviews,
                packages: parsedPackages
            };
        });

        res.status(200).json({
            message: "Admin service types fetched successfully",
            rows: parsedRows
        });

    } catch (err) {
        console.error("Error fetching service types:", err);
        res.status(500).json({ error: "Database error", details: err.message });
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

            // find or add service
            let service = grouped[category].services.find(s => s.serviceId === row.serviceId);

            if (!service && row.serviceId) {
                service = {
                    serviceId: row.serviceId,
                    serviceCategoryId: row.serviceCategoryId,
                    subcategoryId: row.subcategoryId || null,
                    subcategoryName: row.subcategoryName || null,
                    title: row.serviceName,
                    description: row.serviceDescription,
                    serviceImage: row.serviceImage,
                    slug: row.slug,
                    serviceTypes: []
                };
                grouped[category].services.push(service);
            }

            // push serviceType if available
            if (row.service_type_id && service) {
                service.serviceTypes.push({
                    subType: row.subTypeName,
                    service_type_id: row.service_type_id,
                    serviceTypeName: row.serviceTypeName,
                    serviceTypeMedia: row.serviceTypeMedia
                });
            }
        });

        // 🔹 Remove services without serviceTypes
        Object.values(grouped).forEach(category => {
            category.services = category.services.filter(service => service.serviceTypes.length > 0);
        });

        // 🔹 Remove categories without any services
        const result = Object.values(grouped).filter(category => category.services.length > 0);

        res.status(200).json({ services: result });
    } catch (err) {
        console.error("Error fetching services:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


const getServiceTypesByServiceId = asyncHandler(async (req, res) => {
    const service_id = req.params.service_id

    if (!service_id) {
        return res.status(400).json({ message: "Service ID is required." });
    }

    try {
        const [rows] = await db.query(`
            SELECT
                s.service_type_id,
                s.service_id,
                s.serviceTypeName,
                s.serviceTypeMedia
                FROM service_type s
            WHERE s.service_id = ?
            ORDER BY service_type_id DESC
        `, [service_id]);

        res.status(200).json({
            message: "Service types fetched successfully",
            rows
        });

    } catch (err) {
        console.error("Error fetching service types by service_id:", err);
        res.status(500).json({
            error: "Database error",
            details: err.message
        });
    }
});

const getServicestypes = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(userGetQueries.getServiceNames);

        const cleanedRows = rows.map(row => {
            const cleanedRow = {};
            for (const key in row) {
                if (row[key] !== null) {
                    cleanedRow[key] = row[key];
                }
            }
            return cleanedRow;
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
        const results = await db.query(userGetQueries.getUsersData, [user_id]);

        if (!results || results.length === 0) {
            return res.status(404).json({ message: "User data not found" });
        }

        // Just take the first result row
        const userData = results[0];

        // Replace null values with empty strings
        Object.keys(userData).forEach(key => {
            if (userData[key] === null) {
                userData[key] = "";
            }
        });

        res.status(200).json({
            message: "User data fetched successfully",
            data: userData // single object, not array
        });

    } catch (err) {
        console.error("Error fetching user data:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

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
    const { firstName, lastName, phone, parkingInstruction, address, state, postalcode } = req.body;

    try {
        const [userCheck] = await db.query(
            `SELECT user_id FROM users WHERE user_id = ?`,
            [user_id]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const [userDataInsert] = await db.query(
            `UPDATE users SET firstName = ?, lastName = ? , parkingInstruction = ?,  phone = ?, address = ?, state = ?, postalcode = ? WHERE user_id = ?`,
            [firstName, lastName, parkingInstruction, phone, address, state, postalcode, user_id]
        );

        res.status(200).json({
            message: "User data updated successfully"
        });
    } catch (err) {
        console.error("Error updating user data:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getPackagesByServiceTypeId = asyncHandler(async (req, res) => {
    const { service_type_id } = req.params;

    if (!service_type_id) {
        return res.status(400).json({ message: "Service Type ID is required." });
    }

    try {
        const [rows] = await db.query(`
            SELECT
                st.service_type_id,
                st.serviceTypeName,
                st.serviceTypeMedia,

                CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                        'package_id', p.package_id,
                        'title', p.packageName,
                        'description', p.description,
                        'price', p.totalPrice,
                        'price'
                        'time_required', p.totalTime,
                        'package_media', p.packageMedia,
                        'vendor_id', vp.vendor_id
                    )
                ), ']') AS packages

            FROM service_type st
            INNER JOIN packages p ON p.service_type_id = st.service_type_id
            INNER JOIN vendor_packages vp ON vp.package_id = p.package_id

            WHERE st.service_type_id = ?
            GROUP BY st.service_type_id
        `, [service_type_id]);

        // If no rows found, don't return empty result
        if (!rows.length) {
            return res.status(404).json({ message: "No vendor-registered packages found for this service type." });
        }

        const result = rows.map(row => ({
            service_type_id: row.service_type_id,
            serviceTypeName: row.serviceTypeName,
            serviceTypeMedia: row.serviceTypeMedia,
            packages: JSON.parse(row.packages || '[]')
        }));

        res.status(200).json({
            message: "Packages by service type fetched successfully",
            result
        });

    } catch (err) {
        console.error("Error fetching packages by service_type_id:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getPackagesDetails = asyncHandler(async (req, res) => {
    const { service_type_id } = req.params;

    if (!service_type_id) {
        return res.status(400).json({ message: "Service Type ID is required" });
    }

    try {
        const [rows] = await db.query(`
            SELECT
                p.package_id,
                p.packageName,
                p.description,
                p.totalPrice,
                p.totalTime,
                p.packageMedia,

                IFNULL((
                    SELECT ROUND(AVG(r.rating), 1)
                    FROM ratings r
                    WHERE r.package_id = p.package_id
                ), 0) AS averageRating,

                IFNULL((
                    SELECT COUNT(r.rating_id)
                    FROM ratings r
                    WHERE r.package_id = p.package_id
                ), 0) AS totalReviews,

                COALESCE((
                    SELECT CONCAT('[', GROUP_CONCAT(
                        JSON_OBJECT(
                            'sub_package_id', pi.item_id,
                            'title', pi.itemName,
                            'description', pi.description,
                            'price', pi.price,
                            'time_required', pi.timeRequired,
                            'item_media', pi.itemMedia
                        )
                    ), ']')
                    FROM package_items pi
                    WHERE pi.package_id = p.package_id
                ), '[]') AS sub_packages,

                COALESCE((
                    SELECT CONCAT('[', GROUP_CONCAT(
                        JSON_OBJECT(
                            'preference_id', bp.preference_id,
                            'preference_value', bp.preferenceValue
                        )
                    ), ']')
                    FROM booking_preferences bp
                    WHERE bp.package_id = p.package_id
                ), '[]') AS preferences

            FROM packages p
            WHERE p.service_type_id = ?
            ORDER BY p.package_id DESC
        `, [service_type_id]);

        const data = rows.map(row => ({
            package_id: row.package_id,
            packageName: row.packageName,
            description: row.description,
            totalPrice: row.totalPrice,
            totalTime: row.totalTime,
            packageMedia: row.packageMedia,
            averageRating: row.averageRating,
            totalReviews: row.totalReviews,
            sub_packages: JSON.parse(row.sub_packages || '[]'),
            preferences: JSON.parse(row.preferences || '[]')
        }));

        res.status(200).json({
            message: "Packages fetched successfully",
            packages: data
        });
    } catch (err) {
        console.error("Error fetching packages by service_type_id:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const deleteBooking = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { booking_id } = req.params;

    if (!booking_id) {
        return res.status(400).json({ message: "Booking ID is required" });
    }

    try {
        // ✅ Check if booking belongs to user
        const [bookingCheck] = await db.query(
            `SELECT * FROM service_booking WHERE booking_id = ? AND user_id = ?`,
            [booking_id, user_id]
        );

        if (bookingCheck.length === 0) {
            return res.status(404).json({ message: "Booking not found or does not belong to user" });
        }

        // ✅ Delete booking (child tables auto-deleted via ON DELETE CASCADE)
        await db.query(`DELETE FROM service_booking WHERE booking_id = ?`, [booking_id]);

        res.status(200).json({ message: "Booking deleted successfully", booking_id });
    } catch (error) {
        console.error("Delete booking error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorPackagesByServiceTypeId = asyncHandler(async (req, res) => {
    const { service_type_id } = req.params;

    if (!service_type_id) {
        return res.status(400).json({ message: "Service Type ID is required" });
    }

    try {
        const [rows] = await db.query(
            `
            SELECT
                p.package_id,
                p.packageName,
                p.description,
                p.totalPrice,
                p.totalTime,
                p.subCategoryName,
                p.packageMedia,

                -- Ratings
                IFNULL((
                  SELECT ROUND(AVG(r.rating), 1)
                  FROM ratings r
                  WHERE r.package_id = p.package_id
                ), 0) AS averageRating,

                IFNULL((
                  SELECT COUNT(r.rating_id)
                  FROM ratings r
                  WHERE r.package_id = p.package_id
                ), 0) AS totalReviews,

                -- Sub-packages
                COALESCE((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'sub_package_id', pi.item_id,
                      'title', pi.itemName,
                      'description', pi.description,
                      'price', pi.price,
                      'time_required', pi.timeRequired,
                      'item_media', pi.itemMedia
                    )
                  ), ']')
                  FROM package_items pi
                  WHERE pi.package_id = p.package_id
                ), '[]') AS sub_packages,

                -- Addons
                COALESCE((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'addon_id', pa.addon_id,
                      'addon_name', pa.addonName,
                      'addon_description', pa.addonDescription,
                      'price', pa.addonPrice,
                      'addon_time', pa.addonTime,
                      'addon_media', pa.addonMedia
                    )
                  ), ']')
                  FROM package_addons pa
                  WHERE pa.package_id = p.package_id
                ), '[]') AS addons,

                -- Preferences
                COALESCE((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'preference_id', bp.preference_id,
                      'preference_value', bp.preferenceValue,
                      'preference_price', bp.preferencePrice
                    )
                  ), ']')
                  FROM booking_preferences bp
                  WHERE bp.package_id = p.package_id
                ), '[]') AS preferences

            FROM packages p
            WHERE p.service_type_id = ?
            ORDER BY p.package_id DESC
            `,
            [service_type_id]
        );

        const data = rows.map((row) => ({
            package_id: row.package_id,
            packageName: row.packageName,
            description: row.description,
            totalPrice: row.totalPrice,
            totalTime: row.totalTime,
            packageMedia: row.packageMedia,
            averageRating: row.averageRating,
            totalReviews: row.totalReviews,
            sub_packages: JSON.parse(row.sub_packages || "[]"),
            addons: JSON.parse(row.addons || "[]"),
            preferences: JSON.parse(row.preferences || "[]"),
        }));

        res.status(200).json({
            message: "Packages fetched successfully by service type ID",
            packages: data,
        });
    } catch (err) {
        console.error("Error fetching packages by service type ID:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});




module.exports = {
    getServiceCategories,
    getServiceByCategory,
    getServiceNames,
    getService,
    getServicestypes,
    getServiceTypesByServiceId,
    getUserData,
    updateUserData,
    addUserData,
    getPackagesByServiceTypeId,
    getPackagesDetails,
    deleteBooking,
    getVendorPackagesByServiceTypeId
}
