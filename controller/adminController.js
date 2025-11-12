const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const adminGetQueries = require("../config/adminQueries/adminGetQueries")
const adminPostQueries = require("../config/adminQueries/adminPostQueries");
const adminPutQueries = require("../config/adminQueries/adminPutQueries");
const bookingGetQueries = require('../config/bookingQueries/bookingGetQueries');
const adminDeleteQueries = require("../config/adminQueries/adminDeleteQueries")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { sendVendorAssignedPackagesEmail , sendManualAssignmentMail} = require("../config/utils/email/mailer");


const getAdminProfile = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;
    try {
        // Assuming you have middleware that sets req.adminId
        if (!admin_id) {
            return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
        }

        const rows = await db.query(
            `SELECT
                admin_id,
                email,
                name,
                created_at
             FROM admin
             WHERE admin_id = ?`,
            [admin_id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({
            message: "Admin profile fetched successfully",
            admin: rows[0],
        });
    } catch (error) {
        console.error("Error fetching admin profile:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const editAdminProfile = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id;
    const { name, email, fcmToken } = req.body;

    if (!admin_id) {
        return res.status(401).json({ message: "Unauthorized: Admin ID missing" });
    }

    if (!name && !email && !fcmToken) {
        return res.status(400).json({ message: "No fields to update" });
    }

    try {
        // Build dynamic SQL
        const fields = [];
        const values = [];

        if (name) {
            fields.push("name = ?");
            values.push(name);
        }

        if (email) {
            fields.push("email = ?");
            values.push(email);
        }

        values.push(admin_id);

        const sql = `
            UPDATE admin
            SET ${fields.join(", ")}
            WHERE admin_id = ?
        `;

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("Error updating admin profile:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendor = asyncHandler(async (req, res) => {
    try {
        // 📄 Pagination setup
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 🔍 Optional search term
        const search = req.query.search?.trim() || null;
        const searchLike = `%${search}%`;

        // 🧠 Base query templates
        let baseVendorQuery = adminGetQueries.vendorDetails;
        let vendorQuery = baseVendorQuery + ` LIMIT ? OFFSET ?`;
        let countQuery = `SELECT COUNT(*) AS totalCount FROM vendors`;

        // ✅ UNIVERSAL SEARCH (ignores pagination)
        if (search) {
            vendorQuery = `
                SELECT v.*
                FROM (
                    ${adminGetQueries.vendorDetails}
                    ) AS v
                    WHERE
                    v.individual_name LIKE ? OR
                    v.individual_email LIKE ? OR
                    v.individual_phone LIKE ? OR
                    v.company_companyName LIKE ? OR
                    v.company_companyEmail LIKE ? OR
                    v.company_companyPhone LIKE ?;
                    `;

            countQuery = `
                SELECT COUNT(*) AS totalCount
                FROM (
                    ${adminGetQueries.vendorDetails}
                ) AS v
                WHERE
                    v.individual_name LIKE ? OR
                    v.individual_email LIKE ? OR
                    v.individual_phone LIKE ? OR
                    v.company_companyName LIKE ? OR
                    v.company_companyEmail LIKE ? OR
                    v.company_companyPhone LIKE ?;
            `;
        }

        // 🧾 Query execution
        const queryParams = search
            ? [searchLike, searchLike, searchLike, searchLike, searchLike, searchLike]
            : [limit, offset];

        const [vendors] = await db.query(vendorQuery, queryParams);

        const countParams = search
            ? [searchLike, searchLike, searchLike, searchLike, searchLike, searchLike]
            : [];
        const [[{ totalCount }]] = await db.query(countQuery, countParams);

        // 🧠 Process each vendor
        const processedVendors = vendors.map(vendor => {
            let packages = [];
            let packageItems = [];
            try { packages = vendor.packages ? JSON.parse(vendor.packages) : []; } catch { }
            try { packageItems = vendor.package_items ? JSON.parse(vendor.package_items) : []; } catch { }

            if (vendor.vendorType === "individual") {
                for (let key in vendor) if (key.startsWith("company_")) delete vendor[key];
            } else {
                for (let key in vendor) if (key.startsWith("individual_")) delete vendor[key];
            }

            const serviceMap = {};
            packages.forEach(pkg => {
                const serviceId = pkg.service_id;
                if (!serviceId) return;

                if (!serviceMap[serviceId]) {
                    serviceMap[serviceId] = {
                        service_id: serviceId,
                        serviceName: pkg.serviceName,
                        serviceImage: pkg.serviceImage,
                        category_id: pkg.category_id,
                        categoryName: pkg.categoryName,
                        packages: []
                    };
                }

                const items = packageItems
                    .filter(item => item.package_id === pkg.package_id)
                    .map(item => ({
                        vendor_packages_id: item.vendor_packages_id,
                        package_item_id: item.package_item_id,
                        itemName: item.itemName,
                        description: item.description,
                        itemMedia: item.itemMedia
                    }));

                serviceMap[serviceId].packages.push({
                    package_id: pkg.package_id,
                    serviceLocation: pkg.serviceLocation,
                    items
                });
            });

            const servicesWithPackages = Object.values(serviceMap);

            const { packages: _p, package_items: _pi, ...vendorWithoutStrings } = vendor;
            return { ...vendorWithoutStrings, services: servicesWithPackages };
        });

        // ✅ Response
        res.status(200).json({
            message: search
                ? "Universal search results fetched successfully"
                : "Vendor details fetched successfully",
            total: totalCount,
            page: search ? 1 : page, // universal search shows everything on one page
            limit: search ? totalCount : limit,
            totalPages: search ? 1 : Math.ceil(totalCount / limit),
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
        // 📄 Read pagination parameters from query (defaults)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 1️⃣ Get total count for pagination metadata
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users`);

        const [users] = await db.query(adminGetQueries.getAllUserDetails, [limit, offset]);

        // 3️⃣ Calculate total pages
        const totalPages = Math.ceil(total / limit);

        // ✅ Send response
        res.status(200).json({
            message: "Users fetched successfully",
            page,
            limit,
            totalUsers: total,
            totalPages,
            count: users.length,
            users,
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
            cd.companyName,
            ce.employee_id,
            ce.first_name,
            ce.last_name,
            ce.profile_image,
            ce.email,
            ce.phone,
            ce.is_active,
            ce.created_at
                FROM company_employees ce
                LEFT JOIN company_details cd ON ce.vendor_id = cd.vendor_id
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

const getBookings = asyncHandler(async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search = "",
            status,
            start_date,
            end_date
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);
        const offset = (page - 1) * limit;

        let filters = " WHERE 1=1 ";
        const params = [];

        // ===== Search by booking ID, user, email, or service name =====
        if (search && search.trim() !== "") {
            const searchPattern = `%${search.trim()}%`;
            if (!isNaN(search.trim())) {
                filters += ` AND (
          sb.booking_id = ?
          OR CONCAT(u.firstName, ' ', u.lastName) LIKE ?
          OR u.email LIKE ?
          OR s.serviceName LIKE ?
        )`;
                params.push(search.trim(), searchPattern, searchPattern, searchPattern);
            } else {
                filters += ` AND (
          CONCAT(u.firstName, ' ', u.lastName) LIKE ?
          OR u.email LIKE ?
          OR s.serviceName LIKE ?
        )`;
                params.push(searchPattern, searchPattern, searchPattern);
            }
        }

        // ===== Filter by booking status =====
        if (status && [1, 3, 4].includes(Number(status))) {
            filters += ` AND sb.bookingStatus = ?`;
            params.push(status);
        }

        // ===== Filter by date range =====
        if (start_date && end_date) {
            filters += ` AND DATE(sb.bookingDate) BETWEEN ? AND ?`;
            params.push(start_date, end_date);
        } else if (start_date) {
            filters += ` AND DATE(sb.bookingDate) >= ?`;
            params.push(start_date);
        } else if (end_date) {
            filters += ` AND DATE(sb.bookingDate) <= ?`;
            params.push(end_date);
        }

        // ===== Count total records =====
        const [[{ total }]] = await db.query(
            `SELECT COUNT(DISTINCT sb.booking_id) AS total
       FROM service_booking sb
       LEFT JOIN users u ON sb.user_id = u.user_id
       LEFT JOIN services s ON sb.service_id = s.service_id
       ${filters}`,
            params
        );

        if (total === 0) {
            return res.status(200).json({
                message: "No bookings found",
                currentPage: page,
                totalPages: 0,
                totalRecords: 0,
                bookings: [],
            });
        }

        // ===== Fetch main booking data (permanent DESC order) =====
        const [bookings] = await db.query(`
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
        u.phone AS user_phone,

        s.serviceName,
        sc.serviceCategory,

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
      LEFT JOIN services s ON sb.service_id = s.service_id
      LEFT JOIN service_categories sc ON s.service_categories_id = sc.service_categories_id
      LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
      LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
      LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
      LEFT JOIN payments p ON p.payment_intent_id = sb.payment_intent_id
      ${filters}
      ORDER BY sb.booking_id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        // ===== Fetch related data =====
        // ===== Fetch related data (fixed for proper IN expansion) =====
        const bookingIds = bookings.map(b => b.booking_id);

        const [subPackages] = await db.query(
            bookingGetQueries.getBookedSubPackagesMulti.replace("IN (?)", `IN (${bookingIds.join(",")})`)
        );
        const [addons] = await db.query(
            bookingGetQueries.getBookedAddonsMulti.replace("IN (?)", `IN (${bookingIds.join(",")})`)
        );
        const [preferences] = await db.query(
            bookingGetQueries.getBoookedPrefrencesMulti.replace("IN (?)", `IN (${bookingIds.join(",")})`)
        );
        const [consents] = await db.query(
            bookingGetQueries.getBoookedConsentsMulti.replace("IN (?)", `IN (${bookingIds.join(",")})`)
        );

        // ===== Helper function to group by booking_id =====
        const groupBy = (arr) => arr.reduce((acc, cur) => {
            if (!acc[cur.booking_id]) acc[cur.booking_id] = [];
            acc[cur.booking_id].push(cur);
            return acc;
        }, {});

        const groupedSub = groupBy(subPackages);
        const groupedAddons = groupBy(addons);
        const groupedPrefs = groupBy(preferences);
        const groupedConsents = groupBy(consents);

        const bookingMap = {};

        // ===== Combine all related data =====
        for (const b of bookings) {
            const subList = groupedSub[b.booking_id] || [];
            const addonsList = groupedAddons[b.booking_id] || [];
            const prefsList = groupedPrefs[b.booking_id] || [];
            const consentList = groupedConsents[b.booking_id] || [];

            const addonsByItem = {};
            addonsList.forEach(a => {
                if (!addonsByItem[a.sub_package_id]) addonsByItem[a.sub_package_id] = [];
                const { booking_id, sub_package_id, ...rest } = a;
                addonsByItem[a.sub_package_id].push(rest);
            });

            const prefsByItem = {};
            prefsList.forEach(p => {
                if (!prefsByItem[p.sub_package_id]) prefsByItem[p.sub_package_id] = [];
                const { booking_id, sub_package_id, ...rest } = p;
                prefsByItem[p.sub_package_id].push(rest);
            });

            const consentsByItem = {};
            consentList.forEach(c => {
                if (!consentsByItem[c.sub_package_id]) consentsByItem[c.sub_package_id] = [];
                const { booking_id, sub_package_id, ...rest } = c;
                consentsByItem[c.sub_package_id].push(rest);
            });

            const groupedByPackage = subList.reduce((acc, sp) => {
                const packageId = sp.package_id;
                if (!acc[packageId]) {
                    acc[packageId] = {
                        package_id: packageId,
                        packageName: sp.packageName,
                        packageMedia: sp.packageMedia,
                        items: [],
                    };
                }
                acc[packageId].items.push({
                    sub_package_id: sp.sub_package_id,
                    itemName: sp.itemName,
                    itemMedia: sp.itemMedia,
                    timeRequired: sp.timeRequired,
                    quantity: sp.quantity,
                    price: sp.price,
                    addons: addonsByItem[sp.sub_package_id] || [],
                    preferences: prefsByItem[sp.sub_package_id] || [],
                    consents: consentsByItem[sp.sub_package_id] || [],
                });
                return acc;
            }, {});

            bookingMap[b.booking_id] = { ...b, sub_packages: Object.values(groupedByPackage) };
        }

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            message: "Bookings fetched successfully (DESC order)",
            currentPage: page,
            totalPages,
            totalRecords: total,
            limit,
            bookings: bookings.map(b => bookingMap[b.booking_id]),
        });

    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});


const createPackageByAdmin = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { serviceId, packages } = req.body;
        if (!serviceId || !packages) {
            return res.status(400).json({ message: "serviceId and packages are required" });
        }

        // Parse packages if sent as JSON string in form-data
        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;

        // 1️⃣ Check if service exists
        const [serviceCheck] = await connection.query(
            `SELECT service_id FROM services WHERE service_id = ?`,
            [serviceId]
        );
        if (serviceCheck.length === 0) {
            return res.status(400).json({ message: "Service not found" });
        }

        // 2️⃣ Ensure service_type exists
        let [serviceTypeCheck] = await connection.query(
            `SELECT service_type_id FROM service_type WHERE service_id = ?`,
            [serviceId]
        );

        let serviceTypeId;
        if (serviceTypeCheck.length === 0) {
            const [stInsert] = await connection.query(
                `INSERT INTO service_type (service_id) VALUES (?)`,
                [serviceId]
            );
            serviceTypeId = stInsert.insertId;
        } else {
            serviceTypeId = serviceTypeCheck[0].service_type_id;
        }

        // 3️⃣ Insert packages
        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const packageImage = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || null;

            let packageId;

            if (pkg.packageName && packageImage) {
                // Create package normally if both name and image exist
                const [pkgInsert] = await connection.query(
                    `INSERT INTO packages (service_type_id, packageName, packageMedia)
                     VALUES (?, ?, ?)`,
                    [serviceTypeId, pkg.packageName, packageImage]
                );
                packageId = pkgInsert.insertId;
            } else {
                // Missing name or image → create a default package
                const [pkgInsert] = await connection.query(
                    `INSERT INTO packages (service_type_id, packageName, packageMedia)
                     VALUES (?, ?, ?)`,
                    [serviceTypeId, null, null]
                );
                packageId = pkgInsert.insertId;
            }

            // 4️⃣ Insert sub-packages
            if (pkg.sub_packages && pkg.sub_packages.length > 0) {
                for (let j = 0; j < pkg.sub_packages.length; j++) {
                    const subPkg = pkg.sub_packages[j];
                    const subPackageItemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;

                    const [subPkgInsert] = await connection.query(
                        `INSERT INTO package_items (package_id, itemName, description, price, timeRequired, itemMedia)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [packageId, subPkg.item_name, subPkg.description || "", subPkg.price || 0, subPkg.time_required || 0, subPackageItemMedia]
                    );
                    const itemId = subPkgInsert.insertId;

                    // ✅ Insert preferences (with group-level is_required)
                    if (subPkg.preferences && typeof subPkg.preferences === "object") {
                        for (const [groupName, groupData] of Object.entries(subPkg.preferences)) {
                            const isRequired = groupData.is_required != null ? groupData.is_required : 0;

                            if (Array.isArray(groupData.items)) {
                                for (const pref of groupData.items) {
                                    await connection.query(
                                        `INSERT INTO booking_preferences
                                         (package_item_id, preferenceValue, preferencePrice, preferenceGroup, timeRequired, is_required)
                                         VALUES (?, ?, ?, ?, ?, ?)`,
                                        [
                                            itemId,
                                            pref.preference_value,
                                            pref.preference_price || 0,
                                            groupName,
                                            pref.time_required || 0,
                                            isRequired
                                        ]
                                    );
                                }
                            }
                        }
                    }

                    // 5️⃣ Insert addons
                    if (subPkg.addons && subPkg.addons.length > 0) {
                        for (let k = 0; k < subPkg.addons.length; k++) {
                            const addon = subPkg.addons[k];

                            await connection.query(
                                `INSERT INTO package_addons (package_item_id, addonName, addonDescription, addonPrice, addonTime)
                                 VALUES (?, ?, ?, ?, ?)`,
                                [itemId, addon.addon_name, addon.description || "", addon.price || 0, addon.time_required || 0]
                            );
                        }
                    }

                    // 6️⃣ Insert consent forms
                    if (subPkg.consentForm && subPkg.consentForm.length > 0) {
                        for (const consent of subPkg.consentForm) {
                            await connection.query(
                                `INSERT INTO package_consent_forms (package_item_id, question, is_required)
                                 VALUES (?, ?, ?)`,
                                [itemId, consent.question, consent.is_required || 0]
                            );
                        }
                    }
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: "Package(s) created successfully", serviceTypeId });
    } catch (err) {
        await connection.rollback();
        console.error("Error creating package:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    } finally {
        connection.release();
    }
});


const getPackageList = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                p.package_id,
                -- Show packageName if exists, otherwise show serviceName
                CASE
                    WHEN (p.packageName IS NULL OR p.packageName = '')
                    THEN s.serviceName
                    ELSE p.packageName
                END AS packageName,

                -- Show packageMedia if exists, otherwise show serviceImage
                CASE
                    WHEN (p.packageMedia IS NULL OR p.packageMedia = '')
                    THEN s.serviceImage
                    ELSE p.packageMedia
                END AS packageMedia,

                st.service_type_id,
                s.service_id,
                sc.serviceCategory AS service_category_name
            FROM packages p
            JOIN service_type st ON p.service_type_id = st.service_type_id
            JOIN services s ON st.service_id = s.service_id
            JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id
            ORDER BY p.package_id DESC
        `);

        res.json({
            message: "Packages list fetched successfully",
            packages: rows
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching packages", error: error.message });
    }
});

const getPackageDetails = asyncHandler(async (req, res) => {
    const { package_id } = req.params;

    try {
        const [rows] = await db.query(`
      SELECT
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
        pa.addonTime AS addon_time_required,
        pcf.consent_id,
        pcf.question AS consent_question,
        pcf.is_required AS consent_is_required,
        bp.preference_id,
        bp.preferenceValue,
        bp.timeRequired,
        bp.preferencePrice,
        bp.is_required AS preference_is_required,
        bp.preferenceGroup
      FROM packages p
      LEFT JOIN package_items pi ON pi.package_id = p.package_id
      LEFT JOIN package_addons pa ON pa.package_item_id = pi.item_id
      LEFT JOIN package_consent_forms pcf ON pcf.package_item_id = pi.item_id
      LEFT JOIN booking_preferences bp ON bp.package_item_id = pi.item_id
      WHERE p.package_id = ?
    `, [package_id]);

        if (!rows.length) {
            return res.status(404).json({ message: "Package not found" });
        }

        // Map package → subpackages → addons, preferences, consent forms
        const pkg = {
            package_id: rows[0].package_id,
            packageName: rows[0].packageName,
            packageMedia: rows[0].packageMedia,
            sub_packages: new Map()
        };

        for (const row of rows) {
            if (row.sub_package_id) {
                if (!pkg.sub_packages.has(row.sub_package_id)) {
                    pkg.sub_packages.set(row.sub_package_id, {
                        sub_package_id: row.sub_package_id,
                        item_name: row.item_name,
                        description: row.sub_description,
                        price: row.sub_price,
                        time_required: row.sub_time_required,
                        item_media: row.item_media,
                        addons: [],
                        preferences: {},
                        consentForm: []
                    });
                }
                const sp = pkg.sub_packages.get(row.sub_package_id);

                // Preferences grouped by preferenceGroup
                if (row.preference_id != null) {
                    const groupKey = row.preferenceGroup;
                    if (!sp.preferences[groupKey]) {
                        sp.preferences[groupKey] = {
                            is_required: row.preference_is_required,
                            items: []
                        };
                    }
                    if (!sp.preferences[groupKey].items.some(p => p.preference_id === row.preference_id)) {
                        sp.preferences[groupKey].items.push({
                            preference_id: row.preference_id,
                            preference_value: row.preferenceValue,
                            time_required: row.timeRequired,
                            preference_price: row.preferencePrice
                        });
                    }
                }

                // Addons
                if (row.addon_id && !sp.addons.some(a => a.addon_id === row.addon_id)) {
                    sp.addons.push({
                        addon_id: row.addon_id,
                        addon_name: row.addon_name,
                        description: row.addon_description,
                        price: row.addon_price,
                        time_required: row.addon_time_required
                    });
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

        // Convert Map to array
        const result = {
            ...pkg,
            sub_packages: Array.from(pkg.sub_packages.values())
        };

        res.status(200).json({
            message: "Package details fetched successfully",
            package: result
        });

    } catch (error) {
        console.error("Error fetching package details:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const assignPackageToVendor = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { vendor_id, selectedPackages } = req.body;

        if (!vendor_id || !Array.isArray(selectedPackages) || selectedPackages.length === 0) {
            return res.status(400).json({ message: "vendor_id and selectedPackages[] are required." });
        }

        // ✅ Check vendor existence
        const [vendorExists] = await connection.query(
            `SELECT vendor_id, vendorType FROM vendors WHERE vendor_id = ?`,
            [vendor_id]
        );
        if (vendorExists.length === 0) throw new Error(`Vendor ID ${vendor_id} does not exist.`);

        // ✅ Fetch vendor details
        const [vendorDetails] = await connection.query(
            `SELECT v.vendor_id, v.vendorType,
                    COALESCE(i.name, c.companyName) AS vendorName,
                    COALESCE(i.email, c.companyEmail) AS vendorEmail
             FROM vendors v
             LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
             LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
             WHERE v.vendor_id = ?`,
            [vendor_id]
        );
        const vendorData = vendorDetails[0];
        const newlyAssigned = [];

        for (const pkg of selectedPackages) {
            const { package_id, sub_packages = [] } = pkg;

            const [pkgRow] = await connection.query(
                `SELECT package_id, packageName FROM packages WHERE package_id = ?`,
                [package_id]
            );
            if (pkgRow.length === 0) throw new Error(`Package ID ${package_id} does not exist.`);
            const packageName = pkgRow[0].packageName;

            const selectedSubPackages = [];

            for (const sub of sub_packages) {
                const subpackage_id = sub.sub_package_id;

                // Check if already exists
                const [exists] = await connection.query(
                    `SELECT 1 FROM vendor_package_items_flat WHERE vendor_id = ? AND package_id = ? AND package_item_id = ?`,
                    [vendor_id, package_id, subpackage_id]
                );

                if (exists.length === 0) {
                    await connection.query(
                        `INSERT INTO vendor_package_items_flat (vendor_id, package_id, package_item_id)
                         VALUES (?, ?, ?)`,
                        [vendor_id, package_id, subpackage_id]
                    );
                }

                const [subRow] = await connection.query(
                    `SELECT itemName FROM package_items WHERE item_id = ?`,
                    [subpackage_id]
                );
                selectedSubPackages.push({
                    id: subpackage_id,
                    name: subRow.length > 0 ? subRow[0].itemName : "Unknown"
                });
            }

            newlyAssigned.push({
                package_id,
                packageName,
                selected_subpackages: selectedSubPackages
            });
        }

        await connection.commit();
        connection.release();

        // ✅ Trigger helper function in background (no await)
        sendVendorAssignedPackagesEmail({ vendorData, newlyAssigned })
            .catch(err => console.error("⚠️ Email send failed (background):", err.message));

        // ✅ Respond immediately
        res.status(200).json({
            message: "Packages successfully assigned to vendor"
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Assign packages error:", err);
        res.status(400).json({ error: err.message });
    }
});

const editPackageByAdmin = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { packages } = req.body;
        if (!packages) throw new Error("Missing required field: packages");

        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const package_id = pkg.package_id;
            if (!package_id) continue;

            // Verify package exists
            const [existingPackage] = await connection.query(
                `SELECT package_id, packageMedia, packageName FROM packages WHERE package_id = ?`,
                [package_id]
            );
            if (!existingPackage.length) continue;
            const oldPackage = existingPackage[0];
            const packageMedia = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || oldPackage.packageMedia;

            // Update package
            await connection.query(
                `UPDATE packages SET packageName = ?, packageMedia = ? WHERE package_id = ?`,
                [pkg.packageName ?? oldPackage.packageName, packageMedia, package_id]
            );

            // Handle sub-packages
            if (!Array.isArray(pkg.sub_packages)) continue;
            const submittedItemIds = [];

            for (let j = 0; j < pkg.sub_packages.length; j++) {
                const sub = pkg.sub_packages[j];
                const sub_id = sub.sub_package_id;
                let sub_package_id;

                // --- Insert / Update sub-package ---
                if (sub_id) {
                    const [oldItem] = await connection.query(
                        `SELECT * FROM package_items WHERE item_id = ?`,
                        [sub_id]
                    );
                    if (!oldItem.length) continue;
                    const old = oldItem[0];
                    const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || old.itemMedia;

                    await connection.query(
                        `UPDATE package_items
                         SET itemName = ?, description = ?, price = ?, timeRequired = ?, itemMedia = ?
                         WHERE item_id = ? AND package_id = ?`,
                        [
                            sub.item_name ?? old.itemName,
                            sub.description ?? old.description,
                            sub.price ?? old.price,
                            sub.time_required ?? old.timeRequired,
                            itemMedia,
                            sub_id,
                            package_id
                        ]
                    );
                    sub_package_id = sub_id;
                } else {
                    const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;
                    const [newItem] = await connection.query(
                        `INSERT INTO package_items (package_id, itemName, description, price, timeRequired, itemMedia)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [package_id, sub.item_name, sub.description, sub.price, sub.time_required, itemMedia]
                    );
                    sub_package_id = newItem.insertId;
                }

                submittedItemIds.push(sub_package_id);

                // --- Preferences: Delete old ones, insert submitted grouped preferences ---
                await connection.query(
                    `DELETE FROM booking_preferences WHERE package_item_id = ?`,
                    [sub_package_id]
                );

                if (sub.preferences && typeof sub.preferences === "object") {
                    for (const [groupName, groupData] of Object.entries(sub.preferences)) {
                        if (!groupData || !Array.isArray(groupData.items)) continue;

                        const groupRequired = groupData.is_required ?? 0;

                        for (const pref of groupData.items) {
                            await connection.query(
                                `INSERT INTO booking_preferences
                                (package_item_id, preferenceGroup, preferenceValue, timeRequired ,preferencePrice, is_required)
                                VALUES (?, ?, ?, ?, ?, ?)`,
                                [
                                    sub_package_id,
                                    groupName,
                                    pref.preference_value,
                                    pref.time_required ?? 0,
                                    pref.preference_price ?? 0,
                                    groupRequired   // ✅ apply group-level is_required
                                ]
                            );
                        }
                    }
                }

                // --- Addons ---
                if (Array.isArray(sub.addons)) {
                    const submittedAddonIds = [];
                    for (let k = 0; k < sub.addons.length; k++) {
                        const addon = sub.addons[k];

                        // Ensure addonTime is either a valid integer or null
                        const addonTime = addon.time_required && !isNaN(addon.time_required)
                            ? parseInt(addon.time_required)
                            : null;

                        if (addon.addon_id) {
                            // Update existing addon
                            const [oldAddon] = await connection.query(
                                `SELECT * FROM package_addons WHERE addon_id = ?`,
                                [addon.addon_id]
                            );
                            if (!oldAddon.length) continue;

                            await connection.query(
                                `UPDATE package_addons
                                SET addonName = ?, addonDescription = ?, addonPrice = ?, addonTime = ?
                                WHERE addon_id = ? AND package_item_id = ?`,
                                [
                                    addon.addon_name ?? oldAddon[0].addonName,
                                    addon.description ?? oldAddon[0].addonDescription,
                                    addon.price ?? oldAddon[0].addonPrice,
                                    addonTime ?? oldAddon[0].addonTime ?? null,
                                    addon.addon_id,
                                    sub_package_id
                                ]
                            );
                            submittedAddonIds.push(addon.addon_id);

                        } else {
                            // Insert new addon
                            const [newAddon] = await connection.query(
                                `INSERT INTO package_addons
                                (package_item_id, addonName, addonDescription, addonPrice, addonTime)
                                VALUES (?, ?, ?, ?, ?)`,
                                [
                                    sub_package_id,
                                    addon.addon_name,
                                    addon.description,
                                    addon.price,
                                    addonTime,
                                ]
                            );
                            submittedAddonIds.push(newAddon.insertId);
                        }
                    }


                    await connection.query(
                        `DELETE FROM package_addons WHERE package_item_id = ? AND addon_id NOT IN (?)`,
                        [sub_package_id, submittedAddonIds.length ? submittedAddonIds : [0]]
                    );
                }

                // --- Consent Forms ---
                if (Array.isArray(sub.consentForm)) {
                    const submittedConsentIds = [];
                    for (const form of sub.consentForm) {
                        if (form.consent_id) {
                            await connection.query(
                                `UPDATE package_consent_forms
                                 SET question = ?, is_required = ?
                                 WHERE consent_id = ? AND package_item_id = ?`,
                                [
                                    form.question,
                                    form.is_required ?? 0,
                                    form.consent_id,
                                    sub_package_id
                                ]
                            );
                            submittedConsentIds.push(form.consent_id);
                        } else {
                            const [newForm] = await connection.query(
                                `INSERT INTO package_consent_forms (package_item_id, question, is_required)
                                 VALUES (?, ?, ?)`,
                                [sub_package_id, form.question, form.is_required ?? 0]
                            );
                            submittedConsentIds.push(newForm.insertId);
                        }
                    }

                    await connection.query(
                        `DELETE FROM package_consent_forms
                         WHERE package_item_id = ? AND consent_id NOT IN (?)`,
                        [sub_package_id, submittedConsentIds.length ? submittedConsentIds : [0]]
                    );
                }
            }

            // Delete removed sub-packages
            await connection.query(
                `DELETE FROM package_items WHERE package_id = ? AND item_id NOT IN (?)`,
                [package_id, submittedItemIds.length ? submittedItemIds : [0]]
            );
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "✅ Packages updated successfully with sub-packages, preferences, addons, and consent forms"
        });

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
        // 📄 Read pagination and filters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { startDate, endDate } = req.query; // 🆕 Date filters

        // 🧩 Dynamic filter conditions
        let whereClause = "WHERE p.status = 'completed'";
        const queryParams = [];

        // If both start and end dates are provided, add to filter
        if (startDate && endDate) {
            whereClause += " AND DATE(p.created_at) BETWEEN ? AND ?";
            queryParams.push(startDate, endDate);
        }

        // 1️⃣ Get total count for completed payments (with date filter)
        const [[{ total }]] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM payments p
            ${whereClause}
            `,
            queryParams
        );

        // 2️⃣ Fetch paginated completed payment records (with date filter)
        const [payments] = await db.query(
            `
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

                s.service_id,
                s.serviceName,
                s.serviceImage

            FROM payments p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN service_booking sb ON sb.payment_intent_id = p.payment_intent_id
            LEFT JOIN vendors v ON sb.vendor_id = v.vendor_id
            LEFT JOIN services s ON sb.service_id = s.service_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?;
            `,
            [...queryParams, limit, offset]
        );

        // 3️⃣ Enhance with Stripe metadata
        const enhancedPayments = await Promise.all(
            payments.map(async (payment) => {
                try {
                    const charges = await stripe.charges.list({
                        payment_intent: payment.payment_intent_id,
                        limit: 1,
                    });
                    const charge = charges.data?.[0];

                    return {
                        ...payment,
                        cardBrand: charge?.payment_method_details?.card?.brand || "N/A",
                        last4: charge?.payment_method_details?.card?.last4 || "****",
                        receiptEmail:
                            charge?.receipt_email ||
                            charge?.billing_details?.email ||
                            payment.user_email ||
                            "N/A",
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
                } catch (stripeError) {
                    console.error(
                        `❌ Stripe metadata fetch failed for ${payment.payment_intent_id}:`,
                        stripeError.message
                    );
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

        // 4️⃣ Remove null or empty fields
        const filteredPayments = enhancedPayments.map((payment) =>
            Object.fromEntries(Object.entries(payment).filter(([_, v]) => v !== null && v !== ""))
        );

        // 5️⃣ Pagination metadata
        const totalPages = Math.ceil(total / limit);

        // ✅ Response
        res.status(200).json({
            success: true,
            message: "Completed payments fetched successfully",
            page,
            limit,
            totalPayments: total,
            totalPages,
            count: filteredPayments.length,
            filters: { startDate, endDate },
            payments: filteredPayments,
        });
    } catch (error) {
        console.error("❌ Error fetching completed payments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch completed payments",
            error: error.message,
        });
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
        // ✅ Pagination params
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // ✅ Optional search keyword
        const search = req.query.search ? `%${req.query.search}%` : null;

        // ✅ Base WHERE condition
        let whereClause = "";
        let params = [];

        if (search) {
            whereClause = `
                WHERE
                    vpa.application_id LIKE ? OR
                    IF(v.vendorType = 'company', cdet.companyName, idet.name) LIKE ? OR
                    IF(v.vendorType = 'company', cdet.companyEmail, idet.email) LIKE ?
            `;
            params.push(search, search, search);
        }

        // 1️⃣ Fetch total count
        const [[{ total }]] = await db.query(`
            SELECT COUNT(*) AS total
            FROM vendor_package_applications vpa
            JOIN vendors v ON vpa.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            ${whereClause}
        `, params);

        // 2️⃣ Fetch main applications
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

                s.serviceName,
                s.serviceImage,
                p.packageName,
                p.packageMedia
            FROM vendor_package_applications vpa
            JOIN vendors v ON vpa.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            JOIN packages p ON vpa.package_id = p.package_id
            JOIN service_type st ON p.service_type_id = st.service_type_id
            JOIN services s ON st.service_id = s.service_id
            ${whereClause}
            ORDER BY vpa.applied_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        if (!applications.length) {
            return res.status(200).json({
                message: "No vendor package requests found",
                applications: [],
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }

        // 3️⃣ Get all package_ids & application_ids
        const packageIds = applications.map(a => a.package_id);
        const applicationIds = applications.map(a => a.application_id);

        // 4️⃣ Fetch all subpackages (items)
        const [packageItems] = await db.query(
            `SELECT
                pi.item_id,
                pi.package_id,
                pi.itemName,
                pi.price,
                pi.timeRequired,
                pi.itemMedia
            FROM package_items pi
            WHERE pi.package_id IN (?)
            `,
            [packageIds]
        );

        // 5️⃣ Fetch only applied subpackages (vendor_package_item_application)
        const [appliedItems] = await db.query(
            `SELECT
                vpia.application_id,
                vpia.package_item_id
            FROM vendor_package_item_application vpia
            WHERE vpia.application_id IN (?)
            `,
            [applicationIds]
        );

        // 6️⃣ Group applied subpackage IDs by application_id
        const appliedByApp = {};
        appliedItems.forEach(ai => {
            if (!appliedByApp[ai.application_id]) appliedByApp[ai.application_id] = [];
            appliedByApp[ai.application_id].push(ai.package_item_id);
        });

        // 7️⃣ Group all items by package_id for reference
        const itemsByPackage = {};
        packageItems.forEach(item => {
            if (!itemsByPackage[item.package_id]) itemsByPackage[item.package_id] = [];
            itemsByPackage[item.package_id].push(item);
        });

        // 8️⃣ Attach filtered subPackages to applications
        const detailedApplications = applications.map(app => {
            const allItems = itemsByPackage[app.package_id] || [];
            const appliedIds = appliedByApp[app.application_id] || [];

            // Keep only applied subpackages for this application
            const filteredItems = allItems.filter(item => appliedIds.includes(item.item_id));

            return {
                ...app,
                subPackages: filteredItems
            };
        });

        // 9️⃣ Final response
        res.status(200).json({
            message: "Vendor package requests fetched successfully",
            applications: detailedApplications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
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
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { application_id } = req.params;
        const { status } = req.body; // 1 = approved, 2 = rejected

        if (!application_id || status === undefined) {
            return res.status(400).json({ message: "application_id and status are required" });
        }

        if (![0, 1, 2].includes(Number(status))) {
            return res.status(400).json({ message: "Invalid status. Use 0 (pending), 1 (approved), or 2 (rejected)." });
        }

        // ✅ Update the application status
        const [updateResult] = await connection.query(
            `
            UPDATE vendor_package_applications
            SET status = ?,
                approved_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
            WHERE application_id = ?
            `,
            [status, status, application_id]
        );

        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: "Application not found" });
        }

        // ✅ If approved, transfer data into flattened table
        if (Number(status) === 1) {
            // Get application details
            const [appRows] = await connection.query(
                `SELECT vendor_id, package_id FROM vendor_package_applications WHERE application_id = ?`,
                [application_id]
            );
            if (appRows.length === 0) throw new Error("Application details not found");

            const { vendor_id, package_id } = appRows[0];

            // Get sub-package items from vendor_package_item_application
            const [subPkgRows] = await connection.query(
                `SELECT package_item_id FROM vendor_package_item_application WHERE application_id = ?`,
                [application_id]
            );

            // Insert into flattened table
            const flattenedData = subPkgRows.map(sp => [
                vendor_id,
                package_id,
                sp.package_item_id
            ]);

            if (flattenedData.length > 0) {
                await connection.query(
                    `INSERT INTO vendor_package_items_flat (vendor_id, package_id, package_item_id)
                     VALUES ?`,
                    [flattenedData]
                );
            } else {
                // If no sub-packages, still insert the package with null/0 sub-package
                await connection.query(
                    `INSERT INTO vendor_package_items_flat (vendor_id, package_id, package_item_id)
                     VALUES (?, ?, ?)`,
                    [vendor_id, package_id, 0]
                );
            }

            // ✅ Delete application entries
            await connection.query(
                `DELETE FROM vendor_package_item_application WHERE application_id = ?`,
                [application_id]
            );
            await connection.query(
                `DELETE FROM vendor_package_applications WHERE application_id = ?`,
                [application_id]
            );
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: `Application ${application_id} status updated to ${status} successfully and data transferred to flattened table.`
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error updating application status:", err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});

const toggleManualVendorAssignmentByAdmin = asyncHandler(async (req, res) => {
  const admin_id = req.user.admin_id;
  const { vendor_id } = req.params;
  const { status, note } = req.body;

  if (!admin_id) {
    return res.status(403).json({ message: "Only admins can perform this action" });
  }

  if (!vendor_id) {
    return res.status(400).json({ message: "vendor_id is required" });
  }

  if (![0, 1].includes(status)) {
    return res.status(400).json({ message: "status must be 0 (off) or 1 (on)" });
  }

  try {
    // 1️⃣ Update vendor setting
    await db.query(`
      INSERT INTO vendor_settings (vendor_id, manual_assignment_enabled)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
          manual_assignment_enabled = VALUES(manual_assignment_enabled)
    `, [vendor_id, status]);

    // 2️⃣ Create admin notification (optional)
    try {
      const messageText = `Admin has turned manual assignment ${status === 1 ? 'ON (enabled)' : 'OFF (disabled)'} for Vendor ID ${vendor_id}. ${note ? "Note: " + note : ""}`;
      await db.query(`
        INSERT INTO notifications (title, body, is_read, sent_at, user_type)
        VALUES (?, ?, 0, NOW(), 'admin')
      `, [
        'Vendor Manual Assignment Update',
        messageText
      ]);
    } catch (err) {
      console.error("⚠️ Failed to create admin notification:", err);
    }

    // 3️⃣ Send external mail
    await sendManualAssignmentMail(vendor_id, status, note);

    res.status(200).json({
      message: `Manual assignment for vendor ${vendor_id} is now ${status === 1 ? 'ON (enabled)' : 'OFF (disabled)'}`,
      vendor_id,
      manual_assignment_enabled: status,
      note: note || null
    });

  } catch (err) {
    console.error("❌ Error toggling manual vendor assignment:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
});


const removeVendorPackageByAdmin = asyncHandler(async (req, res) => {
    // ✅ Assumes admin authentication and authorization middleware already applied
    const { vendor_packages_id } = req.params;

    if (!vendor_packages_id) {
        return res.status(400).json({ message: "vendor_packages_id is required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // ✅ Ensure the vendor package (or sub-package entry) exists
        const [existingRows] = await connection.query(
            `SELECT vendor_packages_id, vendor_id
             FROM vendor_package_items_flat
             WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        if (existingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Vendor package or sub-package not found."
            });
        }

        const vendor_id = existingRows[0].vendor_id;

        // ✅ Delete from all related tables safely using the unique vendor_packages_id
        await connection.query(
            `DELETE FROM vendor_package_items_flat WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        await connection.query(
            `DELETE FROM vendor_package_items WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        await connection.query(
            `DELETE FROM vendor_packages WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: "✅ Vendor package (or sub-package) deleted successfully by admin.",
            vendor_packages_id,
            vendor_id
        });
    } catch (err) {
        await connection.rollback();
        console.error("❌ Admin remove vendor package error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to delete vendor package or sub-package",
            error: err.message
        });
    } finally {
        connection.release();
    }
});

const deleteUserByAdmin = asyncHandler(async (req, res) => {
    try {
        const admin_id = req.user.admin_id; // ensure only admins can delete
        const { user_id } = req.params;

        if (!admin_id) {
            return res.status(403).json({ message: "Only admins can perform this action" });
        }

        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // check if user exists
        const [user] = await db.query("SELECT user_id FROM users WHERE user_id = ?", [user_id]);
        if (user.length === 0) {
            return res.status(404).json({ message: `User with ID ${user_id} not found` });
        }

        // delete user
        await db.query("DELETE FROM users WHERE user_id = ?", [user_id]);

        res.status(200).json({
            message: `User with ID ${user_id} deleted successfully`
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const editEmployeeProfileByAdmin = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id; // admin making the request
    const { employee_id } = req.params;
    const { first_name, last_name, phone, email } = req.body;

    if (!admin_id) {
        return res.status(401).json({ message: "Unauthorized: Only admins can edit employee profiles" });
    }
    if (!employee_id) {
        return res.status(400).json({ message: "Missing required field: employee_id" });
    }

    const newProfileImage = req.uploadedFiles?.profile_image?.[0]?.url || null;

    try {
        // Step 1: Fetch existing employee record
        const [existingRows] = await db.query(
            `SELECT first_name, last_name, phone, email, profile_image
             FROM company_employees
             WHERE employee_id = ?`,
            [employee_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const existing = existingRows[0];

        // Step 2: Merge with new values
        const updatedFirstName = first_name || existing.first_name;
        const updatedLastName = last_name || existing.last_name;
        const updatedPhone = phone || existing.phone;
        const updatedEmail = email || existing.email;
        const updatedProfileImage = newProfileImage || existing.profile_image;

        // Step 3: Update employee record (no vendor check here)
        const [result] = await db.query(
            `UPDATE company_employees
             SET first_name = ?, last_name = ?, phone = ?, email = ?, profile_image = ?
             WHERE employee_id = ?`,
            [updatedFirstName, updatedLastName, updatedPhone, updatedEmail, updatedProfileImage, employee_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Nothing was updated" });
        }

        res.status(200).json({ message: "Employee profile updated successfully by admin" });
    } catch (err) {
        console.error("Error updating employee profile by admin:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

const deleteEmployeeProfileByAdmin = asyncHandler(async (req, res) => {
    const admin_id = req.user.admin_id; // admin making the request
    const { employee_id } = req.params;

    if (!admin_id) {
        return res.status(401).json({ message: "Unauthorized: Only admins can delete employee profiles" });
    }
    if (!employee_id) {
        return res.status(400).json({ message: "Missing required field: employee_id" });
    }

    try {
        // Step 1: Check if employee exists
        const [existingRows] = await db.query(
            `SELECT employee_id FROM company_employees WHERE employee_id = ?`,
            [employee_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Step 2: Delete employee record
        const [result] = await db.query(
            `DELETE FROM company_employees WHERE employee_id = ?`,
            [employee_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Employee could not be deleted" });
        }

        res.status(200).json({ message: "Employee profile deleted successfully by admin" });
    } catch (err) {
        console.error("Error deleting employee profile by admin:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

const getAdminCreatedPackages = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(`
                SELECT
                    sc.service_categories_id AS service_category_id,
                    sc.serviceCategory AS service_category_name,
                    s.service_id,
                    s.serviceName AS service_name,
                    s.serviceFilter,
                    p.package_id,
                    p.packageName,
                    p.packageMedia,
                    st.service_type_id,
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
                    pa.addonTime AS addon_time_required,
                    pcf.consent_id,
                    pcf.question AS consent_question,
                    pcf.is_required AS consent_is_required,
                    bp.preference_id,
                    bp.preferenceValue,
                    bp.preferencePrice,
                    bp.is_required AS preference_is_required,
                    bp.preferenceGroup
                FROM services s
                JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id
                LEFT JOIN service_type st ON st.service_id = s.service_id
                LEFT JOIN packages p ON p.service_type_id = st.service_type_id
                LEFT JOIN package_items pi ON pi.package_id = p.package_id
                LEFT JOIN package_addons pa ON pa.package_item_id = pi.item_id
                LEFT JOIN package_consent_forms pcf ON pcf.package_item_id = pi.item_id
                LEFT JOIN booking_preferences bp ON bp.package_item_id = pi.item_id
                WHERE p.package_id IS NOT NULL
                ORDER BY s.service_id DESC, p.package_id, pi.item_id, bp.preferenceGroup
            `);

        const servicesMap = new Map();

        for (const row of rows) {
            if (!servicesMap.has(row.service_id)) {
                servicesMap.set(row.service_id, {
                    service_category_id: row.service_category_id,
                    service_category_name: row.service_category_name,
                    service_id: row.service_id,
                    service_name: row.service_name,
                    service_filter: row.serviceFilter,
                    packages: new Map()
                });
            }
            const service = servicesMap.get(row.service_id);

            if (row.package_id) {
                if (!service.packages.has(row.package_id)) {
                    service.packages.set(row.package_id, {
                        package_id: row.package_id,
                        packageName: row.packageName,
                        packageMedia: row.packageMedia,
                        service_type_id: row.service_type_id,
                        sub_packages: new Map()
                    });
                }
                const pkg = service.packages.get(row.package_id);

                // Sub-packages
                if (row.sub_package_id) {
                    if (!pkg.sub_packages.has(row.sub_package_id)) {
                        pkg.sub_packages.set(row.sub_package_id, {
                            sub_package_id: row.sub_package_id,
                            item_name: row.item_name,
                            description: row.sub_description,
                            price: row.sub_price,
                            time_required: row.sub_time_required,
                            item_media: row.item_media,
                            addons: [],
                            preferences: {},   // grouped by preferenceGroup with group-level is_required
                            consentForm: []
                        });
                    }
                    const sp = pkg.sub_packages.get(row.sub_package_id);

                    // Preferences grouped by preferenceGroup
                    if (row.preference_id != null) {
                        const groupKey = row.preferenceGroup;

                        // Initialize group if not exists
                        if (!sp.preferences[groupKey]) {
                            sp.preferences[groupKey] = {
                                is_required: row.preference_is_required, // group-level
                                items: []
                            };
                        }

                        // Add preference under group
                        if (!sp.preferences[groupKey].items.some(p => p.preference_id === row.preference_id)) {
                            sp.preferences[groupKey].items.push({
                                preference_id: row.preference_id,
                                preference_value: row.preferenceValue,
                                preference_price: row.preferencePrice
                            });
                        }
                    }

                    // Addons
                    if (row.addon_id && !sp.addons.some(a => a.addon_id === row.addon_id)) {
                        sp.addons.push({
                            addon_id: row.addon_id,
                            addon_name: row.addon_name,
                            description: row.addon_description,
                            price: row.addon_price,
                            time_required: row.addon_time_required
                        });
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
        }

        const result = Array.from(servicesMap.values()).map(s => ({
            ...s,
            packages: Array.from(s.packages.values()).map(p => ({
                ...p,
                sub_packages: Array.from(p.sub_packages.values())
            }))
        }));

        res.status(200).json({
            message: "Admin packages fetched successfully",
            result
        });
    } catch (error) {
        console.error("Error fetching admin-created packages:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});


module.exports = {
    getAdminProfile,
    editAdminProfile,
    getVendor,
    getAllServiceType,
    getUsers,
    updateUserByAdmin,
    getBookings,
    createPackageByAdmin,
    assignPackageToVendor,
    editPackageByAdmin,
    deletePackageByAdmin,
    deletePackageByAdmin,
    getAllPayments,
    getAllPackages,
    getAllEmployeesForAdmin,
    getAllVendorPackageRequests,
    updateVendorPackageRequestStatus,
    toggleManualVendorAssignmentByAdmin,
    removeVendorPackageByAdmin,
    deleteUserByAdmin,
    editEmployeeProfileByAdmin,
    deleteEmployeeProfileByAdmin,
    getPackageList,
    getPackageDetails,
    getAdminCreatedPackages
};
