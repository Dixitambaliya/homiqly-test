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

            let service = grouped[category].services.find(s => s.serviceId === row.serviceId);

            if (!service && row.serviceId) {
                service = {
                    serviceId: row.serviceId,
                    serviceCategoryId: row.serviceCategoryId,
                    service_type_id: row.service_type_id,
                    title: row.serviceName,
                    description: row.serviceDescription,
                    serviceImage: row.serviceImage,
                    serviceFilter: row.serviceFilter,
                    slug: row.slug
                };
                grouped[category].services.push(service);
            }
        });

        // ✅ At this point, only services with at least one valid package exist
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
                s.service_id
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

                CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                        'package_id', p.package_id,
                        'description', p.description
                    )
                ), ']') AS packages

            FROM service_type st
            INNER JOIN packages p ON p.service_type_id = st.service_type_id

            WHERE st.service_type_id = ?
            GROUP BY st.service_type_id
        `, [service_type_id]);

        // If no rows found, don't return empty result
        if (!rows.length) {
            return res.status(404).json({ message: "No vendor-registered packages found for this service type." });
        }

        const result = rows.map(row => ({
            service_type_id: row.service_type_id,
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

// const getVendorPackagesByServiceTypeId = asyncHandler(async (req, res) => {
//     const { service_type_id } = req.params;

//     if (!service_type_id) {
//         return res.status(400).json({ message: "Service Type ID is required" });
//     }

//     try {
//         const [rows] = await db.query(`
//             SELECT
//                 p.package_id,
//                 p.service_type_id,

//                 -- Ratings
//                 IFNULL((SELECT ROUND(AVG(r.rating), 1) FROM ratings r WHERE r.package_id = p.package_id), 0) AS averageRating,
//                 IFNULL((SELECT COUNT(r.rating_id) FROM ratings r WHERE r.package_id = p.package_id), 0) AS totalReviews,

//                 -- Sub-packages & preferences
//                 pi.item_id AS sub_package_id,
//                 pi.itemName AS item_name,
//                 pi.description AS sub_description,
//                 pi.price AS sub_price,
//                 pi.timeRequired AS sub_time_required,
//                 pi.itemMedia AS item_media,

//                 bp.preference_id,
//                 bp.preferenceValue,
//                 bp.preferencePrice,
//                 bp.preferenceGroup,

//                 -- Addons
//                 pa.addon_id,
//                 pa.addonName AS addon_name,
//                 pa.addonDescription AS addon_description,
//                 pa.addonPrice AS addon_price,
//                 pa.addonTime AS addon_time_required,
//                 pa.addonMedia AS addon_media,

//                 -- Consent Forms
//                 pcf.consent_id,
//                 pcf.question AS consent_question,
//                 pcf.is_required

//             FROM packages p
//             LEFT JOIN package_items pi ON pi.package_id = p.package_id
//             LEFT JOIN booking_preferences bp ON bp.package_item_id = pi.item_id
//             LEFT JOIN package_addons pa ON pa.package_item_id = pi.item_id
//             LEFT JOIN package_consent_forms pcf ON pcf.package_id = p.package_id
//             WHERE p.service_type_id = ?
//             ORDER BY p.package_id, pi.item_id, bp.preferenceGroup
//         `, [service_type_id]);

//         const packagesMap = new Map();

//         for (const row of rows) {
//             if (!packagesMap.has(row.package_id)) {
//                 packagesMap.set(row.package_id, {
//                     package_id: row.package_id,
//                     service_type_id: row.service_type_id,
//                     averageRating: row.averageRating,
//                     totalReviews: row.totalReviews,
//                     sub_packages: new Map(),
//                     consentForm: []
//                 });
//             }
//             const pkg = packagesMap.get(row.package_id);

//             // Sub-packages
//             if (row.sub_package_id) {
//                 if (!pkg.sub_packages.has(row.sub_package_id)) {
//                     pkg.sub_packages.set(row.sub_package_id, {
//                         sub_package_id: row.sub_package_id,
//                         item_name: row.item_name,
//                         description: row.sub_description,
//                         price: row.sub_price,
//                         time_required: row.sub_time_required,
//                         item_media: row.item_media,
//                         addons: []
//                     });
//                 }
//                 const sp = pkg.sub_packages.get(row.sub_package_id);

//                 // Preferences grouped as preferences0, preferences1, ...
//                 if (row.preference_id != null) {
//                     const prefKey = `preferences${row.preferenceGroup || 0}`;
//                     if (!sp[prefKey]) sp[prefKey] = [];
//                     if (!sp[prefKey].some(p => p.preference_id === row.preference_id)) {
//                         sp[prefKey].push({
//                             preference_id: row.preference_id,
//                             preference_value: row.preferenceValue,
//                             preference_price: row.preferencePrice
//                         });
//                     }
//                 }

//                 // Addons
//                 if (row.addon_id && !sp.addons.some(a => a.addon_id === row.addon_id)) {
//                     sp.addons.push({
//                         addon_id: row.addon_id,
//                         addon_name: row.addon_name,
//                         description: row.addon_description,
//                         price: row.addon_price,
//                         time_required: row.addon_time_required,
//                         addon_media: row.addon_media
//                     });
//                 }
//             }

//             // Consent forms
//             if (row.consent_id && !pkg.consentForm.some(c => c.consent_id === row.consent_id)) {
//                 pkg.consentForm.push({
//                     consent_id: row.consent_id,
//                     question: row.consent_question,
//                     is_required: row.is_required
//                 });
//             }
//         }

//         const data = Array.from(packagesMap.values()).map(p => ({
//             ...p,
//             sub_packages: Array.from(p.sub_packages.values())
//         }));

//         res.status(200).json({
//             message: "Packages fetched successfully by service type ID",
//             packages: data
//         });

//     } catch (err) {
//         console.error("Error fetching vendor packages:", err);
//         res.status(500).json({ error: "Database error", details: err.message });
//     }
// });

const getPackagesByServiceType = asyncHandler(async (req, res) => {
    const { service_type_id } = req.params;

    try {
        const [packages] = await db.query(
            `SELECT 
                p.package_id,
                p.packageName,
                p.packageMedia
             FROM packages p
             WHERE p.service_type_id = ?`,
            [service_type_id]
        );

        if (!packages.length) {
            return res.status(404).json({ message: "No packages found for this service type" });
        }

        const formatted = packages.map(pkg => {
            if (!pkg.packageName && !pkg.packageMedia) {
                // 🚨 Only return package_id if both are null
                return { package_id: pkg.package_id };
            }
            return {
                package_id: pkg.package_id,
                packageName: pkg.packageName,
                packageMedia: pkg.packageMedia,
            };
        });

        res.status(200).json({
            message: "Packages fetched successfully",
            packages: formatted,
        });
    } catch (err) {
        console.error("Error fetching packages with details:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getPackageDetailsById = asyncHandler(async (req, res) => {
    const { package_id } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT 
                p.package_id,
                p.packageName,
                p.packageMedia,
                pi.item_id AS sub_package_id,
                pi.itemName AS item_name,
                pi.description AS sub_description,
                pi.price AS sub_price,
                pi.timeRequired AS sub_time_required,
                pi.itemMedia AS item_media,
                pa.addon_id,
                pa.addonName AS addon_name,
                pa.addonDescription AS addon_description,
                pa.addonPrice AS addon_price,
                pa.addonTime AS time_required,
                bp.preference_id,
                bp.preferenceValue,
                bp.preferencePrice,
                bp.preferenceGroup,
                bp.is_required AS preference_is_required,
                pcf.consent_id,
                pcf.package_item_id AS consent_package_item_id,
                pcf.question AS consent_question,
                pcf.is_required AS consent_is_required
            FROM packages p
            LEFT JOIN package_items pi ON pi.package_id = p.package_id
            LEFT JOIN package_addons pa ON pa.package_item_id = pi.item_id
            LEFT JOIN booking_preferences bp ON bp.package_item_id = pi.item_id
            LEFT JOIN package_consent_forms pcf ON pcf.package_item_id = pi.item_id
            WHERE p.package_id = ?
            ORDER BY pi.item_id, bp.preferenceGroup`,
            [package_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Package not found" });
        }

        const pkg = {
            package_id: rows[0].package_id,
            packageName: rows[0].packageName || null,
            packageMedia: rows[0].packageMedia || null,
            sub_packages: []
        };

        const subPackageMap = new Map();

        for (const row of rows) {
            if (row.sub_package_id) {
                if (!subPackageMap.has(row.sub_package_id)) {
                    subPackageMap.set(row.sub_package_id, {
                        sub_package_id: row.sub_package_id,
                        item_name: row.item_name,
                        description: row.sub_description,
                        item_media: row.item_media,
                        price: row.sub_price,
                        time_required: row.sub_time_required,
                        addons: [],
                        preferences: {},   // group-level
                        consentForm: []
                    });
                }

                const sp = subPackageMap.get(row.sub_package_id);

                // Addons
                if (row.addon_id && !sp.addons.some(a => a.addon_id === row.addon_id)) {
                    sp.addons.push({
                        addon_id: row.addon_id,
                        addon_name: row.addon_name,
                        description: row.addon_description,
                        price: row.addon_price,
                        time_required: row.time_required
                    });
                }

                // Preferences grouped by groupName with group-level is_required
                if (row.preference_id != null) {
                    const groupName = row.preferenceGroup || "Default";

                    if (!sp.preferences[groupName]) {
                        // Initialize group with is_required taken from first row
                        sp.preferences[groupName] = {
                            is_required: row.preference_is_required,
                            selections: []
                        };
                    }

                    if (!sp.preferences[groupName].selections.some(p => p.preference_id === row.preference_id)) {
                        sp.preferences[groupName].selections.push({
                            preference_id: row.preference_id,
                            preference_value: row.preferenceValue,
                            preference_price: row.preferencePrice
                        });
                    }
                }

                // Consent forms
                if (row.consent_id && !sp.consentForm.some(c => c.consent_id === row.consent_id)) {
                    sp.consentForm.push({
                        consent_id: row.consent_id,
                        question: row.consent_question,
                        is_required: row.consent_is_required
                    });
                }
            }
        }

        pkg.sub_packages = Array.from(subPackageMap.values());

        res.status(200).json({ message: "Package details fetched successfully", package: pkg });
    } catch (err) {
        console.error("Error fetching package details:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
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
    // getVendorPackagesByServiceTypeId,
    getPackagesByServiceType,
    getPackageDetailsById
}
