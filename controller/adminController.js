const { db } = require("../config/db");
const adminQueries = require("../config/adminQueries");
const adminGetQueries = require("../config/adminQueries/adminGetQueries")
const adminPostQueries = require("../config/adminQueries/adminPostQueries");
const adminPutQueries = require("../config/adminQueries/adminPutQueries");
const adminDeleteQueries = require("../config/adminQueries/adminDeleteQueries")
const asyncHandler = require("express-async-handler");

const getVendor = asyncHandler(async (req, res) => {
    try {
        const [vendors] = await db.query(adminGetQueries.vendorDetails);

        const processedVendors = vendors.map(vendor => {
            const parsedServices = vendor.services ? JSON.parse(vendor.services) : [];

            // Remove fields not needed based on vendorType
            if (vendor.vendorType === "individual") {
                // Remove all company_* fields
                for (let key in vendor) {
                    if (key.startsWith("company_")) delete vendor[key];
                }
            } else if (vendor.vendorType === "company") {
                // Remove all individual_* fields
                for (let key in vendor) {
                    if (key.startsWith("individual_")) delete vendor[key];
                }
            }

            return {
                ...vendor,
                services: parsedServices
            };
        });

        res.status(200).json({
            message: "Vendor details fetched successfully",
            data: processedVendors
        });

    } catch (err) {
        console.error("Error fetching vendor details:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getAllServiceType = asyncHandler(async (req, res) => {

    try {
        const [rows] = await db.query(adminGetQueries.getAllServiceTypes);

        const cleanedRows = rows.map(row => {
            // Parse JSON fields
            const preferences = JSON.parse(row.preferences || '[]');
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
                preferences,
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

const getUsers = asyncHandler(async (req, res) => {
    try {
        const [users] = await db.query(adminGetQueries.getAllUsers);

        res.status(200).json({
            message: "Users fetched successfully",
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { user_id } = req.params;
    const { firstName, lastName, email, phone, is_approved } = req.body;

    try {
        // Check if user exists
        const [userRows] = await db.query(adminPutQueries.getUserById, [user_id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const existing = userRows[0];

        const updatedFirstName = firstName?.trim() || existing.firstName;
        const updatedLastName = lastName?.trim() || existing.lastName;
        const updatedEmail = email?.trim() || existing.email;
        const updatedPhone = phone?.trim() || existing.phone;
        const updatedApproval =
            typeof is_approved === "number" ? is_approved : existing.is_approved;

        await db.query(adminPutQueries.updateUserById, [
            updatedFirstName,
            updatedLastName,
            updatedEmail,
            updatedPhone,
            updatedApproval,
            user_id,
        ]);

        res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
        console.error("Error updating user by admin:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});
// Get all bookings for admin calendar
const getBookings = asyncHandler(async (req, res) => {
    try {
        const [allBookings] = await db.query(`
            SELECT
                sb.booking_id,
                sb.bookingDate,
                sb.bookingTime,
                sb.bookingStatus,
                sb.notes,
                sb.bookingMedia,
                sb.payment_intent_id,

                u.user_id,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,

                sc.serviceCategory,
                s.serviceName,

                st.serviceTypeName,
                st.serviceTypeMedia,

                v.vendor_id,
                v.vendorType,

                IF(v.vendorType = 'company', cdet.companyName, idet.name) AS vendorName,
                IF(v.vendorType = 'company', cdet.companyPhone, idet.phone) AS vendorPhone,
                IF(v.vendorType = 'company', cdet.companyEmail, idet.email) AS vendorEmail,
                IF(v.vendorType = 'company', cdet.contactPerson, NULL) AS vendorContactPerson,

                p.status AS payment_status,
                p.amount AS payment_amount,
                p.currency AS payment_currency

            FROM service_booking sb
            LEFT JOIN users u ON sb.user_id = u.user_id
            LEFT JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN service_booking_types sbt ON sb.booking_id = sbt.booking_id
            LEFT JOIN service_type st ON sbt.service_type_id = st.service_type_id
            LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id

            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `);

        for (const booking of allBookings) {
            const bookingId = booking.booking_id;

            // Fetch Packages
            const [bookingPackages] = await db.query(`
                SELECT
                    p.package_id,
                    p.packageName,
                    p.totalPrice,
                    p.totalTime,
                    p.packageMedia
                FROM service_booking_packages sbp
                JOIN packages p ON sbp.package_id = p.package_id
                WHERE sbp.booking_id = ?
            `, [bookingId]);

            // Fetch Items
            const [packageItems] = await db.query(`
                SELECT
                    sbsp.sub_package_id AS item_id,
                    pi.itemName,
                    sbsp.price,
                    sbsp.quantity,
                    pi.itemMedia,
                    pi.timeRequired,
                    pi.package_id
                FROM service_booking_sub_packages sbsp
                LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                WHERE sbsp.booking_id = ?
            `, [bookingId]);

            // Group items under packages
            const groupedPackages = bookingPackages.map(pkg => {
                const items = packageItems.filter(item => item.package_id === pkg.package_id);
                return { ...pkg, items };
            });

            // Fetch Preferences
            const [bookingPreferences] = await db.query(`
                SELECT
                    sp.preference_id,
                    bp.preferenceValue
                FROM service_preferences sp
                JOIN booking_preferences bp ON sp.preference_id = bp.preference_id
                WHERE sp.booking_id = ?
            `, [bookingId]);

            booking.packages = groupedPackages;
            booking.package_items = packageItems;
            booking.preferences = bookingPreferences;

            // Remove nulls
            Object.keys(booking).forEach(key => {
                if (booking[key] === null) delete booking[key];
            });
        }

        res.status(200).json({
            message: "All bookings fetched successfully",
            bookings: allBookings
        });

    } catch (error) {
        console.error("Error fetching all bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

const createPackageByAdmin = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { serviceId, serviceTypeName, packages, preferences } = req.body;

        if (!serviceId || !serviceTypeName || !packages) {
            throw new Error("Missing required fields: serviceId, service_type_name, and packages.");
        }

        const serviceTypeMedia = req.uploadedFiles?.serviceTypeMedia?.[0]?.url || null;

        const [stResult] = await connection.query(
            adminPostQueries.insertServiceType,
            [serviceId, serviceTypeName, serviceTypeMedia || null]
        );

        const service_type_id = stResult.insertId;

        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            throw new Error("At least one package is required.");
        }

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const media = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || null;

            const [pkgResult] = await connection.query(
                adminPostQueries.insertPackage,
                [service_type_id, pkg.package_name, pkg.description, pkg.total_price, pkg.total_time, media]
            );

            const package_id = pkgResult.insertId;

            for (let j = 0; j < (pkg.sub_packages || []).length; j++) {
                const sub = pkg.sub_packages[j];
                const itemMedia = req.uploadedFiles?.[`itemMedia_${j}`]?.[0]?.url || null;

                await connection.query(
                    adminPostQueries.insertPackageItem,
                    [package_id, sub.item_name, sub.description, sub.price, sub.time_required, itemMedia]
                );
            }

            if (preferences) {
                const parsedPrefs = typeof preferences === "string" ? JSON.parse(preferences) : preferences;
                for (const pref of parsedPrefs) {
                    if (!pref.preference_value) continue;

                    await connection.query(
                        adminPostQueries.insertBookingPreference,
                        [package_id, pref.preference_value.trim()]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            message: "Service type and packages created successfully by admin",
            service_type_id
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Admin package creation error:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getAdminCreatedPackages = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(adminGetQueries.getAdminCreatedPackages);
        console.log(rows);

        const result = rows.map(row => ({

            service_type_id: row.service_type_id,
            service_type_name: row.serviceTypeName,
            service_type_media: row.serviceTypeMedia,

            service_id: row.service_id,
            service_name: row.serviceName,

            service_category_id: row.service_categories_id,
            service_category_name: row.serviceCategory,

            packages: JSON.parse(row.packages || '[]').map(pkg => ({
                ...pkg,
                sub_packages: typeof pkg.sub_packages === 'string' ? JSON.parse(pkg.sub_packages || '[]') : [],
                preferences: typeof pkg.preferences === 'string' ? JSON.parse(pkg.preferences || '[]') : []
            }))
        }));

        res.status(200).json({
            message: "Admin-created packages fetched successfully",
            result
        });
    } catch (err) {
        console.error("Error fetching admin-created packages:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const assignPackageToVendor = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { vendor_id, selectedPackages } = req.body;

        if (!vendor_id || !Array.isArray(selectedPackages) || selectedPackages.length === 0) {
            return res.status(400).json({ message: "vendor_id and selectedPackages[] with sub-packages are required." });
        }

        // ✅ Check vendor existence and type
        const [vendorExists] = await connection.query(
            `SELECT vendor_id, vendorType FROM vendors WHERE vendor_id = ?`,
            [vendor_id]
        );
        if (vendorExists.length === 0) throw new Error(`Vendor ID ${vendor_id} does not exist.`);

        const vendorType = vendorExists[0].vendorType;

        // // ✅ Check manual toggle status
        // const [toggleResult] = await connection.query(
        //     `SELECT manual_assignment_enabled FROM vendor_settings WHERE vendor_id = ?`,
        //     [vendor_id]
        // );

        // const isEnabled = toggleResult[0]?.manual_assignment_enabled === 1; // 1 = enabled
        // if (!isEnabled) {
        //     throw new Error(`Manual assignment toggle must be ON for vendor ID ${vendor_id}.`);
        // }

        for (const pkg of selectedPackages) {
            const { package_id, sub_packages = [], preferences = [] } = pkg;

            // ✅ Step 1: Get service_type_id from package
            const [pkgRow] = await connection.query(
                `SELECT service_type_id FROM packages WHERE package_id = ?`,
                [package_id]
            );
            if (pkgRow.length === 0) throw new Error(`Package ID ${package_id} does not exist.`);

            const service_type_id = pkgRow[0].service_type_id;

            // ✅ Step 2: Get service_id and category from service_type
            const [serviceDetails] = await connection.query(
                `SELECT s.service_id, s.service_categories_id
                 FROM service_type st
                 JOIN services s ON st.service_id = s.service_id
                 WHERE st.service_type_id = ?`,
                [service_type_id]
            );
            if (serviceDetails.length === 0) throw new Error(`Service Type ID ${service_type_id} not valid.`);

            const { service_id, service_categories_id } = serviceDetails[0];

            // ✅ Insert vendor-package
            await connection.query(
                `INSERT IGNORE INTO vendor_packages (vendor_id, package_id) VALUES (?, ?)`,
                [vendor_id, package_id]
            );

            // ✅ Insert services and categories
            if (vendorType === "company") {
                await connection.query(
                    `INSERT IGNORE INTO company_services (vendor_id, service_id) VALUES (?, ?)`,
                    [vendor_id, service_id]
                );
                await connection.query(
                    `INSERT IGNORE INTO company_service_categories (vendor_id, service_categories_id) VALUES (?, ?)`,
                    [vendor_id, service_categories_id]
                );
            } else {
                await connection.query(
                    `INSERT IGNORE INTO individual_services (vendor_id, service_id) VALUES (?, ?)`,
                    [vendor_id, service_id]
                );
                await connection.query(
                    `INSERT IGNORE INTO individual_service_categories (vendor_id, service_categories_id) VALUES (?, ?)`,
                    [vendor_id, service_categories_id]
                );
            }

            // ✅ Insert sub-packages
            for (const item of sub_packages) {
                const item_id = item.sub_package_id;

                const [itemExists] = await connection.query(
                    `SELECT item_id FROM package_items WHERE item_id = ? AND package_id = ?`,
                    [item_id, package_id]
                );
                if (itemExists.length === 0) {
                    throw new Error(`Sub-package ID ${item_id} does not belong to Package ID ${package_id}.`);
                }

                await connection.query(
                    `INSERT IGNORE INTO vendor_package_items (vendor_id, package_id, package_item_id)
                     VALUES (?, ?, ?)`,
                    [vendor_id, package_id, item_id]
                );
            }

            // ✅ Insert preferences
            for (const pref of preferences) {
                const preference_id = pref.preference_id;

                const [prefExists] = await connection.query(
                    `SELECT preference_id FROM booking_preferences WHERE preference_id = ? AND package_id = ?`,
                    [preference_id, package_id]
                );
                if (prefExists.length === 0) {
                    throw new Error(`Preference ID ${preference_id} does not belong to Package ID ${package_id}.`);
                }

                await connection.query(
                    `INSERT IGNORE INTO vendor_package_preferences (vendor_id, package_id, preference_id)
                     VALUES (?, ?, ?)`,
                    [vendor_id, package_id, preference_id]
                );
            }
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Packages, services, and preferences successfully assigned to vendor.",
            assigned: selectedPackages
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Assign error:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});


const editPackageByAdmin = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { packages, preferences } = req.body;
        if (!packages) throw new Error("Missing required field: packages");

        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const package_id = pkg.package_id;
            if (!package_id) continue;

            const [existingPackage] = await connection.query(adminPutQueries.getPackageById, [package_id]);
            if (!existingPackage.length) continue;
            const existing = existingPackage[0];

            const packageName = pkg.package_name ?? existing.packageName;
            const description = pkg.description ?? existing.description;
            const totalPrice = pkg.total_price ?? existing.totalPrice;
            const totalTime = pkg.total_time ?? existing.totalTime;
            const packageMedia = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || existing.packageMedia;

            await connection.query(adminPutQueries.updatePackage, [
                packageName,
                description,
                totalPrice,
                totalTime,
                packageMedia,
                package_id
            ]);

            const submittedItemIds = [];
            for (let j = 0; j < (pkg.sub_packages || []).length; j++) {
                const sub = pkg.sub_packages[j];
                const sub_id = sub.sub_package_id;

                if (sub_id) {
                    const [oldItem] = await connection.query(adminPutQueries.getPackageItemById, [sub_id]);
                    if (!oldItem.length) continue;
                    const old = oldItem[0];

                    const itemName = sub.item_name ?? old.itemName;
                    const itemDesc = sub.description ?? old.description;
                    const price = sub.price ?? old.price;
                    const timeRequired = sub.time_required ?? old.timeRequired;
                    const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || old.itemMedia;

                    await connection.query(adminPutQueries.updatePackageItem, [
                        itemName,
                        itemDesc,
                        price,
                        timeRequired,
                        itemMedia,
                        sub_id,
                        package_id
                    ]);

                    submittedItemIds.push(sub_id);
                } else {
                    const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;

                    const [newItem] = await connection.query(adminPutQueries.insertPackageItem, [
                        package_id,
                        sub.item_name,
                        sub.description,
                        sub.price,
                        sub.time_required,
                        itemMedia
                    ]);

                    submittedItemIds.push(newItem.insertId);
                }
            }

            if (submittedItemIds.length > 0) {
                await connection.query(adminPutQueries.deleteRemovedPackageItems, [package_id, submittedItemIds]);
            } else {
                await connection.query(adminPutQueries.deleteAllPackageItems, [package_id]);
            }

            await connection.query(adminPutQueries.deletePackagePreferences, [package_id]);

            const parsedPrefs = typeof preferences === "string" ? JSON.parse(preferences) : preferences;
            for (const pref of parsedPrefs) {
                if (!pref.preference_value) continue;

                await connection.query(adminPutQueries.insertPackagePreference, [
                    package_id,
                    pref.preference_value.trim()
                ]);
            }
        }

        await connection.commit();
        connection.release();
        res.status(200).json({ message: "Packages updated successfully" });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Admin package update error:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const deletePackageByAdmin = asyncHandler(async (req, res) => {
    const { package_id } = req.params;

    if (!package_id) {
        return res.status(400).json({ error: "Missing required parameter: package_id" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [exists] = await connection.query(
            adminDeleteQueries.checkPackageExists,
            [package_id]
        );

        if (exists.length === 0) {
            throw new Error("Package not found.");
        }

        await connection.query(
            adminDeleteQueries.deletePackageById,
            [package_id]
        );

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: `Package (ID: ${package_id}) and related data deleted successfully.`,
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("Delete package error:", error);
        res.status(500).json({ error: "Database error", details: error.message });
    }
});

const getAllPayments = asyncHandler(async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT
                p.payment_id,
                p.payment_intent_id,
                p.amount,
                p.currency,
                p.created_at,
                p.status,

                -- User Info
                u.user_id,
                u.firstname AS user_firstname,
                u.lastname AS user_lastname,
                u.email AS user_email,
                u.phone AS user_phone,

                -- Vendor Info
                v.vendor_id,
                v.vendorType,

                -- Individual Vendor Info
                idet.name AS individual_name,
                idet.phone AS individual_phone,
                idet.email AS individual_email,
                idet.profileImage AS individual_profile_image,

                -- Company Vendor Info
                cdet.companyName,
                cdet.contactPerson,
                cdet.companyEmail AS email,
                cdet.companyPhone AS phone,
                cdet.profileImage AS company_profile_image,

                -- Package Info
                pkg.package_id,
                pkg.packageName,
                pkg.totalPrice,
                pkg.totalTime,
                pkg.packageMedia

            FROM payments p

            -- Join user
            JOIN users u ON p.user_id = u.user_id

            -- Join service_booking using payment_intent_id
            JOIN service_booking sb ON sb.payment_intent_id = p.payment_intent_id

            -- Join vendor from booking
            JOIN vendors v ON sb.vendor_id = v.vendor_id

            -- Join individual and company details based on vendor type
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'

            -- Join package from booking
            JOIN service_booking_packages sbp ON sbp.booking_id = sb.booking_id
            JOIN packages pkg ON pkg.package_id = sbp.package_id

            ORDER BY p.created_at DESC`);

        const filteredPayments = payments.map(payment => {
            return Object.fromEntries(
                Object.entries(payment).filter(([_, value]) => value !== null)
            );
        });

        res.status(200).json({
            success: true,
            payments: filteredPayments
        });

    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
});


module.exports = {
    getVendor,
    getAllServiceType,
    getUsers,
    updateUserByAdmin,
    getBookings,
    createPackageByAdmin,
    getAdminCreatedPackages,
    assignPackageToVendor,
    editPackageByAdmin,
    deletePackageByAdmin,
    deletePackageByAdmin,
    getAllPayments
};
