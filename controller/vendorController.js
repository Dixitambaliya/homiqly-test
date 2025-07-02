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

const getVendorServices = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [rows] = await db.query(vendorGetQueries.getVendorService, [vendor_id]);

        if (!rows.length) {
            return res.status(404).json({ message: "No services found for this vendor." });
        }

        const servicesMap = new Map();

        for (const row of rows) {
            const serviceTypeId = row.service_type_id;
            const packageId = row.package_id;
            const itemId = row.item_id;
            const preferenceValue = row.preferenceValue;

            // 1. Create service
            if (!servicesMap.has(serviceTypeId)) {
                servicesMap.set(serviceTypeId, {
                    service_type_id: serviceTypeId,
                    is_approved: row.is_approved,
                    serviceType: row.serviceTypeName,
                    serviceTypeMedia: row.serviceTypeMedia,
                    serviceId: row.serviceId,
                    serviceName: row.serviceName,
                    category_id: row.category_id,
                    categoryName: row.categoryName,
                    serviceLocation: row.serviceLocation,
                    serviceDescription: row.serviceDescription,
                    packages: []
                });
            }

            const serviceEntry = servicesMap.get(serviceTypeId);

            // 2. Create or find package
            let packageEntry = serviceEntry.packages.find(p => p.package_id === packageId);
            if (!packageEntry && packageId) {
                packageEntry = {
                    package_id: packageId,
                    title: row.packageName,
                    description: row.packageDescription,
                    price: parseFloat(row.totalPrice),
                    time_required: row.totalTime,
                    package_media: row.packageMedia,
                    sub_packages: [],
                    preferences: []
                };
                serviceEntry.packages.push(packageEntry);
            }

            // 3. Add item if exists
            if (packageEntry && itemId) {
                const existingItem = packageEntry.sub_packages.find(i => i.sub_package_id === itemId);
                if (!existingItem) {
                    packageEntry.sub_packages.push({
                        sub_package_id: itemId,
                        title: row.itemName,
                        description: row.itemDescription,
                        item_images: row.itemMedia,
                        price: parseFloat(row.itemPrice),
                        time_required: row.timeRequired
                    });
                }
            }

            // 4. Add preference if exists
            if (packageEntry && preferenceValue) {
                if (!packageEntry.preferences.includes(preferenceValue)) {
                    packageEntry.preferences.push(preferenceValue);
                }
            }
        }

        const services = Array.from(servicesMap.values());

        return res.status(200).json({
            vendor_id,
            services
        });

    } catch (error) {
        console.error("Error fetching vendor services:", error);
        return res.status(500).json({ message: "Database error", error: error.message });
    }
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

const vendorSelectOrAddPackage = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const { vendor_id } = req.user;
    const { selected_package_ids, new_packages } = req.body;

    try {
        // Step 1: Map selected admin-defined packages
        if (Array.isArray(selected_package_ids)) {
            for (const pkgId of selected_package_ids) {
                await connection.query(`
                    INSERT IGNORE INTO vendor_packages (vendor_id, package_id)
                    VALUES (?, ?)
                `, [vendor_id, pkgId]);
            }
        }

        // Step 2: Add custom vendor-created packages (optional)
        if (Array.isArray(new_packages)) {
            for (let i = 0; i < new_packages.length; i++) {
                const pkg = new_packages[i];
                const media = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || null;

                const [pkgResult] = await connection.query(`
                    INSERT INTO packages
                    (service_type_id, packageName, description, totalPrice, totalTime, packageMedia)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    pkg.service_type_id,
                    pkg.packageName,
                    pkg.description,
                    pkg.totalPrice,
                    pkg.totalTime,
                    media
                ]);

                const newPackageId = pkgResult.insertId;

                for (const item of pkg.items || []) {
                    await connection.query(`
                        INSERT INTO package_items
                        (package_id, itemName, description, price, timeRequired)
                        VALUES (?, ?, ?, ?, ?)
                    `, [newPackageId, item.itemName, item.description, item.price, item.timeRequired]);
                }

                // Map vendor to this custom package
                await connection.query(`
                    INSERT INTO vendor_packages (vendor_id, package_id)
                    VALUES (?, ?)
                `, [vendor_id, newPackageId]);
            }
        }

        await connection.commit();
        connection.release();

        res.status(200).json({ message: "Packages selected/added successfully" });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Vendor package select/add error:", err);
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
        const [rows] = await db.query(vendorGetQueries.getProfileVendor, [vendor_id])

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "Vendor profile not found" });
        }

        // Remove null values
        const profileWithNonNulls = {};
        for (const key in rows[0]) {
            if (rows[0][key] !== null) {
                profileWithNonNulls[key] = rows[0][key];
            }
        }

        res.status(200).json({
            message: "Vendor profile fetched successfully",
            profile: profileWithNonNulls
        });

    } catch (err) {
        console.error("Error fetching service types:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    }
})

const updateProfileVendor = asyncHandler(async (req, res) => {
    const { vendor_id, vendor_type } = req.user;
    const {
        name,
        email,
        phone,
        otherInfo,
        googleBusinessProfileLink,
        companyAddress,
        contactPerson
    } = req.body;

    let profileImageVendor = req.uploadedFiles?.profileImageVendor?.[0]?.url || null;

    try {
        if (vendor_type === "individual") {
            // Get current image if no new image uploaded
            if (!profileImageVendor) {
                const [existing] = await db.query(
                    `SELECT profileImage FROM individual_details WHERE vendor_id = ?`,
                    [vendor_id]
                );
                profileImageVendor = existing[0]?.profileImage || null;
            }

            await db.query(
                `UPDATE individual_details
                 SET profileImage = ?, name = ?, email = ?, phone = ?, otherInfo = ?
                 WHERE vendor_id = ?`,
                [profileImageVendor, name, email, phone, otherInfo, vendor_id]
            );
        } else if (vendor_type === "company") {
            // Get current image if no new image uploaded
            if (!profileImageVendor) {
                const [existing] = await db.query(
                    `SELECT profileImage FROM company_details WHERE vendor_id = ?`,
                    [vendor_id]
                );
                profileImageVendor = existing[0]?.profileImage || null;
            }

            await db.query(
                `UPDATE company_details
                 SET profileImage = ?, companyName = ?, companyEmail = ?, companyPhone = ?, googleBusinessProfileLink = ?, companyAddress = ?, contactPerson = ?
                 WHERE vendor_id = ?`,
                [profileImageVendor, name, email, phone, googleBusinessProfileLink, companyAddress, contactPerson, vendor_id]
            );
        } else {
            return res.status(400).json({ message: "Invalid vendor type" });
        }

        res.status(200).json({ message: "Vendor profile updated successfully" });
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

const getPackagesForVendor = asyncHandler(async (req, res) => {
    const { service_id } = req.query;

    if (!service_id) {
        return res.status(400).json({
            error: "service_id is required."
        });
    }

    try {
        // Step 1: Get all service_type_ids under this service
        const [types] = await db.query(
            `SELECT service_type_id FROM service_type WHERE service_id = ?`,
            [service_id]
        );

        if (types.length === 0) {
            return res.status(404).json({ error: "No service types found for the given service_id." });
        }

        const serviceTypeIds = types.map(row => row.service_type_id);

        // Step 2: Fetch all packages for these service_type_ids
        const [packages] = await db.query(`
            SELECT
                p.package_id,
                p.service_type_id,
                st.serviceTypeName,
                p.packageName,
                p.description,
                p.totalPrice,
                p.totalTime,
                p.packageMedia
            FROM packages p
            JOIN service_type st ON p.service_type_id = st.service_type_id
            WHERE p.service_type_id IN (?)
        `, [serviceTypeIds]);

        // Step 3: Attach subPackages (items) and preferences
        for (const pkg of packages) {
            const [subPackages] = await db.query(`
                SELECT item_id, itemName, description, price, timeRequired, itemMedia
                FROM package_items
                WHERE package_id = ?
            `, [pkg.package_id]);

            const [preferences] = await db.query(`
                SELECT preference_id, preferenceValue
                FROM booking_preferences
                WHERE package_id = ?
            `, [pkg.package_id]);

            pkg.subPackages = subPackages;
            pkg.preferences = preferences;
        }

        res.status(200).json({
            message: "Packages fetched successfully",
            packages
        });

    } catch (error) {
        console.error("Error fetching vendor packages:", error);
        res.status(500).json({ error: "Database error", details: error.message });
    }
});



module.exports = {
    getVendorServices,
    vendorSelectOrAddPackage,
    getServiceTypesByVendor,
    getVendorService,
    getProfileVendor,
    updateProfileVendor,
    editServiceType,
    getServiceTypesByServiceId,
    deletePackage,
    getPackagesForVendor
};
