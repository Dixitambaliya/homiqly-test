const adminPutQueries = {

  getUserById: `
  SELECT * FROM users WHERE user_id = ?
  `,

  getPackageById: `
  SELECT * FROM packages WHERE package_id = ?
  `,

  updatePackage: `
    UPDATE packages
SET packageName = ?, description = ?, totalPrice = ?, totalTime = ?, packageMedia = ?
WHERE package_id = ?;
`,

  getAddonById: `
SELECT * FROM package_addons WHERE addon_id = ?;
`,

  insertAddon: `
  INSERT INTO package_addons(package_id, addonName, addonDescription, addonPrice, addonTime, addonMedia)
  VALUES(?, ?, ?, ?, ?, ?);
`,

  updateAddon: `
  UPDATE package_addons
  SET addonName = ?,
  addonDescription = ?,
  addonPrice = ?,
  addonTime = ?,
  addonMedia = ?
    WHERE addon_id = ? AND package_id = ?
      `,

  updateUserById: `
    UPDATE users
    SET firstName = ?, lastName = ?, email = ?, phone = ?, is_approved = ?
  WHERE user_id = ?
    `,
  getPackageItemById: `
  SELECT * FROM package_items WHERE item_id = ? 
  `,

  // Update sub-package item
  updatePackageItem: `
    UPDATE package_items
    SET itemName = ?, description = ?, price = ?, timeRequired = ?, itemMedia = ?
  WHERE item_id = ? AND package_id = ?
    `,

  // Insert new sub-package item
  insertPackageItem: `
    INSERT INTO package_items(package_id, itemName, description, price, timeRequired, itemMedia)
VALUES(?, ?, ?, ?, ?, ?)
  `,

  // Delete removed sub-package items
  deleteRemovedPackageItems: `
    DELETE FROM package_items
    WHERE package_id = ? AND item_id NOT IN(?)
  `,

  // Delete all items if none submitted
  deleteAllPackageItems: `
    DELETE FROM package_items WHERE package_id = ?
  `,

  // Delete existing preferences
  deletePackagePreferences: `
    DELETE FROM booking_preferences WHERE package_id = ?
  `,

  // Insert new preference
  insertPackagePreference: `
    INSERT INTO booking_preferences(package_id, preferenceValue)
VALUES(?, ?)
  `,
  toggleManualVendorAssignment: `
    INSERT INTO settings(setting_key, setting_value)
VALUES('manual_vendor_assignment', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
  `

};


module.exports = adminPutQueries;
