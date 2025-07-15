const { db } = require("../config/db");
const adminQueries = require("../config/adminQueries");
const adminGetQueries = require("../config/adminQueries/adminGetQueries")
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
        const [userRows] = await db.query(`SELECT * FROM users WHERE user_id = ?`, [user_id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update user with provided fields (fallback to existing if not passed)
        const existing = userRows[0];

        const updatedFirstName = firstName?.trim() || existing.firstName;
        const updatedLastName = lastName?.trim() || existing.lastName;
        const updatedEmail = email?.trim() || existing.email;
        const updatedPhone = phone?.trim() || existing.phone;
        const updatedApproval = typeof is_approved === "number" ? is_approved : existing.is_approved;

        await db.query(
            `UPDATE users
             SET firstName = ?, lastName = ?, email = ?, phone = ?, is_approved = ?
             WHERE user_id = ?`,
            [updatedFirstName, updatedLastName, updatedEmail, updatedPhone, updatedApproval, user_id]
        );

        res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
        console.error("Error updating user by admin:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});
// Get all bookings for admin calendar
const getBookings = asyncHandler(async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT
                sb.booking_id,
                sb.bookingDate,
                sb.bookingTime,
                sb.bookingStatus,
                sb.notes,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,
                s.serviceName,
                sc.serviceCategory,
                CASE
                    WHEN v.vendorType = 'individual' THEN ind.name
                    WHEN v.vendorType = 'company' THEN comp.companyName
                END as vendorName
            FROM service_booking sb
            JOIN users u ON sb.user_id = u.user_id
            JOIN services s ON sb.service_id = s.service_id
            JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
            JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
            LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
            ORDER BY sb.bookingDate DESC, sb.bookingTime DESC
        `);

        res.status(200).json({
            message: "Bookings fetched successfully",
            bookings
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const createPackageByAdmin = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const {
            serviceId,
            serviceTypeName,
            packages,
            preferences
        } = req.body;

        if (!serviceId || !serviceTypeName || !packages) {
            throw new Error("Missing required fields: serviceId, service_type_name, and packages.");
        }

        const serviceTypeMedia = req.uploadedFiles?.serviceTypeMedia?.[0]?.url || null;
        // Insert into service_type table
        const [stResult] = await connection.query(`
            INSERT INTO service_type (service_id, serviceTypeName, serviceTypeMedia)
            VALUES (?, ?, ?)
        `, [serviceId, serviceTypeName, serviceTypeMedia || null]);

        const service_type_id = stResult.insertId;

        // Parse packages
        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            throw new Error("At least one package is required.");
        }

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const media = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || null;

            const [pkgResult] = await connection.query(`
                INSERT INTO packages
                (service_type_id, packageName, description, totalPrice, totalTime, packageMedia)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [service_type_id, pkg.package_name, pkg.description, pkg.total_price, pkg.total_time, media]);

            const package_id = pkgResult.insertId;

            for (let j = 0; j < (pkg.subPackages || []).length; j++) {
                const sub = pkg.subPackages[j];
                const itemMedia = req.uploadedFiles?.[`itemMedia_${j}`]?.[0]?.url || null;

                await connection.query(`
                    INSERT INTO package_items
                    (package_id, itemName, description, price, timeRequired, itemMedia)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    package_id,
                    sub.item_name,
                    sub.description,
                    sub.price,
                    sub.time_required,
                    itemMedia
                ]);
            }

            // Optional preferences
            if (preferences) {
                const parsedPrefs = typeof preferences === "string" ? JSON.parse(preferences) : preferences;
                for (const pref of parsedPrefs) {
                    if (!pref.preference_value) continue;
                    await connection.query(`
                        INSERT INTO booking_preferences (package_id, preferenceValue)
                        VALUES (?, ?)
                    `, [package_id, pref.preference_value.trim()]);
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
        const [rows] = await db.query(`
        SELECT
            st.service_type_id,
            st.serviceTypeName,
            st.serviceTypeMedia,

            s.service_id,
            s.serviceName,

            sc.service_categories_id,
            sc.serviceCategory,

            COALESCE((
                SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                        'package_id', p.package_id,
                        'title', p.packageName,
                        'description', p.description,
                        'price', p.totalPrice,
                        'time_required', p.totalTime,
                        'package_media', p.packageMedia,
                        'sub_packages', IFNULL((
                            SELECT CONCAT('[', GROUP_CONCAT(
                                JSON_OBJECT(
                                    'sub_package_id', pi.item_id,
                                    'item_name', pi.itemName,
                                    'description', pi.description,
                                    'price', pi.price,
                                    'time_required', pi.timeRequired,
                                    'item_media', pi.itemMedia
                                )
                            ), ']')
                            FROM package_items pi
                            WHERE pi.package_id = p.package_id
                        ), '[]'),
                        'preferences', IFNULL((
                            SELECT CONCAT('[', GROUP_CONCAT(
                                JSON_OBJECT(
                                    'preference_id', bp.preference_id,
                                    'preference_value', bp.preferenceValue
                                )
                            ), ']')
                            FROM booking_preferences bp
                            WHERE bp.package_id = p.package_id
                        ), '[]')
                    )
                ), ']')
                FROM packages p
                WHERE p.service_type_id = st.service_type_id
            ), '[]') AS packages

        FROM service_type st
        JOIN services s ON s.service_id = st.service_id
        JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id

        ORDER BY st.service_type_id DESC
      `);

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

        for (const pkg of selectedPackages) {
            const { package_id, sub_packages = [], preferences = [] } = pkg;

            if (!package_id || !Array.isArray(sub_packages)) {
                throw new Error("Each package must include package_id and sub_packages[] array.");
            }

            // ✅ Check if package exists
            const [packageExists] = await connection.query(
                `SELECT package_id FROM packages WHERE package_id = ?`,
                [package_id]
            );
            if (packageExists.length === 0) {
                throw new Error(`Package ID ${package_id} does not exist.`);
            }

            // ✅ Insert vendor-package link
            await connection.query(
                `INSERT IGNORE INTO vendor_packages (vendor_id, package_id) VALUES (?, ?)`,
                [vendor_id, package_id]
            );

            // ✅ Insert sub-packages (items)
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
            message: "Packages, items, and preferences successfully assigned to vendor by admin.",
            assigned: selectedPackages
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Admin assign error:", err);
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

            // Get existing package values
            const [existingPackage] = await connection.query(`SELECT * FROM packages WHERE package_id = ?`, [package_id]);
            if (!existingPackage.length) continue;
            const existing = existingPackage[0];

            // Merge with provided values
            const packageName = pkg.package_name ?? existing.packageName;
            const description = pkg.description ?? existing.description;
            const totalPrice = pkg.total_price ?? existing.totalPrice;
            const totalTime = pkg.total_time ?? existing.totalTime;

            let packageMedia = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || existing.packageMedia;

            // ✅ Update package with merged values
            await connection.query(`
                UPDATE packages
                SET packageName = ?, description = ?, totalPrice = ?, totalTime = ?, packageMedia = ?
                WHERE package_id = ?
            `, [packageName, description, totalPrice, totalTime, packageMedia, package_id]);

            // Process sub-packages
            const submittedItemIds = [];
            for (let j = 0; j < (pkg.subPackages || []).length; j++) {
                const sub = pkg.subPackages[j];
                const sub_id = sub.sub_package_id;

                if (sub_id) {
                    // Get existing item
                    const [oldItem] = await connection.query(`SELECT * FROM package_items WHERE item_id = ?`, [sub_id]);
                    if (!oldItem.length) continue;
                    const old = oldItem[0];

                    const itemName = sub.item_name ?? old.itemName;
                    const itemDesc = sub.description ?? old.description;
                    const price = sub.price ?? old.price;
                    const timeRequired = sub.time_required ?? old.timeRequired;
                    const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || old.itemMedia;

                    await connection.query(`
                        UPDATE package_items
                        SET itemName = ?, description = ?, price = ?, timeRequired = ?, itemMedia = ?
                        WHERE item_id = ? AND package_id = ?
                    `, [itemName, itemDesc, price, timeRequired, itemMedia, sub_id, package_id]);

                    submittedItemIds.push(sub_id);
                } else {
                    const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;

                    const [newItem] = await connection.query(`
                        INSERT INTO package_items (package_id, itemName, description, price, timeRequired, itemMedia)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [package_id, sub.item_name, sub.description, sub.price, sub.time_required, itemMedia]);

                    submittedItemIds.push(newItem.insertId);
                }
            }

            // Delete removed sub-packages
            if (submittedItemIds.length > 0) {
                await connection.query(`
                    DELETE FROM package_items
                    WHERE package_id = ? AND item_id NOT IN (?)
                `, [package_id, submittedItemIds]);
            } else {
                await connection.query(`DELETE FROM package_items WHERE package_id = ?`, [package_id]);
            }

            // Replace preferences
            await connection.query(`DELETE FROM booking_preferences WHERE package_id = ?`, [package_id]);

            const parsedPrefs = typeof preferences === "string" ? JSON.parse(preferences) : preferences;
            for (const pref of parsedPrefs) {
                if (!pref.preference_value) continue;
                await connection.query(`
                    INSERT INTO booking_preferences (package_id, preferenceValue)
                    VALUES (?, ?)
                `, [package_id, pref.preference_value.trim()]);
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
            `SELECT package_id FROM packages WHERE package_id = ?`,
            [package_id]
        );

        if (exists.length === 0) {
            throw new Error("Package not found.");
        }

        // Single delete - CASCADE takes care of the rest
        await connection.query(
            `DELETE FROM packages WHERE package_id = ?`,
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

const toggleManualVendorAssignment = asyncHandler(async (req, res) => {
    const { value } = req.body;

    if (value !== 0 && value !== 1) {
        return res.status(400).json({ message: "Value must be 0 (off) or 1 (on)" });
    }

    try {
        await db.query(`
            INSERT INTO settings (setting_key, setting_value)
            VALUES ('manual_vendor_assignment', ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        `, [value]);

        res.status(200).json({
            message: `Manual vendor assignment mode set to ${value === 1 ? 'ON' : 'OFF'}`
        });

    } catch (err) {
        console.error("Error toggling manual vendor assignment:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getManualAssignmentStatus = asyncHandler(async (req, res) => {
    try {
        const [result] = await db.query(
            `SELECT setting_value FROM settings WHERE setting_key = 'manual_vendor_assignment' LIMIT 1`
        );

        res.status(200).json({
            value: result[0]?.setting_value ?? null
        });
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
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
    toggleManualVendorAssignment,
    getManualAssignmentStatus
};
