const { db } = require("../config/db");
const adminQueries = require("../config/adminQueries");
const adminGetQueries = require("../config/adminQueries/adminGetQueries")
const adminPostQueries = require("../config/adminQueries/adminPostQueries");
const adminPutQueries = require("../config/adminQueries/adminPutQueries");
const adminDeleteQueries = require("../config/adminQueries/adminDeleteQueries")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
        const [users] = await db.query(adminGetQueries.getAllUserDetails);

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

const getAllEmployeesForAdmin = asyncHandler(async (req, res) => {
    try {
        const [employees] = await db.query(`
      SELECT
        ce.employee_id,
        CONCAT(ce.first_name, ' ', ce.last_name) AS employee_name,
        ce.profile_image,
        ce.email,
        ce.phone,
        ce.is_active,
        ce.created_at
      FROM company_employees ce
    `);

        res.status(200).json({
            employees,
        });
    } catch (error) {
        console.error("Error fetching all employees for admin:", error);
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
                sb.payment_status,

                u.user_id,
                CONCAT(u.firstName, ' ', u.lastName) AS userName,
                u.email AS user_email,

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

        const enrichedBookings = await Promise.all(
            allBookings.map(async (booking) => {
                const bookingId = booking.booking_id;

                // ===== Fetch Packages =====
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

                // ===== Fetch Items =====
                const [packageItems] = await db.query(`
                    SELECT
                        sbsp.sub_package_id AS item_id,
                        pi.itemName,
                        sbsp.quantity,
                        (sbsp.price * sbsp.quantity) AS price,
                        pi.itemMedia,
                        pi.timeRequired,
                        pi.package_id
                    FROM service_booking_sub_packages sbsp
                    LEFT JOIN package_items pi ON sbsp.sub_package_id = pi.item_id
                    WHERE sbsp.booking_id = ?
                `, [bookingId]);

                // ===== Fetch Addons =====
                const [bookingAddons] = await db.query(`
                    SELECT
                        sba.addon_id,
                        pa.addonName,
                        sba.quantity,
                        (sba.price * sba.quantity) AS price,
                        sba.package_id
                    FROM service_booking_addons sba
                    LEFT JOIN package_addons pa ON sba.addon_id = pa.addon_id
                    WHERE sba.booking_id = ?
                `, [bookingId]);

                // Group items & addons under packages
                const groupedPackages = bookingPackages.map(pkg => {
                    const items = packageItems.filter(item => item.package_id === pkg.package_id);
                    // const addons = bookingAddons.filter(addon => addon.package_id === pkg.package_id);
                    return { ...pkg, items };
                });

                // ===== Fetch Preferences =====
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
                booking.addons = bookingAddons;
                booking.preferences = bookingPreferences;

                // ===== Stripe Metadata Enrichment =====
                if (booking.payment_intent_id) {
                    try {
                        const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment_intent_id);

                        const charges = await stripe.charges.list({
                            payment_intent: booking.payment_intent_id,
                            limit: 1,
                        });
                        const charge = charges.data?.[0];

                        const stripeMetadata = {
                            cardBrand: charge?.payment_method_details?.card?.brand || "N/A",
                            last4: charge?.payment_method_details?.card?.last4 || "****",
                            receiptEmail: charge?.receipt_email || charge?.billing_details?.email || booking.user_email || "N/A",
                            chargeId: charge?.id || "N/A",
                            paidAt: charge?.created
                                ? new Date(charge.created * 1000).toLocaleString("en-US", {
                                    timeZone: "Asia/Kolkata",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : "N/A",
                            receiptUrl: charge?.receipt_url || null,
                            paymentIntentId: charge?.payment_intent || "N/A",
                        };

                        booking.stripeMetadata = stripeMetadata;
                    } catch (err) {
                        console.error(`❌ Stripe fetch failed for booking ${booking.booking_id}:`, err.message);
                        booking.stripeMetadata = {
                            cardBrand: "N/A",
                            last4: "****",
                            receiptEmail: booking.user_email || "N/A",
                            chargeId: "N/A",
                            paidAt: "N/A",
                            receiptUrl: null,
                            paymentIntentId: booking.payment_intent_id,
                        };
                    }
                }

                // Remove null values
                Object.keys(booking).forEach(key => {
                    if (booking[key] === null) delete booking[key];
                });

                return booking;
            })
        );

        res.status(200).json({
            message: "All bookings fetched successfully",
            bookings: enrichedBookings
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
        const { serviceId, serviceTypeName, subtypeName = null, packages, preferences } = req.body;

        if (!serviceTypeName || !packages) {
            throw new Error("Missing required fields: serviceTypeName and packages.");
        }

        const serviceTypeMedia = req.uploadedFiles?.serviceTypeMedia?.[0]?.url || null;
        const subtypeMedia = req.uploadedFiles?.subtypeMedia?.[0]?.url || null;

        // 1️⃣ Check if service_type already exists
        let service_type_id;
        const [existingServiceType] = await connection.query(
            `SELECT service_type_id FROM service_type 
             WHERE service_id = ? AND serviceTypeName = ? LIMIT 1`,
            [serviceId, serviceTypeName.trim()]
        );

        if (existingServiceType.length > 0) {
            service_type_id = existingServiceType[0].service_type_id;

            // Optional: update media if new media is provided
            if (serviceTypeMedia) {
                await connection.query(
                    `UPDATE service_type SET serviceTypeMedia = ? WHERE service_type_id = ?`,
                    [serviceTypeMedia, service_type_id]
                );
            }
        } else {
            const [stResult] = await connection.query(
                `INSERT INTO service_type (service_id, serviceTypeName, serviceTypeMedia)
                 VALUES (?, ?, ?)`,
                [serviceId, serviceTypeName.trim(), serviceTypeMedia]
            );
            service_type_id = stResult.insertId;
        }

        let finalSubtypeId = null;

        // 2️⃣ Subtype (check before insert)
        if (subtypeName) {
            const [existingSub] = await connection.query(
                `SELECT subtype_id FROM service_subtypes 
                 WHERE service_type_id = ? AND subtypeName = ? LIMIT 1`,
                [service_type_id, subtypeName.trim()]
            );

            if (existingSub.length > 0) {
                finalSubtypeId = existingSub[0].subtype_id;
            } else {
                const [insertSub] = await connection.query(
                    `INSERT INTO service_subtypes (service_type_id, subtypeName, subtypeMedia)
                     VALUES (?, ?, ?)`,
                    [service_type_id, subtypeName.trim(), subtypeMedia]
                );
                finalSubtypeId = insertSub.insertId;
            }
        }

        // 3️⃣ Parse packages
        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            throw new Error("At least one package is required.");
        }

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const media = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || null;

            // Insert package
            const [pkgResult] = await connection.query(
                adminPostQueries.insertPackage,
                [service_type_id, pkg.package_name, pkg.description, pkg.total_price, pkg.total_time, media]
            );
            const package_id = pkgResult.insertId;

            // Insert sub-packages
            for (let j = 0; j < (pkg.sub_packages || []).length; j++) {
                const sub = pkg.sub_packages[j];
                const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;

                await connection.query(
                    adminPostQueries.insertPackageItem,
                    [package_id, sub.item_name, sub.description, sub.price, sub.time_required, itemMedia]
                );
            }

            // Insert addons
            for (let k = 0; k < (pkg.addons || []).length; k++) {
                const addon = pkg.addons[k];
                const addon_media = req.uploadedFiles?.[`addon_media_${i}_${k}`]?.[0]?.url || null;

                await connection.query(
                    `INSERT INTO package_addons (package_id, addonName, addonDescription, addonPrice, addonTime, addonMedia)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        package_id,
                        addon.addon_name,
                        addon.description || null,
                        addon.price || 0,
                        addon.addon_time,
                        addon_media
                    ]
                );
            }

            // Insert preferences
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
            message: "✅ Service type, subtype, packages, and addons created successfully",
            service_type_id,
            subtype_id: finalSubtypeId
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
        st.serviceTypeName AS service_type_name,
        st.serviceTypeMedia AS service_type_media,

        s.service_id,
        s.serviceName AS service_name,

        sc.service_categories_id AS service_category_id,
        sc.serviceCategory AS service_category_name,

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
              ), '[]'),
              'addons', IFNULL((
                SELECT CONCAT('[', GROUP_CONCAT(
                  JSON_OBJECT(
                    'addon_id', pa.addon_id,
                    'addon_name', pa.addonName,
                    'description', pa.addonDescription,
                    'price', pa.addonPrice
                  )
                ), ']')
                FROM package_addons pa
                WHERE pa.package_id = p.package_id
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

        const parsedResult = rows.flatMap(row => {
            let parsedPackages = [];

            try {
                const rawPackages = JSON.parse(row.packages);

                parsedPackages = rawPackages.map(pkg => {
                    let sub_packages = [];
                    let preferences = [];
                    let addons = [];

                    try {
                        sub_packages = typeof pkg.sub_packages === "string"
                            ? JSON.parse(pkg.sub_packages)
                            : [];
                    } catch (e) {
                        console.warn(`❌ Invalid sub_packages JSON in package ${pkg.package_id}:`, e.message);
                    }

                    try {
                        preferences = typeof pkg.preferences === "string"
                            ? JSON.parse(pkg.preferences)
                            : [];
                    } catch (e) {
                        console.warn(`❌ Invalid preferences JSON in package ${pkg.package_id}:`, e.message);
                    }

                    try {
                        addons = typeof pkg.addons === "string"
                            ? JSON.parse(pkg.addons)
                            : [];
                    } catch (e) {
                        console.warn(`❌ Invalid addons JSON in package ${pkg.package_id}:`, e.message);
                    }

                    return {
                        package_id: pkg.package_id,
                        title: pkg.title,
                        description: pkg.description,
                        price: pkg.price,
                        time_required: pkg.time_required,
                        package_media: pkg.package_media,
                        sub_packages,
                        preferences,
                        addons
                    };
                });
            } catch (e) {
                console.warn(`❌ Invalid packages JSON in service_type_id ${row.service_type_id}:`, e.message);
            }

            if (!parsedPackages || parsedPackages.length === 0) {
                return [];
            }

            return [{
                ...row,
                packages: parsedPackages
            }];
        });

        res.status(200).json({
            message: "Admin packages fetched successfully",
            result: parsedResult
        });

    } catch (error) {
        console.error("Error fetching admin-created packages:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
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

            // ✅ Now using subPackages instead of sub_packages
            if (Array.isArray(pkg.subPackages)) {
                const submittedItemIds = [];

                for (let j = 0; j < pkg.subPackages.length; j++) {
                    const sub = pkg.subPackages[j];
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

                // Optional cleanup logic - commented to preserve old items
                // if (submittedItemIds.length > 0) {
                //     await connection.query(adminPutQueries.deleteRemovedPackageItems, [package_id, submittedItemIds]);
                // } else {
                //     await connection.query(adminPutQueries.deleteAllPackageItems, [package_id]);
                // }
            }

            if (Array.isArray(preferences)) {
                await connection.query(adminPutQueries.deletePackagePreferences, [package_id]);

                for (const pref of preferences) {
                    if (!pref.preference_value) continue;

                    await connection.query(adminPutQueries.insertPackagePreference, [
                        package_id,
                        pref.preference_value.trim()
                    ]);
                }
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
      JOIN users u ON p.user_id = u.user_id
      JOIN service_booking sb ON sb.payment_intent_id = p.payment_intent_id
      JOIN vendors v ON sb.vendor_id = v.vendor_id
      LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
      LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'
      JOIN service_booking_packages sbp ON sbp.booking_id = sb.booking_id
      JOIN packages pkg ON pkg.package_id = sbp.package_id

      ORDER BY p.created_at DESC
    `);

        const enhancedPayments = await Promise.all(
            payments.map(async (payment, index) => {
                console.log(`\n🔄 Processing payment [${index + 1}/${payments.length}]`);
                console.log(`👉 Payment ID: ${payment.payment_id}`);
                console.log(`👉 PaymentIntent ID: ${payment.payment_intent_id}`);

                try {
                    const paymentIntent = await stripe.paymentIntents.retrieve(payment.payment_intent_id);
                    console.log(`✅ Retrieved PaymentIntent: ${paymentIntent.id}`);

                    const charges = await stripe.charges.list({
                        payment_intent: payment.payment_intent_id,
                        limit: 1,
                    });
                    const charge = charges.data?.[0];

                    if (!charge) {
                        console.warn(`⚠️ No charge found for payment_intent: ${payment.payment_intent_id}`);
                    } else {
                        console.log(`✅ Retrieved Charge ID: ${charge.id}`);
                        console.log(`💳 Card Brand: ${charge.payment_method_details?.card?.brand}`);
                        console.log(`💳 Last 4: ${charge.payment_method_details?.card?.last4}`);
                        console.log(`📧 Email: ${charge.receipt_email || charge.billing_details?.email}`);
                        console.log(`🧾 Receipt URL: ${charge.receipt_url}`);
                        console.log(`🕒 Paid At (raw): ${charge.created}`);
                    }

                    const stripeMetadata = {
                        cardBrand: charge?.payment_method_details?.card?.brand || "N/A",
                        last4: charge?.payment_method_details?.card?.last4 || "****",
                        receiptEmail: charge?.receipt_email || charge?.billing_details?.email || payment.user_email || "N/A",
                        chargeId: charge?.id || "N/A",
                        paidAt: charge?.created
                            ? new Date(charge.created * 1000).toLocaleString("en-US", {
                                timeZone: "Asia/Kolkata",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })
                            : "N/A",
                        receiptUrl: charge?.receipt_url || null,
                        paymentIntentId: charge?.payment_intent || "N/A",
                    };

                    console.log(`✅ Final Stripe Metadata:`, stripeMetadata);

                    return {
                        ...payment,
                        ...stripeMetadata,
                    };
                } catch (stripeError) {
                    console.error(`❌ Stripe metadata fetch failed for ${payment.payment_intent_id}:`, stripeError.message);
                    return {
                        ...payment,
                        cardBrand: "N/A",
                        last4: "****",
                        receiptEmail: payment.user_email,
                        chargeId: "N/A",
                        paidAt: "N/A",
                        receiptUrl: null,
                        paymentIntentId: payment.payment_intent_id,
                    };
                }
            })
        );

        // ✅ Remove null fields from final response
        const filteredPayments = enhancedPayments.map((payment) =>
            Object.fromEntries(
                Object.entries(payment).filter(([_, value]) => value !== null && value !== "")
            )
        );


        res.status(200).json({
            success: true,
            payments: filteredPayments,
        });
    } catch (error) {
        console.error("❌ Error fetching payments:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
});

const getAllPackages = asyncHandler(async (req, res) => {
    try {
        const [packages] = await db.query(`
      SELECT 
        package_id,
        packageName
      FROM packages
      ORDER BY created_at DESC
    `);

        res.status(200).json({
            message: "All packages fetched successfully",
            packages,
        });
    } catch (error) {
        console.error("Error fetching packages:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllVendorPackageRequests = asyncHandler(async (req, res) => {
    try {
        const [applications] = await db.query(`
            SELECT 
                vpa.application_id,
                vpa.vendor_id,
                vpa.package_id,
                vpa.status,
                vpa.applied_at,

                v.vendorType,
                IF(v.vendorType = 'company', cdet.companyName, idet.name) AS vendorName,
                IF(v.vendorType = 'company', cdet.companyEmail, idet.email) AS vendorEmail,
                IF(v.vendorType = 'company', cdet.companyPhone, idet.phone) AS vendorPhone,

                p.packageName,
                p.totalPrice,
                p.totalTime,
                p.packageMedia
            FROM vendor_package_applications vpa
            JOIN vendors v ON vpa.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            JOIN packages p ON vpa.package_id = p.package_id
            ORDER BY vpa.applied_at DESC
        `);

        // Fetch sub-packages & preferences for each application
        for (const app of applications) {
            const [subPackages] = await db.query(`
                SELECT vpsp.sub_package_id, pi.itemName, pi.itemMedia, pi.timeRequired
                FROM vendor_sub_packages_application vpsp
                JOIN package_items pi ON vpsp.sub_package_id = pi.item_id
                WHERE vpsp.application_id = ?
            `, [app.application_id]);

            const [preferences] = await db.query(`
                SELECT vpp.preference_id, bp.preferenceValue
                FROM vendor_preferences_application vpp
                JOIN booking_preferences bp ON vpp.preference_id = bp.preference_id
                WHERE vpp.application_id = ?
            `, [app.application_id]);

            app.sub_packages = subPackages;
            app.preferences = preferences;
        }

        res.status(200).json({
            message: "All vendor package requests fetched successfully",
            applications
        });

    } catch (err) {
        console.error("Error fetching vendor package requests:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});

const updateVendorPackageRequestStatus = asyncHandler(async (req, res) => {
    try {
        const { application_id } = req.params;
        const { status } = req.body; // 1 for approved, 2 for rejected

        if (!application_id || status === undefined) {
            return res.status(400).json({ message: "application_id and status are required" });
        }

        if (![0, 1, 2].includes(Number(status))) {
            return res.status(400).json({ message: "Invalid status. Use 0 (pending), 1 (approved), or 2 (rejected)." });
        }

        const [result] = await db.query(
            `
            UPDATE vendor_package_applications
            SET status = ?, 
                approved_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
            WHERE application_id = ?
            `,
            [status, status, application_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Application not found" });
        }

        res.status(200).json({
            message: `Application ${application_id} status updated to ${status}.`
        });

    } catch (err) {
        console.error("Error updating application status:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
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
    getAllPayments,
    getAllPackages,
    getAllEmployeesForAdmin,
    getAllVendorPackageRequests,
    updateVendorPackageRequestStatus
};
