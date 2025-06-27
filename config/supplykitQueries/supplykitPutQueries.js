const supplykitPutQueries = {
    updateSupplyKit: `
        UPDATE supply_kits 
        SET kit_name = ?, kit_description = ?, kit_price = ?, kit_image = ?, service_categories_id = ?, is_active = ?
        WHERE kit_id = ?
    `,

    updateSupplyKitItem: `
        UPDATE supply_kit_items 
        SET item_name = ?, item_description = ?, quantity = ?, unit_price = ?, barcode = ?
        WHERE item_id = ?
    `,

    updateVendorKitOrderStatus: `
        UPDATE vendor_supply_kits 
        SET order_status = ?, delivery_date = ?
        WHERE vendor_kit_id = ?
    `,

    updateInventoryStock: `
        UPDATE inventory 
        SET current_stock = ?, reserved_stock = ?, available_stock = ?
        WHERE item_id = ?
    `
};

module.exports = supplykitPutQueries;