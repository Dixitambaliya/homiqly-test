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

const applyForServiceType = asyncHandler(async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const { vendor_id, vendor_type } = req.user;
    const {
        serviceId,
        serviceType,
        packages,
        preferences // optional
    } = req.body;

    const serviceTypeMedia = req.uploadedFiles?.serviceTypeMedia?.[0]?.url || null;

    try {
        if (!serviceId || !serviceType || !packages || !serviceTypeMedia) {
            throw new Error("All required fields (except preferences) must be provided including at least one package and image.");
        }

        const checkServiceQuery = vendor_type === "individual"
            ? "SELECT 1 FROM individual_services WHERE vendor_id = ? AND service_id = ?"
            : "SELECT 1 FROM company_services WHERE vendor_id = ? AND service_id = ?";

        const [checkRows] = await connection.query(checkServiceQuery, [vendor_id, serviceId]);
        if (checkRows.length === 0) {
            throw new Error("Vendor has not registered this service.");
        }

        const [vendorRow] = await db.query(
            vendor_type === "individual"
                ? "SELECT name AS vendorName FROM individual_details WHERE vendor_id = ?"
                : "SELECT companyName AS vendorName FROM company_details WHERE vendor_id = ?",
            [vendor_id]
        );
        const vendorName = vendorRow[0]?.vendorName || "";

        const [serviceInfo] = await db.query("SELECT serviceName FROM services WHERE service_id = ?", [serviceId]);
        const serviceName = serviceInfo[0]?.serviceName || "Unknown Service";

        const [existing] = await connection.query(vendorPostQueries.checkServiceType, [serviceId, serviceType.trim()]);
        if (existing.length > 0) throw new Error("Service type already exists for this service");

        const [insertResult] = await connection.query(vendorPostQueries.insertServiceType, [
            serviceId,
            vendor_id,
            serviceType.trim(),
            serviceTypeMedia,
            0
        ]);
        const service_type_id = insertResult.insertId;

        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;
        if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
            throw new Error("At least one package is required.");
        }

        const insertedPackages = [];

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];
            const media = req.uploadedFiles?.[`packageMedia_${i}`]?.[0]?.url || null;

            const [pkgResult] = await connection.query(
                "INSERT INTO packages (service_type_id, vendor_id, packageName, description, totalPrice, totalTime, packageMedia) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [service_type_id, vendor_id, pkg.package_name, pkg.description, pkg.total_price, pkg.total_time, media]
            );

            const package_id = pkgResult.insertId;
            insertedPackages.push(package_id);

            for (let itemIndex = 0; itemIndex < (pkg.items || []).length; itemIndex++) {
                const item = pkg.items[itemIndex];

                const itemMedia = req.uploadedFiles?.[`itemMedia_${i}`]?.[0]?.url || null;

                await connection.query(
                    "INSERT INTO package_items (package_id, vendor_id, itemName, itemMedia, description, price, timeRequired) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [package_id, vendor_id, item.item_name, itemMedia, item.description, item.price, item.time_required]
                );
            }
        }

        if (preferences) {
            const parsedPreferences = typeof preferences === "string" ? JSON.parse(preferences) : preferences;

            if (Array.isArray(parsedPreferences) && parsedPreferences.length > 0) {
                for (const package_id of insertedPackages) {
                    for (const pref of parsedPreferences) {
                        if (!pref.preference_value) {
                            throw new Error("Each preference must have a 'preference_value'.");
                        }

                        await connection.query(
                            "INSERT INTO booking_preferences (package_id, preferenceValue) VALUES (?, ?)",
                            [package_id, pref.preference_value.trim()]
                        );
                    }
                }
            }
        }

        await connection.commit();
        connection.release();

        // Notify admins
        const [adminEmailRows] = await db.query("SELECT email FROM admin WHERE email IS NOT NULL");
        const adminEmails = adminEmailRows.map(row => row.email);
        const packageHtml = parsedPackages.map(p => `<li>${p.package_name} - ₹${p.total_price} (${p.total_time})</li>`).join("");

        if (adminEmails.length > 0) {
            await transport.sendMail({
                from: process.env.EMAIL_USER,
                to: adminEmails,
                subject: "New Service Type Submitted by Vendor",
                html: `
                    <p>A new service type has been submitted by a vendor and is pending approval:</p>
                    <ul>
                        <li><strong>Vendor ID:</strong> ${vendor_id}</li>
                        <li><strong>Vendor Name:</strong> ${vendorName}</li>
                        <li><strong>Service:</strong> ${serviceName}</li>
                        <li><strong>Service Type:</strong> ${serviceType}</li>
                    </ul>
                    <h4>Packages:</h4><ul>${packageHtml}</ul>
                    <p>Please review and approve it in the admin panel.</p>`
            });
        }

        const [adminFCMTokens] = await db.query("SELECT fcmToken FROM admin WHERE fcmToken IS NOT NULL");
        const tokens = adminFCMTokens.map(row => row.fcmToken).filter(Boolean);

        if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
                notification: {
                    title: "New Service Type Submitted",
                    body: `${serviceName} → ${serviceType} (by ${vendorName})`
                },
                tokens
            });
        }

        res.status(201).json({
            message: "Service type and vendor details submitted successfully and pending approval.",
            service_type_id
        });

    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error("Error applying for service type:", err);
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


module.exports = { getVendorServices, applyForServiceType, getServiceTypesByVendor, getVendorService, getProfileVendor, updateProfileVendor, editServiceType };
