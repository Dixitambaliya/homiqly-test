const { db } = require("../config/db");
const vendorGetQueries = require("../config/vendorQueries/vendorGetQueries");
const vendorPostQueries = require("../config/vendorQueries/vendorPostQueries");

const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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

const applyPackagesToVendor = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const vendor_id = req.user.vendor_id;
        const { packageIds } = req.body;

        if (!Array.isArray(packageIds) || packageIds.length === 0) {
            throw new Error("At least one package ID must be provided.");
        }

        // Optional: Prevent duplicate inserts
        const [existing] = await connection.query(
            `SELECT package_id FROM vendor_packages WHERE vendor_id = ?`,
            [vendor_id]
        );

        const existingPackageIds = new Set(existing.map(p => p.package_id));
        const newPackageIds = packageIds.filter(id => !existingPackageIds.has(id));

        if (newPackageIds.length === 0) {
            return res.status(400).json({ message: "All selected packages are already applied." });
        }

        for (const package_id of newPackageIds) {
            await connection.query(
                `INSERT INTO vendor_packages (vendor_id, package_id) VALUES (?, ?)`,
                [vendor_id, package_id]
            );
        }

        await connection.commit();
        connection.release();

        res.status(200).json({
            message: "Packages successfully applied to vendor",
            applied: newPackageIds
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
        // 1. Get existing profile image if not updated
        if (!profileImageVendor) {
            const [existing] = await db.query(
                vendor_type === "individual"
                    ? `SELECT profileImage FROM individual_details WHERE vendor_id = ?`
                    : `SELECT profileImage FROM company_details WHERE vendor_id = ?`,
                [vendor_id]
            );
            profileImageVendor = existing[0]?.profileImage || null;
        }

        // 2. Update individual or company details
        if (vendor_type === "individual") {
            await db.query(
                `UPDATE individual_details
                 SET profileImage = ?, name = ?, address = ?, dob = ?, email = ?, phone = ?, otherInfo = ?
                 WHERE vendor_id = ?`,
                [profileImageVendor, name, address, birthDate, email, phone, otherInfo, vendor_id]
            );
        } else if (vendor_type === "company") {
            await db.query(
                `UPDATE company_details
                 SET profileImage = ?, companyName = ?, address = ?, dob = ?, companyEmail = ?, companyPhone = ?, googleBusinessProfileLink = ?, companyAddress = ?, contactPerson = ?
                 WHERE vendor_id = ?`,
                [profileImageVendor, name, address, birthDate, email, phone, googleBusinessProfileLink, companyAddress, contactPerson, vendor_id]
            );
        } else {
            return res.status(400).json({ message: "Invalid vendor type" });
        }

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
    const vendor_id = req.user.vendor_id;

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
                                        'title', pi.itemName,
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
                    JOIN vendor_packages vp ON vp.package_id = p.package_id
                    WHERE p.service_type_id = st.service_type_id AND vp.vendor_id = ?
                ), '[]') AS packages

            FROM service_type st
            JOIN services s ON s.service_id = st.service_id
            JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id

            WHERE EXISTS (
                SELECT 1 FROM vendor_packages vp
                JOIN packages p ON p.package_id = vp.package_id
                WHERE p.service_type_id = st.service_type_id AND vp.vendor_id = ?
            )

            ORDER BY st.service_type_id DESC
        `, [vendor_id, vendor_id]);

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
    getAllPackagesForVendor
};
