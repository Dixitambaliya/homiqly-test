const adminPostQueries = {

   insertServiceType: `
    INSERT INTO service_type (service_id, serviceTypeName, serviceTypeMedia)
    VALUES (?, ?, ?)
  `,

  insertPackage: `
    INSERT INTO packages
    (service_type_id, packageName, description, totalPrice, totalTime, packageMedia)
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  insertPackageItem: `
    INSERT INTO package_items
    (package_id, itemName, description, price, timeRequired, itemMedia)
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  insertBookingPreference: `
    INSERT INTO booking_preferences (package_id, preferenceValue , preferencePrice)
    VALUES (?, ?, ?)
  `,
  
    checkPackageExists: `SELECT package_id FROM packages WHERE package_id = ?`,

  insertVendorPackage: `
    INSERT IGNORE INTO vendor_packages (vendor_id, package_id)
    VALUES (?, ?)
  `,

  checkPackageItemExists: `
    SELECT item_id FROM package_items WHERE item_id = ? AND package_id = ?
  `,

  insertVendorPackageItem: `
    INSERT IGNORE INTO vendor_package_items (vendor_id, package_id, package_item_id)
    VALUES (?, ?, ?)
  `,

  checkPreferenceExists: `
    SELECT preference_id FROM booking_preferences WHERE preference_id = ? AND package_id = ?
  `,

  insertVendorPackagePreference: `
    INSERT IGNORE INTO vendor_package_preferences (vendor_id, package_id, preference_id)
    VALUES (?, ?, ?)
  `,

}

module.exports = adminPostQueries;