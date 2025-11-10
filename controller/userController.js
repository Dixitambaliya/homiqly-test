const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const userGetQueries = require("../config/userQueries/userGetQueries")
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const bcrypt = require("bcryptjs")

function normalizePhone(phone) {
    if (!phone) return null;
    try {
        const parsed = parsePhoneNumberFromString(phone);
        if (!parsed) return phone;
        return parsed.nationalNumber; // e.g., +91 9427988352 → "9427988352"
    } catch {
        return phone;
    }
}

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
        // 1️⃣ Fetch all services grouped by category
        const [rows] = await db.query(userGetQueries.getAllServicesWithCategory);

        // 2️⃣ Fetch average rating and review count per service
        const [ratings] = await db.query(`
            SELECT
                s.service_id,
                ROUND(AVG(r.rating), 1) AS avgRating,
                COUNT(r.rating_id) AS reviewCount
            FROM ratings r
            JOIN packages p ON r.package_id = p.package_id
            JOIN service_type st ON p.service_type_id = st.service_type_id
            JOIN services s ON st.service_id = s.service_id
            GROUP BY s.service_id
        `);

        // Convert ratings array to map for fast lookup
        const ratingMap = {};
        ratings.forEach(r => {
            ratingMap[r.service_id] = {
                avgRating: r.avgRating,
                reviewCount: r.reviewCount
            };
        });

        // 3️⃣ Group services by category
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
                    slug: row.slug,
                    avgRating: ratingMap[row.serviceId]?.avgRating || 0,
                    reviewCount: ratingMap[row.serviceId]?.reviewCount || 0
                };
                grouped[category].services.push(service);
            }
        });

        // 4️⃣ Only keep categories that have services
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
            `SELECT firstName, lastName, email, phone, profileImage, is_approved
             FROM users
             WHERE user_id = ?`,
            [user_id]
        );

        if (existingRows.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const existing = existingRows[0];

        // Step 2: Determine if phone can be updated
        let updatedPhone = existing.phone;

        if (existing.is_approved !== 1 && phone) {
            // ✅ Normalize both new and DB phones
            const normalizedInputPhone = normalizePhone(phone);

            // ✅ Fetch all users (for cross-country check)
            const [allUsers] = await db.query("SELECT user_id, phone FROM users");

            const matchedByDigits = allUsers.find(u => {
                const normalizedDbPhone = normalizePhone(u.phone);
                return (
                    normalizedDbPhone &&
                    normalizedInputPhone &&
                    normalizedDbPhone === normalizedInputPhone &&
                    u.user_id !== user_id &&
                    u.phone !== phone
                );
            });

            if (matchedByDigits) {
                return res.status(400).json({
                    message:
                        "This phone number (same digits) is already registered with another country code.",
                    conflict: true,
                });
            }

            // ✅ Check if exact phone already exists
            const [phoneRows] = await db.query(
                `SELECT user_id FROM users WHERE phone = ? AND user_id != ?`,
                [phone, user_id]
            );

            if (phoneRows.length > 0) {
                return res.status(400).json({ message: "Phone number already in use" });
            }

            updatedPhone = phone;
        } else if (existing.is_approved === 1 && phone && phone !== existing.phone) {
            return res.status(403).json({
                message: "Approved users cannot update their phone number",
            });
        }

        const updatedFirstName = firstName || existing.firstName;
        const updatedLastName = lastName || existing.lastName;
        const updatedEmail = email || existing.email;
        const updatedProfileImage =
            req.uploadedFiles?.profileImage?.[0]?.url || existing.profileImage;

        // Step 3: Update user record
        await db.query(
            `UPDATE users
             SET profileImage = ?, firstName = ?, lastName = ?, email = ?, phone = ?
             WHERE user_id = ?`,
            [
                updatedProfileImage,
                updatedFirstName,
                updatedLastName,
                updatedEmail,
                updatedPhone,
                user_id,
            ]
        );

        res.status(200).json({
            message: "User data updated successfully",
            updated: {
                firstName: updatedFirstName,
                lastName: updatedLastName,
                email: updatedEmail,
                phone: updatedPhone,
                profileImage: updatedProfileImage,
            },
        });
    } catch (err) {
        console.error("Error updating user data:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const addUserData = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;

    const {
        firstName,
        lastName,
        phone,
        parkingInstruction,
        address,
        state,
        postalcode,
        flatNumber,
    } = req.body;

    const connection = await db.getConnection(); // 🔹 Get dedicated connection for transaction

    try {
        // Start transaction
        await connection.beginTransaction();

        // 1️⃣ Validate required fields
        if (!firstName || !lastName || !phone || !address || !postalcode) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                message: "All fields are required. Please fill in all user details.",
            });
        }

        // 2️⃣ Check if user exists
        const [userCheck] = await connection.query(
            `SELECT user_id, is_approved FROM users WHERE user_id = ? FOR UPDATE`,
            [user_id] // 🔒 Locks this row to prevent concurrent updates
        );

        if (userCheck.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "User not found" });
        }

        const user = userCheck[0];

        // 3️⃣ Prevent update if not approved
        if (user.is_approved === 0) {
            await connection.rollback();
            connection.release();
            return res.status(403).json({
                message: "Phone not verified. You cannot update data yet.",
            });
        }

        // 4️⃣ Check if phone number already exists
        const [phoneCheck] = await connection.query(
            `SELECT user_id FROM users WHERE phone = ? AND user_id != ?`,
            [phone, user_id]
        );

        if (phoneCheck.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({
                message: "Phone number already exists",
            });
        }

        // 5️⃣ Update user data
        await connection.query(
            `UPDATE users
             SET firstName = ?, lastName = ?, parkingInstruction = ?, phone = ?, address = ?, state = ?, postalcode = ?, flatNumber = ?
             WHERE user_id = ?`,
            [
                firstName,
                lastName,
                parkingInstruction,
                phone,
                address,
                state,
                postalcode,
                flatNumber,
                user_id,
            ]
        );

        // ✅ Commit transaction
        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "User data updated successfully",
        });

    } catch (err) {
        // ❌ Rollback on any error
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (rollbackErr) {
                console.error("Rollback failed:", rollbackErr);
            }
        }

        console.error("Error updating user data:", err);

        if (err.code === "ER_LOCK_WAIT_TIMEOUT") {
            return res.status(500).json({
                error: "Database locked. Please try again in a few seconds.",
                details: err.message,
            });
        }

        res.status(500).json({
            error: "Database error",
            details: err.message,
        });
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
                p.service_type_id,
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
                            'preference_value', bp.preferenceValue,
                            'time_required', bp.timeRequired
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
            service_type_id: row.service_type_id,
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
        // 1️⃣ Fetch package + subpackages + related data
        const [rows] = await db.query(
            `SELECT
                p.package_id,
                p.packageName,
                p.packageMedia,
                p.service_type_id,
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
                bp.timeRequired AS time_required,
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

        // 2️⃣ Fetch average rating per sub_package that has booking data in service_booking_sub_packages
        const [ratingRows] = await db.query(
            `SELECT
                sbsp.sub_package_id,
                ROUND(AVG(r.rating), 1) AS avgRating,
                COUNT(r.rating_id) AS reviewCount
            FROM ratings r
            LEFT JOIN service_booking_sub_packages sbsp ON r.booking_id = sbsp.booking_id
            LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
            WHERE pi.package_id = ?
            GROUP BY sbsp.sub_package_id`,
            [package_id]
        );

        // Map ratings by sub_package_id
        const ratingMap = {};
        ratingRows.forEach(r => {
            ratingMap[r.sub_package_id] = {
                avgRating: r.avgRating || 0,
                reviewCount: r.reviewCount || 0
            };
        });

        // 3️⃣ Build structured response
        const pkg = {
            package_id: rows[0].package_id,
            packageName: rows[0].packageName || null,
            packageMedia: rows[0].packageMedia || null,
            service_type_id: rows[0].service_type_id || null,
            sub_packages: []
        };

        const subPackageMap = new Map();

        for (const row of rows) {
            if (row.sub_package_id) {
                if (!subPackageMap.has(row.sub_package_id)) {
                    const ratingInfo = ratingMap[row.sub_package_id] || { avgRating: 0, reviewCount: 0 };

                    subPackageMap.set(row.sub_package_id, {
                        sub_package_id: row.sub_package_id,
                        item_name: row.item_name,
                        description: row.sub_description,
                        item_media: row.item_media,
                        price: row.sub_price,
                        time_required: row.sub_time_required,
                        avgRating: Number(ratingInfo.avgRating),
                        reviewCount: ratingInfo.reviewCount,
                        addons: [],
                        preferences: {},
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

                // Preferences
                if (row.preference_id != null) {
                    const groupName = row.preferenceGroup || "Default";

                    if (!sp.preferences[groupName]) {
                        sp.preferences[groupName] = {
                            is_required: row.preference_is_required,
                            selections: []
                        };
                    }

                    if (!sp.preferences[groupName].selections.some(p => p.preference_id === row.preference_id)) {
                        sp.preferences[groupName].selections.push({
                            preference_id: row.preference_id,
                            preference_value: row.preferenceValue,
                            time_required: row.time_required,
                            preference_price: row.preferencePrice,
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

        res.status(200).json({
            message: "Package details fetched successfully",
            package: pkg
        });
    } catch (err) {
        console.error("Error fetching package details:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const changeUserPassword = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { newPassword, confirmPassword } = req.body;

    if (!user_id) {
        return res.status(401).json({ message: "Unauthorized: Missing user_id" });
    }

    if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Both newPassword and confirmPassword are required" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    try {
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        const [result] = await db.query(
            `UPDATE users SET password = ? WHERE user_id = ?`,
            [hashedPassword, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Failed to update password" });
        }

        res.status(200).json({ message: "Password changed successfully" });

    } catch (err) {
        console.error("Error changing user password:", err);
        res.status(500).json({ message: "Internal server error", details: err.message });
    }
});

const getUserProfileWithCart = asyncHandler(async (req, res) => {
    const user_id = req.user.user_id;
    const { cart_id } = req.params; // ✅ Get cart_id from URL params

    try {
        // =======================
        // 1️⃣ Fetch user data
        // =======================
        const results = await db.query(
            `SELECT
                user_id,
                firstName,
                lastName,
                email,
                phone,
                flatNumber
             FROM users
             WHERE user_id = ?`,
            [user_id]
        );

        if (!results || results.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        const userData = results[0];
        Object.keys(userData).forEach(key => {
            if (userData[key] === null) userData[key] = "";
        });

        // =======================
        // 2️⃣ Fetch active service tax
        // =======================
        const [[taxRow]] = await db.query(`
            SELECT taxName, taxPercentage
            FROM service_taxes
            WHERE status = '1'
        `);

        const serviceTaxRate = taxRow ? parseFloat(taxRow.taxPercentage) : 0;
        const serviceTaxName = taxRow ? taxRow.taxName : null;

        // =======================
        // 3️⃣ Fetch specific cart OR all carts
        // =======================
        const [cartRows] = await db.query(
            `SELECT
                sc.cart_id,
                sc.service_id,
                sc.user_id,
                sc.vendor_id,
                sc.bookingStatus,
                sc.notes,
                sc.bookingMedia,
                sc.created_at,
                sc.bookingDate,
                sc.bookingTime,
                sc.user_promo_code_id
             FROM service_cart sc
             WHERE sc.user_id = ? ${cart_id ? 'AND sc.cart_id = ?' : ''}
             ORDER BY sc.created_at DESC`,
            cart_id ? [user_id, cart_id] : [user_id]
        );

        if (cart_id && cartRows.length === 0) {
            return res.status(400).json({ message: "Cart not found or doesn't belong to user" });
        }

        const allCarts = [];
        const promos = [];

        for (const cart of cartRows) {
            const { cart_id } = cart;

            // ---- Sub-Packages ----
            const [subPackages] = await db.query(
                `SELECT
                    cpi.cart_package_items_id,
                    cpi.sub_package_id,
                    pi.itemName,
                    pi.itemMedia,
                    cpi.price,
                    cpi.quantity,
                    pi.timeRequired
                 FROM cart_package_items cpi
                 LEFT JOIN package_items pi ON cpi.sub_package_id = pi.item_id
                 WHERE cpi.cart_id = ?`,
                [cart_id]
            );

            // ---- Addons ----
            const [addons] = await db.query(
                `SELECT ca.sub_package_id, a.addonName, ca.price
                 FROM cart_addons ca
                 JOIN package_addons a ON ca.addon_id = a.addon_id
                 WHERE ca.cart_id = ?`,
                [cart_id]
            );

            // ---- Preferences ----
            const [preferences] = await db.query(
                `SELECT cp.cart_preference_id, cp.sub_package_id, bp.preferenceValue, bp.preferencePrice
                 FROM cart_preferences cp
                 JOIN booking_preferences bp ON cp.preference_id = bp.preference_id
                 WHERE cp.cart_id = ?`,
                [cart_id]
            );

            // ---- Consents ----
            const [consents] = await db.query(
                `SELECT cc.cart_consent_id, cc.sub_package_id, c.question, cc.answer
                 FROM cart_consents cc
                 JOIN package_consent_forms c ON cc.consent_id = c.consent_id
                 WHERE cc.cart_id = ?`,
                [cart_id]
            );

            // ---- Grouping logic ----
            const addonsBySub = {};
            addons.forEach(a => {
                if (!addonsBySub[a.sub_package_id]) addonsBySub[a.sub_package_id] = [];
                addonsBySub[a.sub_package_id].push(a);
            });

            const prefsBySub = {};
            preferences.forEach(p => {
                if (!prefsBySub[p.sub_package_id]) prefsBySub[p.sub_package_id] = [];
                prefsBySub[p.sub_package_id].push({
                    cart_preference_id: p.cart_preference_id,
                    preferenceValue: p.preferenceValue,
                    price: p.preferencePrice || 0
                });
            });

            const consentsBySub = {};
            consents.forEach(c => {
                if (!consentsBySub[c.sub_package_id]) consentsBySub[c.sub_package_id] = [];
                consentsBySub[c.sub_package_id].push({
                    consent_id: c.cart_consent_id,
                    consentText: c.question,
                    answer: c.answer
                });
            });

            // ---- Build Sub-Packages ----
            const subPackagesStructured = subPackages.map(sub => {
                const subAddons = addonsBySub[sub.sub_package_id] || [];
                const subPrefs = prefsBySub[sub.sub_package_id] || [];
                const subConsents = consentsBySub[sub.sub_package_id] || [];

                const subTotal =
                    (parseFloat(sub.price) || 0) * (parseInt(sub.quantity) || 1) +
                    subAddons.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0) +
                    subPrefs.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

                return {
                    ...sub,
                    addons: subAddons,
                    preferences: subPrefs,
                    consents: subConsents,
                    total: subTotal
                };
            });

            // ---- Totals ----
            let totalAmount = subPackagesStructured.reduce((sum, sp) => sum + sp.total, 0);
            const taxAmount = (totalAmount * serviceTaxRate) / 100;
            const afterTax = totalAmount + taxAmount;

            // ---- Promo ----
            let discountedTotal = afterTax;
            let promoDiscount = 0;
            let promoDetails = null;

            if (cart.user_promo_code_id) {
                const [userPromoRows] = await db.query(
                    `SELECT * FROM user_promo_codes WHERE user_id = ? AND user_promo_code_id = ? LIMIT 1`,
                    [user_id, cart.user_promo_code_id]
                );

                if (userPromoRows.length) {
                    const promo = userPromoRows[0];
                    if (promo.promo_id) {
                        const [adminPromo] = await db.query(
                            `SELECT * FROM promo_codes WHERE promo_id = ?`,
                            [promo.promo_id]
                        );

                        if (adminPromo.length) {
                            const discountValue = parseFloat(adminPromo[0].discountValue || 0);
                            const discountType = adminPromo[0].discount_type || 'percentage';
                            discountedTotal =
                                discountType === 'fixed'
                                    ? Math.max(0, afterTax - discountValue)
                                    : afterTax - (afterTax * discountValue / 100);

                            promoDiscount = afterTax - discountedTotal;
                            promoDetails = { ...adminPromo[0], source_type: 'admin', code: promo.code };
                        }
                    }
                }

                if (!promoDetails) {
                    const [systemPromoRows] = await db.query(
                        `SELECT sc.*, st.discount_type, st.discountValue
                         FROM system_promo_codes sc
                         JOIN system_promo_code_templates st ON sc.template_id = st.system_promo_code_template_id
                         WHERE sc.system_promo_code_id = ? LIMIT 1`,
                        [cart.user_promo_code_id]
                    );

                    if (systemPromoRows.length) {
                        const sysPromo = systemPromoRows[0];
                        const discountValue = parseFloat(sysPromo.discountValue || 0);
                        const discountType = sysPromo.discount_type || 'percentage';
                        discountedTotal =
                            discountType === 'fixed'
                                ? Math.max(0, afterTax - discountValue)
                                : afterTax - (afterTax * discountValue / 100);

                        promoDiscount = afterTax - discountedTotal;
                        promoDetails = { ...sysPromo, source_type: 'system' };
                    }
                }

                if (promoDetails) promos.push(promoDetails);
            }

            // ---- Finalize ----
            allCarts.push({
                ...cart,
                packages: [{ sub_packages: subPackagesStructured }],
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                afterTax: parseFloat(afterTax.toFixed(2)),
                tax: {
                    taxName: serviceTaxName,
                    taxPercentage: serviceTaxRate,
                    taxAmount: parseFloat(taxAmount.toFixed(2))
                },
                promoDiscount: parseFloat(promoDiscount.toFixed(2)),
                finalTotal: parseFloat(discountedTotal.toFixed(2))
            });
        }

        // =======================
        // 4️⃣ Response
        // =======================
        res.status(200).json({
            message: cart_id
                ? "Single cart fetched successfully"
                : "User profile and carts fetched successfully",
            user: userData,
            carts: allCarts,
            promos
        });

    } catch (err) {
        console.error("Error fetching profile + cart:", err);
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
    getPackagesByServiceType,
    getPackageDetailsById,
    changeUserPassword,
    getUserProfileWithCart
}
