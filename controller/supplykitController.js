const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const supplykitGetQueries = require('../config/supplykitQueries/supplykitGetQueries');
const supplykitPostQueries = require('../config/supplykitQueries/supplykitPostQueries');
const supplykitPutQueries = require('../config/supplykitQueries/supplykitPutQueries');

const createSupplyKit = asyncHandler(async (req, res) => {
    const { kit_name, kit_description, kit_price, service_categories_id, items } = req.body;
    
    const kit_image = req.uploadedFiles?.kit_image?.[0]?.url || null;

    if (!kit_name || !kit_price || !service_categories_id) {
        return res.status(400).json({ message: "Kit name, price, and service category are required" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Create supply kit
        const [kitResult] = await connection.query(supplykitPostQueries.createSupplyKit, [
            kit_name,
            kit_description,
            kit_price,
            kit_image,
            service_categories_id,
            1 // is_active
        ]);

        const kit_id = kitResult.insertId;

        // Add items if provided
        if (items && Array.isArray(items)) {
            for (const item of items) {
                const barcode = `HMQ${kit_id}${Date.now()}${Math.floor(Math.random() * 1000)}`;
                
                await connection.query(supplykitPostQueries.addSupplyKitItem, [
                    kit_id,
                    item.item_name,
                    item.item_description || null,
                    item.quantity,
                    item.unit_price,
                    barcode
                ]);
            }
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            message: "Supply kit created successfully",
            kit_id
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("Error creating supply kit:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getAllSupplyKits = asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.query(supplykitGetQueries.getAllSupplyKits);

        const processedKits = rows.map(kit => ({
            ...kit,
            items: JSON.parse(kit.items || '[]')
        }));

        res.status(200).json({
            message: "Supply kits fetched successfully",
            supply_kits: processedKits
        });

    } catch (error) {
        console.error("Error fetching supply kits:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const orderSupplyKit = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { kit_id, quantity_ordered } = req.body;

    if (!kit_id || !quantity_ordered) {
        return res.status(400).json({ message: "Kit ID and quantity are required" });
    }

    try {
        // Get kit details
        const [kitRows] = await db.query(supplykitGetQueries.getSupplyKitById, [kit_id]);
        if (kitRows.length === 0) {
            return res.status(404).json({ message: "Supply kit not found" });
        }

        const kit = kitRows[0];
        const total_amount = kit.kit_price * quantity_ordered;

        // Create order
        await db.query(supplykitPostQueries.orderSupplyKit, [
            vendor_id,
            kit_id,
            quantity_ordered,
            total_amount,
            'pending' // order_status
        ]);

        res.status(201).json({
            message: "Supply kit ordered successfully",
            total_amount
        });

    } catch (error) {
        console.error("Error ordering supply kit:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorSupplyKits = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [orders] = await db.query(supplykitGetQueries.getVendorSupplyKits, [vendor_id]);

        res.status(200).json({
            message: "Vendor supply kit orders fetched successfully",
            orders
        });

    } catch (error) {
        console.error("Error fetching vendor supply kits:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const updateSupplyKitOrderStatus = asyncHandler(async (req, res) => {
    const { vendor_kit_id } = req.params;
    const { order_status } = req.body;

    if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(order_status)) {
        return res.status(400).json({ message: "Invalid order status" });
    }

    try {
        const delivery_date = order_status === 'delivered' ? new Date() : null;

        await db.query(supplykitPutQueries.updateVendorKitOrderStatus, [
            order_status,
            delivery_date,
            vendor_kit_id
        ]);

        res.status(200).json({
            message: "Order status updated successfully"
        });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    createSupplyKit,
    getAllSupplyKits,
    orderSupplyKit,
    getVendorSupplyKits,
    updateSupplyKitOrderStatus
};2