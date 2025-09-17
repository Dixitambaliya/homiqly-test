const { db } = require("../config/db");
const adminQueries = require("../config/adminQueries");
const adminGetQueries = require("../config/adminQueries/adminGetQueries")
const adminPostQueries = require("../config/adminQueries/adminPostQueries");
const adminPutQueries = require("../config/adminQueries/adminPutQueries");
const adminDeleteQueries = require("../config/adminQueries/adminDeleteQueries")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


const getVendor = asyncHandler(async (req, res) => {
    try {
        const [vendors] = await db.query(adminGetQueries.vendorDetails);

        const processedVendors = vendors.map(vendor => {
            // Parse JSON fields safely
            const parsedServices = vendor.services ? JSON.parse(vendor.services) : [];
            const parsedPackages = vendor.packages ? JSON.parse(vendor.packages) : [];
            const parsedPackageItems = vendor.package_items ? JSON.parse(vendor.package_items) : [];

            // Remove fields not needed based on vendorType
            if (vendor.vendorType === "individual") {
                for (let key in vendor) {
                    if (key.startsWith("company_")) delete vendor[key];
                }
            } else if (vendor.vendorType === "company") {
                for (let key in vendor) {
                    if (key.startsWith("individual_")) delete vendor[key];
                }
            }

            return {
                ...vendor,
                services: parsedServices,
                packages: parsedPackages,
                package_items: parsedPackageItems
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
                        p.package_id
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
                        pa.addonTime,
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
        const { serviceId, packages } = req.body;

        if (!serviceId) throw new Error("serviceId is required.");
        if (!packages) throw new Error("Missing required field: packages.");

        // Verify service exists
        const [serviceCheck] = await connection.query(
            `SELECT service_id, serviceName, serviceFilter FROM services WHERE service_id = ? LIMIT 1`,
            [serviceId]
        );
        if (serviceCheck.length === 0) throw new Error("Invalid serviceId. Service does not exist.");
        const serviceFilter = serviceCheck[0].serviceFilter;

        // Ensure one service_type exists
        const [existingServiceType] = await connection.query(
            `SELECT service_type_id FROM service_type WHERE service_id = ? LIMIT 1`,
            [serviceId]
        );
        let service_type_id;
        if (existingServiceType.length > 0) {
            service_type_id = existingServiceType[0].service_type_id;
        } else {
            const [stResult] = await connection.query(
                `INSERT INTO service_type (service_id) VALUES (?)`,
                [serviceId]
            );
            service_type_id = stResult.insertId;
        }

        const parsedPackages = typeof packages === "string" ? JSON.parse(packages) : packages;

        for (let i = 0; i < parsedPackages.length; i++) {
            const pkg = parsedPackages[i];

            // Insert package
            const [pkgResult] = await connection.query(
                `INSERT INTO packages (service_type_id) VALUES (?)`,
                [service_type_id]
            );
            const package_id = pkgResult.insertId;

            // Consent Forms for this package
            for (let c = 0; c < (pkg.consentForm || []).length; c++) {
                const consent = pkg.consentForm[c];
                if (!consent.question) continue;

                await connection.query(
                    `INSERT INTO package_consent_forms (package_id, question, is_required)
                     VALUES (?, ?, ?)`,
                    [
                        package_id,
                        consent.question,
                        consent.is_required ?? 0
                    ]
                );
            }


            // Sub-packages
            for (let j = 0; j < (pkg.sub_packages || []).length; j++) {
                const sub = pkg.sub_packages[j];
                const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;

                const [subResult] = await connection.query(
                    `INSERT INTO package_items
                     (package_id, itemName, description, price, timeRequired, itemMedia)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        package_id,
                        sub.item_name || null,
                        sub.description || null,
                        sub.price || 0,
                        sub.time_required || 0,
                        itemMedia
                    ]
                );
                const sub_package_id = subResult.insertId;

                // Preferences for this sub-package (now supports multiple groups)
                for (let p = 0; p < (sub.preferences || []).length; p++) {
                    const prefGroup = sub.preferences[p]; // <-- this is an array of objects

                    for (let q = 0; q < (prefGroup || []).length; q++) {
                        const pref = prefGroup[q];
                        if (!pref.preference_value) continue;

                        await connection.query(
                            `INSERT INTO booking_preferences 
                            (package_item_id, preferenceGroup, preferenceValue, preferencePrice)
                            VALUES (?, ?, ?, ?)`,
                            [
                                sub_package_id,
                                p, // store which group this belongs to
                                pref.preference_value.trim(),
                                pref.preference_price ?? 0
                            ]
                        );
                    }
                }

                // Addons for this sub-package
                for (let k = 0; k < (sub.addons || []).length; k++) {
                    const addon = sub.addons[k];
                    const addonMedia = req.uploadedFiles?.[`addon_media_${i}_${j}_${k}`]?.[0]?.url || null;

                    await connection.query(
                        `INSERT INTO package_addons
                         (package_item_id, addonName, addonDescription, addonPrice, addonTime, addonMedia)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            sub_package_id,
                            addon.addon_name || null,
                            addon.description || null,
                            addon.price || 0,
                            addon.time_required || 0,
                            addonMedia
                        ]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            message: "✅ Packages with sub-packages, preferences, addons, and consent forms created successfully"
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
                sc.service_categories_id AS service_category_id,
                sc.serviceCategory AS service_category_name,
                s.service_id,
                s.serviceName AS service_name,
                s.serviceFilter,

                COALESCE((
                    SELECT CONCAT('[', GROUP_CONCAT(
                        JSON_OBJECT(
                            'package_id', p.package_id,
                            'service_type_id', st.service_type_id,

                            'sub_packages', IFNULL((
                                SELECT CONCAT('[', GROUP_CONCAT(
                                    JSON_OBJECT(
                                        'sub_package_id', pi.item_id,
                                        'item_name', pi.itemName,
                                        'description', pi.description,
                                        'price', pi.price,
                                        'time_required', pi.timeRequired,
                                        'item_media', pi.itemMedia,

                                      -- preferences grouped into nested arrays
                                        'preferences', IFNULL((
                                            SELECT CONCAT('[', GROUP_CONCAT(
                                                JSON_OBJECT(
                                                    'preference_id', bp.preference_id,
                                                    'preference_value', bp.preferenceValue,
                                                    'preference_price', bp.preferencePrice
                                                )
                                            ), ']')
                                            FROM booking_preferences bp
                                            WHERE bp.package_item_id = pi.item_id
                                        ), '[]'),

                                        -- addons linked to this sub_package
                                        'addons', IFNULL(( 
                                            SELECT CONCAT('[', GROUP_CONCAT(
                                                JSON_OBJECT(
                                                    'addon_id', pa.addon_id,
                                                    'addon_name', pa.addonName,
                                                    'description', pa.addonDescription,
                                                    'price', pa.addonPrice,
                                                    'time_required', pa.addonTime,
                                                    'addon_media', pa.addonMedia
                                                )
                                            ), ']')
                                            FROM package_addons pa
                                            WHERE pa.package_item_id = pi.item_id
                                        ), '[]')
                                    )
                                ), ']')
                                FROM package_items pi
                                WHERE pi.package_id = p.package_id
                            ), '[]'),

                            'consentForm', IFNULL((
                                SELECT CONCAT('[', GROUP_CONCAT(
                                    JSON_OBJECT(
                                        'consent_id', pcf.consent_id,
                                        'question', pcf.question
                                    )
                                ), ']')
                                FROM package_consent_forms pcf
                                WHERE pcf.package_id = p.package_id
                            ), '[]')
                        )
                    ), ']')
                    FROM packages p
                    JOIN service_type st ON st.service_type_id = p.service_type_id
                    WHERE st.service_id = s.service_id
                ), '[]') AS packages

            FROM services s
            JOIN service_categories sc ON sc.service_categories_id = s.service_categories_id
            ORDER BY s.service_id DESC
        `);

        const parsedResult = rows.map(row => {
            let parsedPackages = [];
            try {
                parsedPackages = JSON.parse(row.packages).map(pkg => ({
                    package_id: pkg.package_id,
                    service_type_id: pkg.service_type_id,

                    sub_packages: (typeof pkg.sub_packages === "string" ? JSON.parse(pkg.sub_packages) : pkg.sub_packages).map(sp => ({
                        sub_package_id: sp.sub_package_id,
                        item_name: sp.item_name,
                        description: sp.description,
                        price: sp.price,
                        time_required: sp.time_required,
                        item_media: sp.item_media,
                        preferences: typeof sp.preferences === "string" ? JSON.parse(sp.preferences) : sp.preferences,
                        addons: typeof sp.addons === "string" ? JSON.parse(sp.addons) : sp.addons
                    })),

                    consentForm: typeof pkg.consentForm === "string" ? JSON.parse(pkg.consentForm) : pkg.consentForm
                }));
            } catch (e) {
                console.warn(`❌ Invalid JSON in service_id ${row.service_id}:`, e.message);
            }

            return {
                service_category_id: row.service_category_id,
                service_category_name: row.service_category_name,
                service_id: row.service_id,
                service_name: row.service_name,
                service_filter: row.serviceFilter,
                packages: parsedPackages
            };
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
            return res.status(400).json({ message: "vendor_id and selectedPackages[] are required." });
        }

        // ✅ Check vendor existence
        const [vendorExists] = await connection.query(
            `SELECT vendor_id, vendorType FROM vendors WHERE vendor_id = ?`,
            [vendor_id]
        );
        if (vendorExists.length === 0) throw new Error(`Vendor ID ${vendor_id} does not exist.`);

        // ✅ Manual toggle check
        const [toggleResult] = await connection.query(
            `SELECT manual_assignment_enabled FROM vendor_settings WHERE vendor_id = ?`,
            [vendor_id]
        );
        const isEnabled = toggleResult[0]?.manual_assignment_enabled === 1;
        if (!isEnabled) throw new Error(`Manual assignment toggle must be ON for vendor ID ${vendor_id}.`);

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
        const vendorData = vendorDetails[0];

        const newlyAssigned = [];

        for (const pkg of selectedPackages) {
            const { package_id, sub_packages = [] } = pkg;

            // ✅ Check if package exists
            const [pkgRow] = await connection.query(
                `SELECT package_id FROM packages WHERE package_id = ?`,
                [package_id]
            );
            if (pkgRow.length === 0) throw new Error(`Package ID ${package_id} does not exist.`);

            // ✅ Insert into vendor_packages table
            const [insertResult] = await connection.query(
                `INSERT INTO vendor_packages (vendor_id, package_id) VALUES (?, ?)`,
                [vendor_id, package_id]
            );
            const vendor_packages_id = insertResult.insertId;

            // ✅ Insert sub-packages into vendor_package_items
            if (Array.isArray(sub_packages) && sub_packages.length > 0) {
                for (const sub of sub_packages) {
                    const subpackage_id = sub.sub_package_id;
                    await connection.query(
                        `INSERT INTO vendor_package_items (vendor_packages_id, vendor_id, package_id, package_item_id) 
                         VALUES (?, ?, ?, ?)`,
                        [vendor_packages_id, vendor_id, package_id, subpackage_id]
                    );
                }
            }

            newlyAssigned.push({
                package_id,
                vendor_packages_id,
                selected_subpackages: sub_packages.map(sp => sp.sub_package_id)
            });
        }

        await connection.commit();
        connection.release();

        // ✅ Send admin notification email
        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const emailHtml = `
                <p><strong>Vendor:</strong> ${vendorData.vendorName} (ID: ${vendor_id})</p>
                <p><strong>Email:</strong> ${vendorData.vendorEmail}</p>
                <p>has applied for the following packages:</p>
                <ul>
                    ${newlyAssigned.map(p => `
                        <li>
                            <strong>Package ID:</strong> ${p.package_id} <br/>
                            <strong>Sub-Packages:</strong> ${p.selected_subpackages.length > 0 ? p.selected_subpackages.join(", ") : "None"}
                        </li>
                    `).join("")}
                </ul>
            `;

            await transporter.sendMail({
                from: `"Vendor System" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER, // admin email
                subject: "New Package Application Submitted",
                html: emailHtml
            });

            console.log("✅ Admin notification email sent successfully.");
        } catch (mailErr) {
            console.error("⚠️ Failed to send admin email:", mailErr.message);
        }

        res.status(200).json({
            message: "Packages successfully applied"
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

            // ✅ Verify package exists
            const [existingPackage] = await connection.query(adminPutQueries.getPackageById, [package_id]);
            if (!existingPackage.length) continue;

            // ✅ Handle Sub-Packages
            if (Array.isArray(pkg.sub_packages)) {
                const submittedItemIds = [];

                for (let j = 0; j < pkg.sub_packages.length; j++) {
                    const sub = pkg.sub_packages[j];
                    const sub_id = sub.sub_package_id;

                    let sub_package_id;
                    if (sub_id) {
                        // update existing sub_package
                        const [oldItem] = await connection.query(adminPutQueries.getPackageItemById, [sub_id]);
                        if (!oldItem.length) continue;
                        const old = oldItem[0];

                        const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || old.itemMedia;

                        await connection.query(adminPutQueries.updatePackageItem, [
                            sub.item_name ?? old.itemName,
                            sub.description ?? old.description,
                            sub.price ?? old.price,
                            sub.time_required ?? old.timeRequired,
                            itemMedia,
                            sub_id,
                            package_id
                        ]);

                        sub_package_id = sub_id;
                    } else {
                        // insert new sub_package
                        const itemMedia = req.uploadedFiles?.[`itemMedia_${i}_${j}`]?.[0]?.url || null;
                        const [newItem] = await connection.query(adminPutQueries.insertPackageItem, [
                            package_id,
                            sub.item_name,
                            sub.description,
                            sub.price,
                            sub.time_required,
                            itemMedia
                        ]);
                        sub_package_id = newItem.insertId;
                    }

                    submittedItemIds.push(sub_package_id);

                    // ✅ Handle Preferences for this sub_package
                    if (Array.isArray(sub.preferences)) {
                        const submittedPrefIds = [];
                        for (let p = 0; p < sub.preferences.length; p++) {
                            const pref = sub.preferences[p];
                            if (pref.preference_id) {
                                const [oldPref] = await connection.query(adminPutQueries.getPreferenceById, [pref.preference_id]);
                                if (!oldPref.length) continue;

                                await connection.query(adminPutQueries.updatePackagePreference, [
                                    pref.preference_value ?? oldPref[0].preferenceValue,
                                    pref.preference_price ?? oldPref[0].preferencePrice,
                                    pref.preference_id,
                                    sub_package_id
                                ]);

                                submittedPrefIds.push(pref.preference_id);
                            } else {
                                const [newPref] = await connection.query(adminPutQueries.insertPackagePreference, [
                                    sub_package_id,
                                    pref.preference_value,
                                    pref.preference_price ?? 0
                                ]);
                                submittedPrefIds.push(newPref.insertId);
                            }
                        }

                        await connection.query(adminPutQueries.deleteRemovedPreferences, [
                            sub_package_id,
                            submittedPrefIds.length ? submittedPrefIds : [0]
                        ]);
                    }

                    // ✅ Handle Addons for this sub_package
                    if (Array.isArray(sub.addons)) {
                        const submittedAddonIds = [];
                        for (let k = 0; k < sub.addons.length; k++) {
                            const addon = sub.addons[k];
                            if (addon.addon_id) {
                                const [oldAddon] = await connection.query(adminPutQueries.getAddonById, [addon.addon_id]);
                                if (!oldAddon.length) continue;

                                const addonMedia = req.uploadedFiles?.[`addonMedia_${i}_${j}_${k}`]?.[0]?.url || oldAddon[0].addonMedia;

                                await connection.query(adminPutQueries.updateAddon, [
                                    addon.addon_name ?? oldAddon[0].addonName,
                                    addon.description ?? oldAddon[0].addonDescription,
                                    addon.price ?? oldAddon[0].addonPrice,
                                    addon.time_required ?? oldAddon[0].addonTime,
                                    addonMedia,
                                    addon.addon_id,
                                    sub_package_id
                                ]);

                                submittedAddonIds.push(addon.addon_id);
                            } else {
                                const addonMedia = req.uploadedFiles?.[`addonMedia_${i}_${j}_${k}`]?.[0]?.url || null;

                                const [newAddon] = await connection.query(adminPutQueries.insertAddon, [
                                    sub_package_id,
                                    addon.addon_name,
                                    addon.description,
                                    addon.price,
                                    addon.time_required,
                                    addonMedia
                                ]);
                                submittedAddonIds.push(newAddon.insertId);
                            }
                        }

                        await connection.query(adminPutQueries.deleteRemovedAddons, [
                            sub_package_id,
                            submittedAddonIds.length ? submittedAddonIds : [0]
                        ]);
                    }
                }

                // Cleanup removed sub_packages
                await connection.query(adminPutQueries.deleteRemovedPackageItems, [
                    package_id,
                    submittedItemIds.length ? submittedItemIds : [0]
                ]);
            }

            // ✅ Handle Consent Forms (package level)
            if (Array.isArray(pkg.consentForm)) {
                const submittedConsentIds = [];

                for (let c = 0; c < pkg.consentForm.length; c++) {
                    const form = pkg.consentForm[c];
                    if (form.consent_id) {
                        const [oldForm] = await connection.query(adminPutQueries.getConsentFormById, [form.consent_id]);
                        if (!oldForm.length) continue;

                        await connection.query(adminPutQueries.updateConsentForm, [
                            form.question ?? oldForm[0].question,
                            form.is_required !== undefined ? form.is_required : oldForm[0].is_required,
                            form.consent_id,
                            package_id
                        ]);

                        submittedConsentIds.push(form.consent_id);
                    } else {
                        const [newForm] = await connection.query(adminPutQueries.insertConsentForm, [
                            package_id,
                            form.question,
                            form.is_required ?? 0
                        ]);
                        submittedConsentIds.push(newForm.insertId);
                    }
                }

                await connection.query(adminPutQueries.deleteRemovedConsentForms, [
                    package_id,
                    submittedConsentIds.length ? submittedConsentIds : [0]
                ]);
            }
        }

        await connection.commit();
        connection.release();
        res.status(200).json({ message: "✅ Packages updated successfully with sub-packages, preferences, addons, and consent forms" });

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
          pkg.package_id

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

                s.serviceName,
                s.serviceImage
            FROM vendor_package_applications vpa
            JOIN vendors v ON vpa.vendor_id = v.vendor_id
            LEFT JOIN individual_details idet ON v.vendor_id = idet.vendor_id
            LEFT JOIN company_details cdet ON v.vendor_id = cdet.vendor_id
            JOIN packages p ON vpa.package_id = p.package_id
            JOIN service_type st ON p.service_type_id = st.service_type_id
            JOIN services s ON st.service_id = s.service_id
            ORDER BY vpa.applied_at DESC
        `);

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

        // ✅ If approved, transfer and delete from application tables
        if (Number(status) === 1) {
            // Get application details
            const [appRows] = await connection.query(
                `SELECT vendor_id, package_id FROM vendor_package_applications WHERE application_id = ?`,
                [application_id]
            );
            if (appRows.length === 0) throw new Error("Application details not found");

            const { vendor_id, package_id } = appRows[0];

            // Insert into vendor_packages
            const [vpResult] = await connection.query(
                `INSERT INTO vendor_packages (vendor_id, package_id) VALUES (?, ?)`,
                [vendor_id, package_id]
            );
            const vendor_packages_id = vpResult.insertId;

            // Get sub-package items from vendor_package_item_applications
            const [subPkgRows] = await connection.query(
                `SELECT package_item_id FROM vendor_package_item_application WHERE application_id = ?`,
                [application_id]
            );

            // Insert sub-packages into vendor_package_items
            if (subPkgRows.length > 0) {
                const insertSubPackages = subPkgRows.map(sp => [
                    vendor_packages_id,
                    vendor_id,
                    package_id,
                    sp.package_item_id
                ]);

                await connection.query(
                    `INSERT INTO vendor_package_items (vendor_packages_id, vendor_id, package_id, package_item_id)
                     VALUES ?`,
                    [insertSubPackages]
                );
            }

            // ✅ Delete transferred entries from application tables
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
            message: `Application ${application_id} status updated to ${status} successfully and data transferred.`
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
    const admin_id = req.user.admin_id; // must exist
    const { vendor_id } = req.params;
    const { status, note } = req.body; // status = 0 or 1, note = optional string

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

        // 2️⃣ Send notification to admin (optional)
        try {
            const messageText = `Admin has turned manual assignment ${status === 1 ? 'ON (disabled)' : 'OFF (enabled)'} for Vendor ID ${vendor_id}. ${note ? "Note: " + note : ""}`;

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

        // 3️⃣ Send email to vendor
        try {
            let vendorEmail = null;
            let vendorName = "Vendor";

            // Check if vendor is an individual
            const [individualRows] = await db.query(
                "SELECT email, name FROM individual_details WHERE vendor_id = ?",
                [vendor_id]
            );

            if (individualRows.length > 0) {
                vendorEmail = individualRows[0].email;
                vendorName = individualRows[0].name;
            } else {
                // Check if vendor is a company
                const [companyRows] = await db.query(
                    "SELECT companyEmail, companyName FROM company_details WHERE vendor_id = ?",
                    [vendor_id]
                );

                if (companyRows.length > 0) {
                    vendorEmail = companyRows[0].companyEmail;
                    vendorName = companyRows[0].companyName || "Company Vendor";
                }
            }

            if (vendorEmail) {
                const mailText = `Hello ${vendorName},\n\nYour manual assignment for services has been ${status === 1 ? 'disabled (ON)' : 'enabled (OFF)'} by the admin.${note ? "\n\nNote from admin: " + note : ""}\n\nIf you have any questions, please contact support.\n\nThanks,\nTeam`;

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: vendorEmail,
                    subject: "Manual Assignment Status Changed by Admin",
                    text: mailText
                };

                await transporter.sendMail(mailOptions);
            }
        } catch (err) {
            console.error("Failed to send email to vendor:", err);
        }

        res.status(200).json({
            message: `Manual assignment for vendor ${vendor_id} is now ${status === 1 ? 'ON (disabled)' : 'OFF (enabled)'}`,
            vendor_id,
            manual_assignment_enabled: status,
            note: note || null
        });

    } catch (err) {
        console.error("Error toggling manual vendor assignment:", err);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
});

const removeVendorPackageByAdmin = asyncHandler(async (req, res) => {
    // Assumes admin auth middleware verified role/permissions already
    const { vendor_packages_id } = req.params;

    if (!vendor_packages_id) {
        return res.status(400).json({ message: "vendor_packages_id is required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Ensure package exists
        const [[pkg]] = await connection.query(
            `SELECT vendor_packages_id, vendor_id 
             FROM vendor_packages 
             WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        if (!pkg) {
            await connection.rollback();
            return res.status(404).json({ message: "Package not found" });
        }

        // Delete related sub-packages/items first
        await connection.query(
            `DELETE FROM vendor_package_items WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        // Delete related addons if your schema has them (optional safeguard)
        // await connection.query(
        //     `DELETE FROM vendor_package_addons WHERE vendor_packages_id = ?`,
        //     [vendor_packages_id]
        // );

        // Delete the vendor package
        await connection.query(
            `DELETE FROM vendor_packages WHERE vendor_packages_id = ?`,
            [vendor_packages_id]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: "Vendor package removed successfully by admin",
            vendor_packages_id
        });
    } catch (err) {
        await connection.rollback();
        console.error("Admin remove vendor package error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to remove vendor package",
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
    updateVendorPackageRequestStatus,
    toggleManualVendorAssignmentByAdmin,
    removeVendorPackageByAdmin,
    deleteUserByAdmin,
    editEmployeeProfileByAdmin,
    deleteEmployeeProfileByAdmin
};
