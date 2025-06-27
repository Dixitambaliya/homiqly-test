const supplykitGetQueries = {
    getAllSupplyKits: `
        SELECT 
            sk.kit_id,
            sk.kit_name,
            sk.kit_description,
            sk.kit_price,
            sk.kit_image,
            sk.service_categories_id,
            sc.serviceCategory,
            sk.is_active,
            sk.created_at,
            
            COALESCE((
                SELECT CONCAT('[', GROUP_CONCAT(
                    JSON_OBJECT(
                        'item_id', ski.item_id,
                        'item_name', ski.item_name,
                        'item_description', ski.item_description,
                        'quantity', ski.quantity,
                        'unit_price', ski.unit_price,
                        'barcode', ski.barcode
                    )
                ), ']')
                FROM supply_kit_items ski
                WHERE ski.kit_id = sk.kit_id
            ), '[]') AS items
            
        FROM supply_kits sk
        LEFT JOIN service_categories sc ON sk.service_categories_id = sc.service_categories_id
        ORDER BY sk.created_at DESC
    `,

    getSupplyKitById: `
        SELECT 
            sk.*,
            sc.serviceCategory
        FROM supply_kits sk
        LEFT JOIN service_categories sc ON sk.service_categories_id = sc.service_categories_id
        WHERE sk.kit_id = ?
    `,

    getSupplyKitItems: `
        SELECT * FROM supply_kit_items WHERE kit_id = ?
    `,

    getVendorSupplyKits: `
        SELECT 
            vsk.vendor_kit_id,
            vsk.kit_id,
            vsk.vendor_id,
            vsk.quantity_ordered,
            vsk.total_amount,
            vsk.order_status,
            vsk.order_date,
            vsk.delivery_date,
            sk.kit_name,
            sk.kit_description,
            sk.kit_price,
            sk.kit_image
        FROM vendor_supply_kits vsk
        JOIN supply_kits sk ON vsk.kit_id = sk.kit_id
        WHERE vsk.vendor_id = ?
        ORDER BY vsk.order_date DESC
    `,

    getSupplyKitInventory: `
        SELECT 
            ski.item_id,
            ski.item_name,
            ski.quantity as kit_quantity,
            ski.barcode,
            COALESCE(inv.current_stock, 0) as current_stock,
            COALESCE(inv.reserved_stock, 0) as reserved_stock,
            COALESCE(inv.available_stock, 0) as available_stock
        FROM supply_kit_items ski
        LEFT JOIN inventory inv ON ski.item_id = inv.item_id
        WHERE ski.kit_id = ?
    `
};

module.exports = supplykitGetQueries;