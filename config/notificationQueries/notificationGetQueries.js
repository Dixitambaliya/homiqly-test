const notificationGetQueries = {

    getAllUsers: `
SELECT 
    user_id, 
    TRIM(CONCAT(COALESCE(firstName, ''), ' ', COALESCE(lastName, ''))) AS fullName
    FROM users
    ORDER BY created_at DESC
`,

    getAllVendors: `
      SELECT
          v.vendor_id,
          v.vendorType,
          CONCAT_WS(' ' ,id.name, cd.companyName) AS vendorName

      FROM vendors v
      LEFT JOIN individual_details id ON v.vendor_id = id.vendor_id
      LEFT JOIN company_details cd ON v.vendor_id = cd.vendor_id
      LEFT JOIN vendor_settings vs ON v.vendor_id = vs.vendor_id
      ORDER BY v.vendor_id DESC
    `,

    getAllEmployee: `
    SELECT 
        employee_id, TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS fullName     
        FROM company_employees
        WHERE vendor_id = ?
        ORDER BY created_at DESC
    `
}

module.exports = notificationGetQueries;