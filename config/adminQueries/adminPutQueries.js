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
  INSERT INTO package_addons(package_item_id, addonName, addonDescription, addonPrice, addonTime, addonMedia)
  VALUES(?, ?, ?, ?, ?, ?);
`,

  updateAddon: `
  UPDATE package_addons
  SET addonName = ?,
  addonDescription = ?,
  addonPrice = ?,
  addonTime = ?,
  addonMedia = ?
    WHERE addon_id = ? AND package_item_id = ?
      `,

  updatePackagePreference: `
UPDATE booking_preferences
SET preferenceValue = ?, preferencePrice = ?, preferenceGroup = ?
WHERE preference_id = ? AND package_item_id = ?

`,

  getPreferenceById: `
     SELECT * FROM booking_preferences 
    WHERE preference_id = ? 
    LIMIT 1 
`,
  deleteRemovedPreferences: `
  DELETE FROM booking_preferences 
    WHERE package_item_id = ? AND preferenceGroup = ? AND preference_id NOT IN (?)
`,

  getConsentFormById: `
  SELECT * FROM package_consent_forms WHERE consent_id = ? `
  ,

  updateConsentForm: `
  UPDATE 
  package_consent_forms 
  SET question = ?, is_required = ? 
  WHERE consent_id = ? AND package_id = ?`
  ,

  insertConsentForm: `
  INSERT INTO package_consent_forms 
    (package_id, question, is_required) 
    VALUES (?, ?, ?)`
  ,

  deleteRemovedConsentForms: `
  DELETE 
  FROM package_consent_forms 
      WHERE package_id = ? AND consent_id NOT IN (?)`
  ,

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

  deleteRemovedAddons: `
    DELETE FROM package_addons
    WHERE package_item_id = ? AND addon_id NOT IN (?)
  `,

  // Insert new preference
  insertPackagePreference: `
    INSERT INTO booking_preferences (package_item_id, preferenceGroup, preferenceValue, preferencePrice) 
    VALUES (?, ?, ?, ?)
  `,
  toggleManualVendorAssignment: `
    INSERT INTO settings(setting_key, setting_value)
VALUES('manual_vendor_assignment', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
  `

};


module.exports = adminPutQueries;
