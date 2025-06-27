const supplykitPostQueries = {
    createSupplyKit: `
        INSERT INTO supply_kits (
            kit_name, 
            kit_description, 
            kit_price, 
            kit_image, 
            service_categories_id,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?)
    `,

    addSupplyKitItem: `
        INSERT INTO supply_kit_items (
            kit_id,
            item_name,
            item_description,
            quantity,
            unit_price,
            barcode
        ) VALUES (?, ?, ?, ?, ?, ?)
    `,

    orderSupplyKit: `
        INSERT INTO vendor_supply_kits (
            vendor_id,
            kit_id,
            quantity_ordered,
            total_amount,
            order_status,
            order_date
        ) VALUES (?, ?, ?, ?, ?, NOW())
    `,

    updateInventory: `
        INSERT INTO inventory (item_id, current_stock, reserved_stock, available_stock)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        current_stock = VALUES(current_stock),
        reserved_stock = VALUES(reserved_stock),
        available_stock = VALUES(available_stock)
    `,

    trackInventoryMovement: `
        INSERT INTO inventory_movements (
            item_id,
            movement_type,
            quantity,
            reference_id,
            notes
        ) VALUES (?, ?, ?, ?, ?)
    `
};

module.exports = supplykitPostQueries;