const verificationQueries = {

    vendorCheck: `SELECT vendorType FROM vendors WHERE vendor_id = ?`,

    getCompanyEmail: `SELECT companyEmail FROM company_details WHERE vendor_id = ?`,

    addVendorPassword: `UPDATE vendors SET password = ? WHERE vendor_id = ?`,

    getIndividualEmail: `SELECT email FROM individual_details WHERE vendor_id = ?`,

    vendorApprove: `UPDATE vendors SET is_authenticated = ? WHERE vendor_id = ?`,

    getServiceTypeDetails: `SELECT service_type.vendor_id,
                                   service_type.serviceTypeName,
                                   vendors.vendorType
                                        FROM service_type
                                        JOIN vendors ON service_type.vendor_id = vendors.vendor_id
                                        WHERE service_type.service_type_id = ?`,

    updateServiceTypeStatus: `
    UPDATE service_type SET is_approved = ? WHERE service_type_id = ?`,

}

module.exports = verificationQueries;