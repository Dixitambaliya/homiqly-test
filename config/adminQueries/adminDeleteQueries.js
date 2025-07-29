const adminDeleteQueries = {

      checkPackageExists: `
    SELECT package_id FROM packages WHERE package_id = ?
  `,

  deletePackageById: `
    DELETE FROM packages WHERE package_id = ?
  `

}

module.exports = adminDeleteQueries;