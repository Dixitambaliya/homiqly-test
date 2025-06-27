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


module.exports = { getVendor, getAllServiceType, getUsers, updateUserByAdmin };
