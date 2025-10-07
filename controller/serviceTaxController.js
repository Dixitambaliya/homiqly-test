const asyncHandler = require("express-async-handler");
const { db } = require("../config/db"); // your MySQL connection

// Create a new service tax
const createServiceTax = asyncHandler(async (req, res) => {
    const { taxName, taxPercentage } = req.body;

    if (!taxName || taxPercentage == null) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const [result] = await db.query(
        "INSERT INTO service_taxes (taxName, taxPercentage) VALUES (?, ?)",
        [taxName, taxPercentage]
    );

    res.status(201).json({ message: "Service tax created", tax_id: result.insertId });
});

// Get all service taxes
const getAllServiceTaxes = asyncHandler(async (req, res) => {
    const [rows] = await db.query(
        `SELECT * FROM service_taxes`
    );

    res.json(rows);
});

// Update a service tax
const updateServiceTax = asyncHandler(async (req, res) => {
    const { service_taxes_id } = req.params;
    const { taxName, taxPercentage, status } = req.body;

    await db.query(
        "UPDATE service_taxes SET taxName = ?, taxPercentage = ?, status = ? WHERE service_taxes_id = ?",
        [taxName, taxPercentage, status, service_taxes_id]
    );

    res.json({ message: "Service tax updated" });
});

// Delete a service tax
const deleteServiceTax = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await db.query("DELETE FROM service_taxes WHERE service_taxes_id = ?", [id]);

    res.json({ message: "Service tax deleted" });
});

module.exports = {
    createServiceTax,
    getAllServiceTaxes,
    updateServiceTax,
    deleteServiceTax
};
