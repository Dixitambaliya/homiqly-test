const { db } = require("../config/db");
const vendorGetQueries = require("../config/vendorQueries/vendorGetQueries");
const vendorPostQueries = require("../config/vendorQueries/vendorPostQueries");
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const bookingGetQueries = require("../config/bookingQueries/bookingGetQueries")

const getServicesWithPackages = asyncHandler(async (req, res) => {
    try {
        // 1️⃣ Fetch services with their packages
        const [rows] = await db.query(`
                SELECT 
                    sc.service_categories_id AS serviceCategoryId,
                    sc.serviceCategory AS categoryName,
                    s.service_id AS serviceId,
                    s.serviceName AS serviceName,
                    s.serviceDescription AS serviceDescription,
                    s.serviceFilter AS serviceFilter,
                    st.service_type_id AS serviceTypeId,
                    p.package_id,
                    p.packageName AS packageName
                FROM service_categories sc
                JOIN services s ON s.service_categories_id = sc.service_categories_id
                JOIN service_type st ON st.service_id = s.service_id
                JOIN packages p ON p.service_type_id = st.service_type_id
                WHERE p.package_id IS NOT NULL
                ORDER BY sc.service_categories_id, s.service_id, st.service_type_id, p.package_id;
        `);

        // 2️⃣ Fetch all sub-packages (package_items)
        const [subPackageRows] = await db.query(`
            SELECT 
                item_id,
                package_id,
                itemName AS itemName
            FROM package_items
        `);

        // Map sub-packages by packageId for fast lookup
        const subPackagesMap = {};
        subPackageRows.forEach(sub => {
            if (!subPackagesMap[sub.package_id]) subPackagesMap[sub.package_id] = [];
            subPackagesMap[sub.package_id].push({
                item_id: sub.item_id,
                itemName: sub.itemName,
                timeRequired: sub.timeRequired
            });
        });

        // 3️⃣ Group by category → services → packages → sub-packages
        const grouped = {};

        rows.forEach(row => {
            const categoryId = row.serviceCategoryId;
            if (!grouped[categoryId]) {
                grouped[categoryId] = {
                    serviceCategoryId: categoryId,
                    categoryName: row.categoryName,
                    services: []
                };
            }

            // Find or create service
            let service = grouped[categoryId].services.find(s => s.serviceId === row.serviceId);
            if (!service) {
                service = {
                    serviceId: row.serviceId,
                    title: row.serviceName,
                    description: row.serviceDescription,
                    serviceFilter: row.serviceFilter,
                    packages: []
                };
                grouped[categoryId].services.push(service);
            }

            // Add package to service
            const packageExists = service.packages.find(p => p.package_id === row.package_id);
            if (!packageExists && row.package_id) {
                service.packages.push({
                    package_id: row.package_id,
                    packageName: row.packageName,
                    sub_packages: subPackagesMap[row.package_id] || []
                });
            }
        });

        // Only return categories with at least one service with packages
        const result = Object.values(grouped).filter(category => category.services.length > 0);

        res.status(200).json({ services: result });
    } catch (err) {
        console.error("Error fetching services with packages:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


const getServiceTypesByServiceId = asyncHandler(async (req, res) => {
    const { service_id } = req.params;

    if (!service_id) {
        return res.status(400).json({ message: "service_id is required." });
    }

    const [types] = await db.query(
        `SELECT service_type_id, serviceTypeMedia
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

const applyPackagesToVendor = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const vendor_id = req.user.vendor_id;
        const { selectedPackages } = req.body;

        if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
            throw new Error("At least one package must be provided.");
        }

        // ✅ Fetch vendor details
        const [vendorDetails] = await connection.query(
            `
            SELECT v.vendor_id, v.vendorType, 
                   COALESCE(i.name, c.companyName) AS vendorName,
                   COALESCE(i.email, c.companyEmail) AS vendorEmail
            FROM vendors v
            LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
            LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
            WHERE v.vendor_id = ?
            `,
            [vendor_id]
        );

        if (vendorDetails.length === 0) {
            throw new Error("Vendor not found.");
        }

        const vendorData = vendorDetails[0];
        const appliedPackages = [];

        for (const pkg of selectedPackages) {
            const { package_id, sub_packages = [] } = pkg;
            if (!package_id) throw new Error("Each package must include package_id");

            // ✅ Check package exists
            const [packageExists] = await connection.query(
                `SELECT 
                 package_id 
                 FROM packages WHERE package_id = ?`,
                [package_id]
            );

            if (packageExists.length === 0) {
                throw new Error(`Package ID ${package_id} does not exist`);
            }

            const packageData = packageExists[0];

            // ✅ Store application
            const [insertResult] = await connection.query(
                `INSERT INTO vendor_package_applications (vendor_id, package_id, status) 
                 VALUES (?, ?, 0)`,
                [vendor_id, package_id]
            );

            const application_id = insertResult.insertId;

            // ✅ Store sub-packages if provided
            const storedSubPackages = [];
            if (Array.isArray(sub_packages) && sub_packages.length > 0) {
                for (const sub of sub_packages) {
                    const subId = sub.sub_package_id;
                    await connection.query(
                        `INSERT INTO vendor_package_item_application (application_id, package_item_id) VALUES (?, ?)`,
                        [application_id, subId]
                    );

                    storedSubPackages.push(subId);
                }
            }

            appliedPackages.push({
                ...packageData,
                application_id,
                selected_subpackages: storedSubPackages
            });
        }

        await connection.commit();
        connection.release();

        // ✅ Send admin email (non-blocking)
        try {
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
                    <p><strong>Vendor:</strong> ${vendorData.vendorName} (${vendor_id})</p>
                    <p><strong>Email:</strong> ${vendorData.vendorEmail}</p>
                    <p>has applied for the following packages:</p>
                    <ul>
                        ${appliedPackages.map(p => `
                            <li style="margin-bottom:15px;">
                                <strong>${p.packageName}</strong><br>
                                Sub-Packages: ${p.selected_subpackages.length > 0 ? p.selected_subpackages.join(", ") : "No sub-packages selected"}
                            </li>
                        `).join("")}
                    </ul>
                `
            });
        } catch (mailErr) {
            console.error("Email sending failed:", mailErr.message);
        }

        res.status(200).json({
            message: "Package application submitted for admin approval.",
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Apply vendor packages error:", err);
        res.status(500).json({ error: "Database error", details: err.message });
    }
});

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
    const { packages } = req.body;

    try {
        if (!packages || !Array.isArray(packages)) {
            throw new Error("Packages array is required.");
        }

        for (const pkg of packages) {
            const {
                vendor_packages_id,
                package_id,
                sub_packages
            } = pkg;

            if (!vendor_packages_id || !package_id) {
                throw new Error("vendor_packages_id and package_id are required.");
            }

            // Ensure the vendor actually owns this vendor_packages entry
            const [checkVendorPkg] = await connection.query(
                `SELECT * FROM vendor_packages 
                 WHERE vendor_packages_id = ? AND vendor_id = ? AND package_id = ?`,
                [vendor_packages_id, vendor_id, package_id]
            );

            if (checkVendorPkg.length === 0) {
                throw new Error(`Vendor does not own vendor_packages_id ${vendor_packages_id}`);
            }

            // ---------------- SUB-PACKAGES ----------------
            if (Array.isArray(sub_packages)) {
                for (const sub of sub_packages) {
                    const {
                        sub_package_id,
                        sub_package_name,
                        sub_package_description,
                        sub_package_media
                    } = sub;

                    if (!sub_package_id) {
                        throw new Error("sub_package_id is required for sub_packages update.");
                    }

                    await connection.query(
                        `UPDATE package_items
                         SET itemName = ?, description = ?, itemMedia = ?
                         WHERE item_id = ? AND package_id = ?`,
                        [sub_package_name, sub_package_description, sub_package_media, sub_package_id, package_id]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Service type (vendor packages + sub-packages) updated successfully."
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error updating service type:", err);
        res.status(500).json({
            error: "Failed to update service type",
            details: err.message
        });
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

          COALESCE((
            SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT(
                'package_id', p.package_id,
                'description', p.description,
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
        ORDER BY sc.serviceCategory, s.serviceName DESC
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
        const [rows] = await db.query(vendorGetQueries.getAllPackagesForVendor, [vendor_id]);

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
        // ✅ Fetch packages assigned to vendor
        const [packages] = await db.query(
            `SELECT 
                vp.vendor_packages_id,
                vp.package_id
            FROM vendor_packages vp
            JOIN packages p ON vp.package_id = p.package_id
            WHERE vp.vendor_id = ?`,
            [vendorId]
        );

        if (packages.length === 0) {
            return res.status(200).json({
                message: "No packages assigned to this vendor",
                result: []
            });
        }

        // ✅ Fetch sub-packages for these packages
        const vendorPackageIds = packages.map(p => p.vendor_packages_id);
        const [subPackages] = await db.query(
            `SELECT 
             vpi.vendor_packages_id, 
             vpi.package_item_id, 
             pi.itemName AS sub_package_name,
             pi.itemMedia,
             pi.description
                FROM vendor_package_items vpi
                JOIN package_items pi ON vpi.package_item_id = pi.item_id
                WHERE vpi.vendor_packages_id IN (?)`,
            [vendorPackageIds]
        );

        // ✅ Map sub-packages to their parent packages
        const result = packages.map(pkg => ({
            vendor_packages_id: pkg.vendor_packages_id,
            package_id: pkg.package_id,
            sub_packages: subPackages
                .filter(sp => sp.vendor_packages_id === pkg.vendor_packages_id)
                .map(sp => ({
                    sub_package_id: sp.package_item_id,
                    sub_package_name: sp.sub_package_name,
                    sub_package_media: sp.itemMedia,
                    sub_package_description: sp.description,
                }))
        }));

        res.status(200).json({
            message: "Vendor packages fetched successfully",
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
        const [[vendorRow]] = await db.query(
            bookingGetQueries.getVendorIdForBooking,
            [vendor_id]
        );
        const vendorType = vendorRow?.vendorType || null;

        // ✅ Get latest platform fee for vendorType
        const [platformSettings] = await db.query(
            bookingGetQueries.getPlateFormFee,
            [vendorType]
        );
        const platformFee = Number(platformSettings?.[0]?.platform_fee_percentage ?? 0);

        const [bookings] = await db.query(vendorGetQueries.getVendorFullPayment,
            [platformFee, vendor_id]
        );

        const enriched = [];

        for (const booking of bookings) {

            enriched.push({
                ...booking,
                totalPrice: booking.totalPrice !== null
                    ? parseFloat(booking.totalPrice)
                    : null
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
              sb.bookingDate,
              sb.bookingTime,
              p.status AS payment_status
       FROM service_booking sb
       LEFT JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
       WHERE sb.booking_id = ? AND sb.vendor_id = ?`,
            [booking_id, vendor_id]
        );

        if (checkBooking.length === 0) {
            return res.status(403).json({ message: "Unauthorized or booking not assigned to this vendor" });
        }

        const { payment_status, user_id, bookingDate, bookingTime } = checkBooking[0];

        // ✅ Restrict start time (status = 3) → only within 10 min before start
        if (status === 3) {
            const bookingDateTime = new Date(`${bookingDate} ${bookingTime}`);
            const now = new Date();

            // Allow start only if current time >= booking time - 10 minutes
            const startWindow = new Date(bookingDateTime.getTime() - 10 * 60000);

            if (now < startWindow) {
                return res.status(400).json({
                    message: "You can only start the service within 10 minutes of the booking time."
                });
            }
        }

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

        if (status === 4) {
            notificationTitle = "Your service has been completed";
            notificationBody = `Your service for booking ID ${booking_id} has been completed. Please take a moment to rate your experience.`;
            const ratingLink = `https://homiqly-h81s.vercel.app/checkout/rating`;

            await db.query(
                `INSERT INTO notifications(user_type, user_id, title, body, action_link, is_read, sent_at)
         VALUES(?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                ['users', user_id, notificationTitle, notificationBody, ratingLink]
            );
        } else {
            notificationTitle = "Your service has started";
            notificationBody = `Your service for booking ID ${booking_id} has been started by the vendor`;

            await db.query(
                `INSERT INTO notifications(user_type, user_id, title, body, is_read, sent_at)
         VALUES(?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                ['users', user_id, notificationTitle, notificationBody]
            );
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

const getVendorDashboardStats = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { filterType, startDate, endDate } = req.query;
    // filterType = 'all' | 'weekly' | 'monthly' | 'custom'

    try {
        // ✅ Get vendor type
        const [[vendorRow]] = await db.query(
            bookingGetQueries.getVendorIdForBooking,
            [vendor_id]
        );
        const vendorType = vendorRow?.vendorType || null;

        // ✅ Get platform fee %
        const [platformSettings] = await db.query(
            bookingGetQueries.getPlateFormFee,
            [vendorType]
        );
        const platformFee = Number(platformSettings?.[0]?.platform_fee_percentage ?? 0);

        // ✅ Build WHERE clause for date filters
        let dateFilter = "";
        let params = [vendor_id];

        if (filterType === "weekly") {
            dateFilter = "AND sb.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        } else if (filterType === "monthly") {
            dateFilter = "AND sb.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
        } else if (filterType === "custom" && startDate && endDate) {
            dateFilter = "AND sb.created_at BETWEEN ? AND ?";
            params = [vendor_id, startDate, endDate];
        } // else all-time → no filter

        // ✅ Get bookings summary
        const [[bookingStats]] = await db.query(
            `
                SELECT
                COUNT(*) AS totalBookings,
                    SUM(CASE WHEN sb.bookingStatus = 0 THEN 1 ELSE 0 END) AS pendingBookings,
                        SUM(CASE WHEN sb.bookingStatus = 1 THEN 1 ELSE 0 END) AS completedBookings
            FROM service_booking sb
            WHERE sb.vendor_id = ? ${dateFilter};
                `,
            params
        );

        // ✅ Get earnings
        const [[earnings]] = await db.query(
            `
                SELECT
                CAST(SUM(p.amount * (1 - ? / 100)) AS DECIMAL(10, 2)) AS totalEarnings
            FROM service_booking sb
            JOIN payments p ON sb.payment_intent_id = p.payment_intent_id
            WHERE sb.vendor_id = ? AND p.status = 'completed' ${dateFilter};
                `,
            [platformFee, ...params]
        );

        res.status(200).json({
            message: "Vendor dashboard stats fetched successfully",
            filterType,
            stats: {
                totalBookings: bookingStats.totalBookings || 0,
                pendingBookings: bookingStats.pendingBookings || 0,
                completedBookings: bookingStats.completedBookings || 0,
                totalEarnings: earnings.totalEarnings
                    ? parseFloat(earnings.totalEarnings)
                    : 0
            }
        });
    } catch (error) {
        console.error("Error fetching vendor dashboard stats:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
});

const removeVendorPackage = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id;

    const { vendor_packages_id } = req.params;

    if (!vendor_packages_id) {
        return res.status(400).json({ message: "vendor_packages_id is required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // ✅ Ensure the package belongs to the vendor
        const [rows] = await connection.query(
            `SELECT vendor_packages_id FROM vendor_packages 
             WHERE vendor_packages_id = ? AND vendor_id = ?`,
            [vendor_packages_id, vendorId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Package not found or not owned by this vendor" });
        }

        // ✅ Delete related sub-packages first
        await connection.query(
            `DELETE FROM vendor_package_items WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        // ✅ Delete the vendor package
        await connection.query(
            `DELETE FROM vendor_packages WHERE vendor_packages_id = ? AND vendor_id = ?`,
            [vendor_packages_id, vendorId]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: "Vendor package removed successfully"
        });
    } catch (err) {
        await connection.rollback();
        console.error("Error removing vendor package:", err);
        res.status(500).json({
            success: false,
            message: "Failed to remove vendor package",
            error: err.message
        });
    } finally {
        connection.release();
    }
});

const editEmployeeProfileByCompany = asyncHandler(async (req, res) => {
    const vendorId = req.user.vendor_id; // company/vendor admin id
    const { employee_id } = req.params

    const { first_name, last_name, phone, email } = req.body;

    if (!vendorId) {
        return res.status(401).json({ message: "Unauthorized: vendor_id missing" });
    }
    if (!employee_id) {
        return res.status(400).json({ message: "Missing required field: employee_id" });
    }

    const newProfileImage = req.uploadedFiles?.profile_image?.[0]?.url || null;

    try {
        // Step 1: Fetch employee and check if belongs to this vendor/company
        const [existingRows] = await db.query(
            `SELECT first_name, last_name, phone, email, profile_image 
             FROM company_employees 
             WHERE employee_id = ? AND vendor_id = ?`,
            [employee_id, vendorId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Employee not found or does not belong to your company" });
        }

        const existing = existingRows[0];

        // Step 2: Merge with new values
        const updatedFirstName = first_name || existing.first_name;
        const updatedLastName = last_name || existing.last_name;
        const updatedPhone = phone || existing.phone;
        const updatedEmail = email || existing.email;
        const updatedProfileImage = newProfileImage || existing.profile_image;

        // Step 3: Update employee record
        const [result] = await db.query(
            `UPDATE company_employees
             SET first_name = ?, last_name = ?, phone = ?, email = ?, profile_image = ?
             WHERE employee_id = ? AND vendor_id = ?`,
            [updatedFirstName, updatedLastName, updatedPhone, updatedEmail, updatedProfileImage, employee_id, vendorId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Nothing was updated" });
        }

        res.status(200).json({ message: "Employee profile updated successfully" });
    } catch (err) {
        console.error("Error updating employee profile by company:", err);
        res.status(500).json({ message: "Internal server error" });
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
    updateBookingStatusByVendor,
    getVendorDashboardStats,
    removeVendorPackage,
    editEmployeeProfileByCompany,
    getServicesWithPackages
};
