const { db } = require("../config/db");
const vendorGetQueries = require("../config/vendorQueries/vendorGetQueries");
const vendorPostQueries = require("../config/vendorQueries/vendorPostQueries");
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const getServiceTypesByServiceId = asyncHandler(async (req, res) => {
    const { service_id } = req.params;

    if (!service_id) {
        return res.status(400).json({ message: "service_id is required." });
    }

    const [types] = await db.query(
        `SELECT service_type_id, serviceTypeName, serviceTypeMedia
         FROM service_type
         WHERE service_id = ?`,
        [service_id]
    );

    res.status(200).json({
        message: "Service types fetched successfully.",
        service_id,
        service_types: types
    });
});

//====================================================================================================

const applyPackagesToVendor = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const vendor_id = req.user.vendor_id;
        const { selectedPackages } = req.body;

        if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
            throw new Error("At least one package must be provided.");
        }

        for (const pkg of selectedPackages) {
            const { package_id, sub_package_ids = [], preference_ids = [] } = pkg;

            if (!package_id) throw new Error("Each package must include package_id");

            // ✅ Check package exists
            const [packageExists] = await connection.query(
                `SELECT package_id FROM packages WHERE package_id = ?`,
                [package_id]
            );
            if (packageExists.length === 0) {
                throw new Error(`Package ID ${package_id} does not exist`);
            }

            // ✅ Store application for admin approval
            const [result] = await connection.query(
                `INSERT INTO vendor_package_applications (vendor_id, package_id) VALUES (?, ?)`,
                [vendor_id, package_id]
            );

            const application_id = result.insertId;

            // ✅ Store sub-packages (if any)
            if (Array.isArray(sub_package_ids) && sub_package_ids.length > 0) {
                for (const subId of sub_package_ids) {
                    await connection.query(
                        `INSERT INTO vendor_sub_packages_application (application_id, sub_package_id) VALUES (?, ?)`,
                        [application_id, subId]
                    );
                }
            }

            // ✅ Store preferences (if any)
            if (Array.isArray(preference_ids) && preference_ids.length > 0) {
                for (const prefId of preference_ids) {
                    await connection.query(
                        `INSERT INTO vendor_preferences_application (application_id, preference_id) VALUES (?, ?)`,
                        [application_id, prefId]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        // ✅ Send email notification to admin
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"Vendor System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: "New Package Application Submitted",
            html: `
                <p><strong>Vendor ID:</strong> ${vendor_id}</p>
                <p>has applied for the following packages:</p>
                <ul>
                    ${selectedPackages.map(p => `
                        <li>
                            Package ID: ${p.package_id} <br>
                            Sub-packages: ${p.sub_package_ids?.join(", ") || "None"} <br>
                            Preferences: ${p.preference_ids?.join(", ") || "None"}
                        </li>
                    `).join("")}
                </ul>
            `
        });

        res.status(200).json({
            message: "Package application submitted for admin approval.",
            submitted: selectedPackages
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Apply vendor packages error:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

//====================================================================================================


const getServiceTypesByVendor = asyncHandler(async (req, res) => {
    const { vendor_id } = req.user;

    try {
        const [serviceTypes] = await db.query(vendorGetQueries.getServiceTypesByVendorId, [vendor_id]);
        res.status(200).json(serviceTypes);
    } catch (err) {
        console.error("Error fetching service types:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
});

const getVendorService = asyncHandler(async (req, res) => {
    const { vendor_id, vendor_type } = req.user;

    try {
        const query = vendor_type === "individual"
            ? vendorGetQueries.getIndividualVendorServices
            : vendorGetQueries.getCompanyVendorServices;

        const [services] = await db.query(query, [vendor_id]);

        return res.status(200).json({
            message: "Registered services fetched successfully",
            services
        });
    } catch (err) {
        console.error("Error fetching vendor services:", err);
        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        });
    }
});

const getProfileVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        // Step 1: Fetch profile
        const [rows] = await db.query(vendorGetQueries.getProfileVendor, [vendor_id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "Vendor profile not found" });
        }

        // Step 2: Fetch certificates
        const [certificatesRaw] = await db.query(vendorGetQueries.getCertificate, [vendor_id]);

        // Step 3: Clean profile data (remove nulls)
        const profile = {};
        for (const key in rows[0]) {
            if (rows[0][key] !== null) {
                profile[key] = rows[0][key];
            }
        }

        // Step 4: Filter certificate fields
        const certificates = (certificatesRaw || []).map(cert => ({
            certificateName: cert.certificateName,
            certificateFile: cert.certificateFile
        }));

        // Step 5: Attach cleaned certificates
        profile.certificates = certificates;

        // Step 6: Send response
        res.status(200).json({
            message: "Vendor profile fetched successfully",
            profile
        });

    } catch (err) {
        console.error("Error fetching vendor profile:", err);
        res.status(500).json({
            error: "Internal server error",
            details: err.message
        });
    }
});

const updateProfileVendor = asyncHandler(async (req, res) => {
    const { vendor_id, vendor_type } = req.user;
    const {
        name,
        email,
        phone,
        otherInfo,
        googleBusinessProfileLink,
        companyAddress,
        contactPerson,
        birthDate,
        address,
        certificateNames // assume this is an array
    } = req.body;

    let profileImageVendor = req.uploadedFiles?.profileImageVendor?.[0]?.url || null;

    try {
        let existing;

        // 1. Fetch existing details
        if (vendor_type === "individual") {
            [existing] = await db.query(
                `SELECT profileImage, name, address, dob, email, phone, otherInfo FROM individual_details WHERE vendor_id = ?`,
                [vendor_id]
            );
        } else if (vendor_type === "company") {
            [existing] = await db.query(
                `SELECT profileImage, companyName, dob, companyEmail, companyPhone, googleBusinessProfileLink, companyAddress, contactPerson FROM company_details WHERE vendor_id = ?`,
                [vendor_id]
            );
        } else {
            return res.status(400).json({ message: "Invalid vendor type" });
        }

        if (!existing || existing.length === 0) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const current = existing[0];

        // 2. Fallback to old data if any field is not provided
        profileImageVendor = profileImageVendor || current.profileImage;

        if (vendor_type === "individual") {
            await db.query(
                `UPDATE individual_details
                 SET profileImage = ?, name = ?, address = ?, dob = ?, email = ?, phone = ?, otherInfo = ?
                 WHERE vendor_id = ?`,
                [
                    profileImageVendor,
                    name ?? current.name,
                    address ?? current.address,
                    birthDate ?? current.dob,
                    email ?? current.email,
                    phone ?? current.phone,
                    otherInfo ?? current.otherInfo,
                    vendor_id
                ]
            );
        } else if (vendor_type === "company") {
            await db.query(
                `UPDATE company_details
                 SET profileImage = ?, companyName = ?, dob = ?, companyEmail = ?, companyPhone = ?, googleBusinessProfileLink = ?, companyAddress = ?, contactPerson = ?
                 WHERE vendor_id = ?`,
                [
                    profileImageVendor,
                    name ?? current.companyName,
                    birthDate ?? current.dob,
                    email ?? current.companyEmail,
                    phone ?? current.companyPhone,
                    googleBusinessProfileLink ?? current.googleBusinessProfileLink,
                    companyAddress ?? current.companyAddress,
                    contactPerson ?? current.contactPerson,
                    vendor_id
                ]
            );
        }

        // 3. Insert certificates if provided
        if (certificateNames && Array.isArray(certificateNames)) {
            for (let i = 0; i < certificateNames.length; i++) {
                const certName = certificateNames[i];
                const certFile = req.uploadedFiles?.[`certificateFiles_${i}`]?.[0]?.url;

                if (certName && certFile) {
                    await db.query(
                        `INSERT INTO certificates (vendor_id, certificateName, certificateFile) VALUES (?, ?, ?)`,
                        [vendor_id, certName, certFile]
                    );
                }
            }
        }

        res.status(200).json({ message: "Vendor profile and certificates updated successfully" });
    } catch (err) {
        console.error("Error updating vendor profile:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const editServiceType = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const { vendor_id } = req.user;
    const { service_type_id, packages } = req.body;

    try {
        if (!service_type_id || !packages || !Array.isArray(packages)) {
            throw new Error("Service Type ID and packages array are required.");
        }

        for (const pkg of packages) {
            const {
                package_id,
                title,
                description,
                price,
                time_required,
                sub_packages
            } = pkg;

            // Update the package
            await connection.query(
                `UPDATE packages
                 SET packageName = ?, description = ?, totalPrice = ?, totalTime = ?
                 WHERE package_id = ? AND vendor_id = ?`,
                [title, description, price, time_required, package_id, vendor_id]
            );

            // Optional: update sub-packages if provided
            if (Array.isArray(sub_packages)) {
                for (const sub of sub_packages) {
                    const {
                        sub_package_id,
                        title: itemName,
                        description: itemDesc,
                        price: itemPrice,
                        time_required: itemTime
                    } = sub;

                    await connection.query(
                        `UPDATE package_items
                         SET itemName = ?, description = ?, price = ?, timeRequired = ?
                         WHERE item_id = ? AND vendor_id = ?`,
                        [itemName, itemDesc, itemPrice, itemTime, sub_package_id, vendor_id]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Service type packages and items updated successfully."
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error updating service type:", err);
        res.status(500).json({ error: "Failed to update service type", details: err.message });
    }
});

const deletePackage = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const { vendor_id } = req.user;
    const { package_id } = req.params;

    try {
        // Step 1: Check if the package exists and belongs to the vendor
        const [packageRows] = await connection.query(
            `SELECT package_id FROM packages WHERE package_id = ? AND vendor_id = ?`,
            [package_id, vendor_id]
        );

        if (packageRows.length === 0) {
            throw new Error("Package not found or not authorized.");
        }

        // Step 2: Delete booking preferences (if any)
        await connection.query(
            `DELETE FROM booking_preferences WHERE package_id = ?`,
            [package_id]
        );

        // Step 3: Delete package items (if any)
        await connection.query(
            `DELETE FROM package_items WHERE package_id = ? AND vendor_id = ?`,
            [package_id, vendor_id]
        );

        // Step 4: Delete the package itself
        await connection.query(
            `DELETE FROM packages WHERE package_id = ? AND vendor_id = ?`,
            [package_id, vendor_id]
        );

        await connection.commit();
        connection.release();

        res.status(200).json({ message: "Package and related data deleted successfully." });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error deleting package:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const getAvailablePackagesForVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    const {
        service_categories_id,
        service_id,
        service_type_id
    } = req.query; // Filter via query params

    try {
        const conditions = [];
        const params = [vendor_id];

        if (service_categories_id) {
            conditions.push("sc.service_categories_id = ?");
            params.push(service_categories_id);
        }
        if (service_id) {
            conditions.push("s.service_id = ?");
            params.push(service_id);
        }
        if (service_type_id) {
            conditions.push("st.service_type_id = ?");
            params.push(service_type_id);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const [rows] = await db.query(`
        SELECT
          sc.service_categories_id,
          sc.serviceCategory,

          s.service_id,
          s.serviceName,

          st.service_type_id,
          st.serviceTypeName,
          st.serviceTypeMedia,

          COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'package_id', p.package_id,
                'packageName', p.packageName,
                'packageMedia', p.packageMedia,
                'description', p.description,
                'totalPrice', p.totalPrice,
                'totalTime', p.totalTime,
                'is_applied', IF(vp.vendor_id IS NOT NULL, 1, 0),
                'subPackages', IFNULL((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'sub_package_id', pi.item_id,
                      'itemName', pi.itemName,
                      'itemMedia', pi.itemMedia,
                      'description', pi.description,
                      'price', pi.price,
                      'timeRequired', pi.timeRequired
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
            LEFT JOIN vendor_packages vp ON vp.package_id = p.package_id AND vp.vendor_id = ?
            WHERE p.service_type_id = st.service_type_id
          ), '[]') AS packages

        FROM service_categories sc
        JOIN services s ON s.service_categories_id = sc.service_categories_id
        JOIN service_type st ON st.service_id = s.service_id

        ${whereClause}

        GROUP BY st.service_type_id
        ORDER BY sc.serviceCategory, s.serviceName, st.serviceTypeName DESC
      `, params);

        const parsed = rows.map(row => {
            let packages = [];
            try {
                packages = JSON.parse(row.packages || '[]').map(pkg => ({
                    ...pkg,
                    subPackages: typeof pkg.subPackages === 'string'
                        ? JSON.parse(pkg.subPackages || '[]')
                        : (pkg.subPackages || []),
                    preferences: typeof pkg.preferences === 'string'
                        ? JSON.parse(pkg.preferences || '[]')
                        : (pkg.preferences || [])
                }));
            } catch (e) {
                console.warn(`⚠️ Failed to parse packages for service_type_id ${row.service_type_id}:`, e.message);
            }

            return {
                ...row,
                packages
            };
        });

        res.status(200).json({
            message: "packages",
            data: parsed
        });

    } catch (err) {
        console.error("Vendor package fetch error:", err);
        res.status(500).json({ error: "Failed to fetch vendor packages", details: err.message });
    }
});

const getAllPackagesForVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [rows] = await db.query(`
        SELECT
          sc.service_categories_id,
          sc.serviceCategory,

          s.service_id,
          s.serviceName,

          st.service_type_id,
          st.serviceTypeName,
          st.serviceTypeMedia,

          -- Packages grouped per service_type
          COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'package_id', p.package_id,
                'packageName', p.packageName,
                'packageMedia', p.packageMedia,
                'description', p.description,
                'totalPrice', p.totalPrice,
                'totalTime', p.totalTime,
                'is_applied', IF(vp.vendor_id IS NOT NULL, 1, 0),
                'subPackages', IFNULL((
                  SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                      'sub_package_id', pi.item_id,
                      'itemName', pi.itemName,
                      'itemMedia', pi.itemMedia,
                      'description', pi.description,
                      'price', pi.price,
                      'timeRequired', pi.timeRequired
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
            LEFT JOIN vendor_packages vp ON vp.package_id = p.package_id AND vp.vendor_id = ?
            WHERE p.service_type_id = st.service_type_id
          ), '[]') AS packages

        FROM service_categories sc
        JOIN services s ON s.service_categories_id = sc.service_categories_id
        JOIN service_type st ON st.service_id = s.service_id

        GROUP BY st.service_type_id
        ORDER BY sc.serviceCategory, s.serviceName, st.serviceTypeName DESC
      `, [vendor_id]);

        // Final parsing of nested packages
        const parsed = rows.map(row => {
            let packages = [];
            try {
                packages = JSON.parse(row.packages || '[]').map(pkg => ({
                    ...pkg,
                    subPackages: typeof pkg.subPackages === 'string'
                        ? JSON.parse(pkg.subPackages || '[]')
                        : (pkg.subPackages || []),
                    preferences: typeof pkg.preferences === 'string'
                        ? JSON.parse(pkg.preferences || '[]')
                        : (pkg.preferences || [])
                }));
            } catch (e) {
                console.warn(`⚠️ Failed to parse packages for service_type_id ${row.service_type_id}:`, e.message);
            }

            return {
                ...row,
                packages
            };
        });

        res.status(200).json({
            message: "packages",
            data: parsed
        });

    } catch (err) {
        console.error("Vendor package fetch error:", err);
        res.status(500).json({ error: "Failed to fetch vendor packages", details: err.message });
    }
});

const getVendorAssignedPackages = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    try {
        const [rows] = await db.query(`
            SELECT
                service_type.service_type_id,
                service_type.serviceTypeName,
                service_type.serviceTypeMedia,

                service.service_id,
                service.serviceName,

                service_category.service_categories_id,
                service_category.serviceCategory,

                COALESCE((
                    SELECT CONCAT('[', GROUP_CONCAT(
                        JSON_OBJECT(
                            'package_id', package_table.package_id,
                            'title', package_table.packageName,
                            'description', package_table.description,
                            'price', package_table.totalPrice,
                            'time_required', package_table.totalTime,
                            'package_media', package_table.packageMedia,

                            -- ✅ Sub-packages
                            'sub_packages', IFNULL((
                                SELECT CONCAT('[', GROUP_CONCAT(
                                    JSON_OBJECT(
                                        'sub_package_id', package_item.item_id,
                                        'title', package_item.itemName,
                                        'description', package_item.description,
                                        'price', package_item.price,
                                        'time_required', package_item.timeRequired,
                                        'item_media', package_item.itemMedia
                                    )
                                ), ']')
                                FROM package_items AS package_item
                                WHERE package_item.package_id = package_table.package_id
                            ), '[]'),

                            -- ✅ Preferences
                            'preferences', IFNULL((
                                SELECT CONCAT('[', GROUP_CONCAT(
                                    JSON_OBJECT(
                                        'preference_id', booking_preference.preference_id,
                                        'preference_value', booking_preference.preferenceValue
                                    )
                                ), ']')
                                FROM booking_preferences AS booking_preference
                                WHERE booking_preference.package_id = package_table.package_id
                            ), '[]')
                        )
                    ), ']')
                    FROM packages AS package_table
                    JOIN vendor_packages AS vendor_package_link ON vendor_package_link.package_id = package_table.package_id
                    WHERE package_table.service_type_id = service_type.service_type_id AND vendor_package_link.vendor_id = ?
                ), '[]') AS packages

            FROM service_type
            JOIN services AS service ON service.service_id = service_type.service_id
            JOIN service_categories AS service_category ON service_category.service_categories_id = service.service_categories_id

            WHERE EXISTS (
                SELECT 1 FROM vendor_packages AS vendor_package_check
                JOIN packages AS package_check ON package_check.package_id = vendor_package_check.package_id
                WHERE package_check.service_type_id = service_type.service_type_id AND vendor_package_check.vendor_id = ?
            )

            ORDER BY service_type.service_type_id DESC
        `, [vendorId, vendorId]);

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
            message: "Vendor's assigned/applied packages fetched successfully",
            result
        });
    } catch (err) {
        console.error("Error fetching vendor packages:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

const addRatingToPackages = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { service_id, package_id, rating, review } = req.body;

    if (!vendor_id || !package_id || !rating) {
        return res.status(400).json({
            message: "Vendor ID from token, Package ID, and Rating are required"
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        const [assigned] = await db.query(`
            SELECT vendor_packages_id FROM vendor_packages
            WHERE vendor_id = ? AND package_id = ?
        `, [vendor_id, package_id]);

        if (assigned.length === 0) {
            return res.status(403).json({ message: "This package is not assigned to you." });
        }

        // ✅ Check for duplicate rating
        const [existing] = await db.query(`
            SELECT rating_id FROM ratings
            WHERE vendor_id = ? AND package_id = ?
        `, [vendor_id, package_id]);

        if (existing.length > 0) {
            return res.status(400).json({ message: "You have already rated this package." });
        }

        await db.query(`
            INSERT INTO ratings (vendor_id, service_id, package_id, rating, review)
            VALUES (?, ?, ?, ?, ?)
        `, [
            vendor_id,
            service_id || null,
            package_id,
            rating,
            review || null
        ]);

        res.status(201).json({ message: "Rating submitted successfully by vendor." });

    } catch (error) {
        console.error("Error submitting vendor package rating:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const toggleManualVendorAssignment = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { value } = req.body;

    if (![0, 1].includes(value)) {
        return res.status(400).json({ message: "Value must be 0 (off) or 1 (on)" });
    }

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    try {
        await db.query(`
            INSERT INTO vendor_settings (vendor_id, manual_assignment_enabled)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                manual_assignment_enabled = VALUES(manual_assignment_enabled)
        `, [vendor_id, value]);


        try {
            const messageText = `Vendor ID ${vendor_id} has turned manual assignment ${value === 1 ? 'ON (disabled)' : 'OFF (enabled)'}.`;

            await db.query(`
            INSERT INTO notifications (title, body, is_read, sent_at, user_type)
            VALUES (?, ?, 0, NOW(), 'admin')
        `, [
                'Vendor Manual Assignment Update',
                messageText
            ]);
        } catch (err) {
            console.error("Failed to create admin notification:", err);
        }


        res.status(200).json({
            message: `Manual assignment for vendor ${vendor_id} is now ${value === 1 ? 'ON (disabled)' : 'OFF (enabled)'}`,
            vendor_id,
            manual_assignment_enabled: value
        });

    } catch (err) {
        console.error("Error toggling manual vendor assignment:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getManualAssignmentStatus = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id || req.query.vendor_id;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    try {
        const [result] = await db.query(
            `SELECT manual_assignment_enabled FROM vendor_settings WHERE vendor_id = ? LIMIT 1`,
            [vendor_id]
        );

        res.status(200).json({
            vendor_id,
            value: result[0]?.manual_assignment_enabled ?? 0
        });

    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const getVendorFullPaymentHistory = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(400).json({ message: "Vendor ID is required" });
    }

    try {
        const [bookings] = await db.query(
            `SELECT
                sb.booking_id,
                sb.service_categories_id,
                sb.service_id,
                sb.vendor_id,
                sb.assigned_employee_id,
                sb.user_id,
                sb.bookingDate,
                sb.bookingTime,
                sb.bookingStatus,
                sb.payment_intent_id,
                sb.notes,
                sb.bookingMedia,
                sb.created_at,

                -- User Info
                CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, '')) AS user_name,
                u.email AS user_email,
                u.phone AS user_phone,
                
                -- Vendor Info
                v.vendorType,

                cdet.contactPerson,

                COALESCE(idet.name, cdet.companyName) AS vendor_name,
                COALESCE(idet.email, cdet.companyEmail) AS vendor_email,
                COALESCE(idet.phone, cdet.companyPhone) AS vendor_phone,

                -- Package Info
                pkg.package_id,
                pkg.packageName,
                pkg.totalPrice,
                pkg.totalTime

            FROM service_booking sb

            JOIN users u ON sb.user_id = u.user_id
            JOIN vendors v ON sb.vendor_id = v.vendor_id

            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id AND v.vendorType = 'individual'
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id AND v.vendorType = 'company'

            LEFT JOIN service_booking_packages sbp ON sbp.booking_id = sb.booking_id
            LEFT JOIN packages pkg ON pkg.package_id = sbp.package_id

            WHERE sb.vendor_id = ? AND sb.payment_intent_id IS NOT NULL

            ORDER BY sb.created_at DESC`,
            [vendor_id]
        );

        const enriched = [];

        for (const booking of bookings) {
            let stripeData = null;

            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(booking.payment_intent_id, {
                    expand: ['charges.data.payment_method_details']
                });

                const charge = paymentIntent.charges?.data?.[0];

                if (charge) {
                    stripeData = {
                        charge_id: charge.id,
                        amount: charge.amount / 100,
                        currency: charge.currency,
                        status: charge.status,
                        receipt_url: charge.receipt_url,
                        card_brand: charge.payment_method_details?.card?.brand,
                        last4: charge.payment_method_details?.card?.last4,
                        card_country: charge.payment_method_details?.card?.country,
                        billing_name: charge.billing_details?.name,
                        billing_email: charge.billing_details?.email,
                        metadata: charge.metadata || {}
                    };
                }
            } catch (err) {
                console.warn(`Stripe error for intent ${booking.payment_intent_id}: ${err.message}`);
            }

            enriched.push({
                ...booking,
                stripe_payment: stripeData
            });
        }

        res.status(200).json({
            vendor_id,
            total: enriched.length,
            bookings: enriched
        });

    } catch (err) {
        console.error("Error fetching vendor history:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const updateBookingStatusByVendor = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { booking_id, status } = req.body;

    // ✅ Validate input
    if (!booking_id || ![3, 4].includes(status)) {
        return res.status(400).json({ message: "Invalid booking ID or status" });
    }

    try {
        // 🔐 Check if the booking is assigned to the current vendor
        const [checkBooking] = await db.query(
            `SELECT sb.booking_id, 
              sb.vendor_id, 
              sb.user_id,
              p.status AS payment_status
       FROM service_booking sb
       LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
       WHERE sb.booking_id = ? AND sb.vendor_id = ?`,
            [booking_id, vendor_id]
        );

        if (checkBooking.length === 0) {
            return res.status(403).json({ message: "Unauthorized or booking not assigned to this vendor" });
        }

        const { payment_status, user_id } = checkBooking[0];

        // if (payment_status !== 'completed') {
        //     return res.status(400).json({ message: "Cannot start or complete service. Payment is not complete." });
        // }

        // ✅ Determine completed_flag
        const completed_flag = status === 4 ? 1 : 0;

        // ✅ Update the booking status and completed flag
        await db.query(
            `UPDATE service_booking SET bookingStatus = ?, completed_flag = ? WHERE booking_id = ?`,
            [status, completed_flag, booking_id]
        );

        try {
            // ✅ Create notification
            const notificationTitle = status === 3
                ? "Your service has started"
                : "Your service has been completed";

            const notificationBody = status === 3
                ? `Your service for booking ID ${booking_id} has been started by the vendor.`
                : `Your service for booking ID ${booking_id} has been completed by the vendor.`;


            await db.query(
                `INSERT INTO notifications (user_type, user_id, title, body)
             VALUES (?, ?, ?, ?)`,
                ['users', user_id, notificationTitle, notificationBody]
            );

        } catch (err) {
            console.error("Error creating notification:", err)
        }

        res.status(200).json({
            message: `Booking marked as ${status === 3 ? 'started' : 'completed'} successfully`
        });

    } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});



module.exports = {
    getVendorAssignedPackages,
    applyPackagesToVendor,
    getServiceTypesByVendor,
    getVendorService,
    getProfileVendor,
    updateProfileVendor,
    editServiceType,
    getServiceTypesByServiceId,
    deletePackage,
    getAvailablePackagesForVendor,
    getAllPackagesForVendor,
    addRatingToPackages,
    toggleManualVendorAssignment,
    getManualAssignmentStatus,
    getVendorFullPaymentHistory,
    updateBookingStatusByVendor
};
