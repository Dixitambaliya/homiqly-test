const { db } = require("../config/db");
const { sendAdminVendorRegistrationMail } = require("../config/utils/email/mailer");


const registerVendorLogin = async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const {
            name,
            phone,
            email,
            serviceLocation,
            professionalExperience,
            packages = []
        } = req.body;

        const vendorType = "individual"; // fixed

        const properCertificationMedia = req.uploadedFiles?.properCertificationMedia?.[0]?.url || null;
        const businessLicenseMedia = req.uploadedFiles?.businessLicenseMedia?.[0]?.url || null;
        const insuranceProofMedia = req.uploadedFiles?.insuranceProofMedia?.[0]?.url || null;

        // ✅ Parse selected packages (JSON string or array)
        const parsedPackages = packages ? JSON.parse(packages) : [];

        // ✅ Insert EVERYTHING into temporary table
        await conn.query(
            `INSERT INTO vendor_temporary_details (
                name, phone, email, serviceLocation, properCertificationMedia, businessLicenseMedia,insuranceProofMedia, professionalExperience,packages_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name || null,
                phone || null,
                email || null,
                serviceLocation || null,
                properCertificationMedia || null,
                businessLicenseMedia || null,
                insuranceProofMedia || null,
                professionalExperience,
                JSON.stringify(parsedPackages),
            ]
        );

        // ✅ (Optional) Validate packages and sub-packages exist
        for (const pkg of parsedPackages) {
            const { package_id, sub_packages = [] } = pkg;

            const [packageExists] = await db.query(
                "SELECT package_id FROM packages WHERE package_id = ?",
                [package_id]
            );
            if (packageExists.length === 0) {
                return res.status(400).json({ error: `Package ID ${package_id} does not exist.` });
            }

            if (Array.isArray(sub_packages) && sub_packages.length > 0) {
                for (const sub of sub_packages) {
                    const { item_id } = sub;
                    const [subExists] = await db.query(
                        `SELECT item_id FROM package_items WHERE item_id = ? AND package_id = ?`,
                        [item_id, package_id]
                    );
                    if (subExists.length === 0) {
                        return res.status(400).json({
                            error: `Sub-package ID ${item_id} does not exist for package ${package_id}.`,
                        });
                    }
                }
            }
        }

        await conn.commit();

        // ✅ Keep the mail logic exactly same
        (async () => {
            try {
                let serviceName = "N/A";
                if (parsedPackages.length > 0) {
                    const firstPackageId = parsedPackages[0].package_id;
                    const [serviceRows] = await db.query(
                        `SELECT s.serviceName 
                         FROM packages p
                         JOIN service_type sp ON p.service_type_id = sp.service_type_id
                         JOIN services s ON sp.service_id = s.service_id
                         WHERE p.package_id = ?`,
                        [firstPackageId]
                    );

                    if (serviceRows.length) serviceName = serviceRows[0].serviceName;
                }

                await sendAdminVendorRegistrationMail({
                    vendorType,
                    vendorName: name,
                    vendorEmail: email,
                    vendorCity: serviceLocation,
                    vendorService: serviceName,
                });
            } catch (err) {
                console.error("❌ Admin mail failed (ignored):", err);
            }
        })();

        return res.status(201).json({
            message: "Vendor registration submitted successfully"
        });
    } catch (err) {
        await conn.rollback();
        console.error("❌ Registration failed:", err);
        res.status(500).json({
            error: "Internal server error during vendor registration",
            details: err.message,
        });
    } finally {
        conn.release();
    }
};

const getVendorRegistrations = async (req, res) => {
    try {
        // 🧮 1️⃣ Get page and limit from query (defaults: page 1, limit 10)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 🧩 2️⃣ Get total count for pagination info
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM vendor_temporary_details`);

        // 3️⃣ Get paginated vendor temporary records
        const [vendors] = await db.query(
            `SELECT * 
             FROM vendor_temporary_details 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const result = [];

        // 4️⃣ Process each vendor
        for (const vendor of vendors) {
            let parsedPackages = [];
            try {
                parsedPackages = vendor.packages_json ? JSON.parse(vendor.packages_json) : [];
            } catch {
                parsedPackages = [];
            }

            const detailedPackages = [];

            for (const pkg of parsedPackages) {
                const { package_id, sub_packages = [] } = pkg;

                // 🧩 Fetch package info
                const [packageRows] = await db.query(
                    `SELECT 
                        p.package_id,
                        p.packageName,
                        p.packageMedia,
                        p.service_type_id,
                        p.created_at,
                        p.updated_at
                     FROM packages p
                     WHERE p.package_id = ?`,
                    [package_id]
                );

                if (packageRows.length === 0) continue;
                const packageData = packageRows[0];

                let items = [];

                // ✅ Fetch only sub_packages listed in vendor JSON
                if (sub_packages.length > 0) {
                    const itemIds = sub_packages.map((sp) => sp.item_id);
                    const [filteredItems] = await db.query(
                        `SELECT 
                            i.item_id,
                            i.package_id,
                            i.itemName,
                            i.itemMedia,
                            i.description,
                            i.price,
                            i.timeRequired,
                            i.created_at,
                            i.updated_at
                         FROM package_items i
                         WHERE i.package_id = ? AND i.item_id IN (?)`,
                        [package_id, itemIds]
                    );
                    items = filteredItems;
                }

                packageData.sub_packages = items;
                detailedPackages.push(packageData);
            }

            result.push({
                vendor_id: vendor.temp_id || null,
                name: vendor.name,
                phone: vendor.phone,
                email: vendor.email,
                serviceLocation: vendor.serviceLocation,
                professionalExperience: vendor.professionalExperience,
                properCertificationMedia: vendor.properCertificationMedia,
                businessLicenseMedia: vendor.businessLicenseMedia,
                insuranceProofMedia: vendor.insuranceProofMedia,
                created_at: vendor.created_at,
                packages: detailedPackages,
            });
        }

        // 5️⃣ Send paginated response
        return res.status(200).json({
            message: "Fetched vendor registrations successfully",
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: result,
        });

    } catch (err) {
        console.error("❌ Error fetching vendor registrations:", err);
        res.status(500).json({
            error: "Internal server error while fetching vendor registrations",
            details: err.message,
        });
    }
};



module.exports = { registerVendorLogin, getVendorRegistrations };