const vendorAuthQueries = {

    insertVendor: `INSERT INTO vendors (
                        vendorType,
                        password)
                        VALUES (?, ?)`,

    insertCompanyDetails: `INSERT INTO company_details (
                                vendor_id,
                                companyName,
                                contactPerson,
                                 companyEmail,
                                 googleBusinessProfileLink,
                                 companyPhone,
                                 companyAddress,
                                 expertise,
                                 serviceLocation
                                 ) VALUES (?, ?,?, ?, ?, ?,?,?,?)`,

    insertIndividualDetails: `INSERT INTO individual_details (
                                    vendor_id,
                                    name,
                                    phone,
                                    email,
                                    resume,
                                    aboutme,
                                    expertise,
                                    serviceLocation ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,


    insertIndividualServiceCategory: `INSERT INTO individual_service_categories
                                            (vendor_id,
                                            service_categories_id
                                            ) VALUES (?, ?)`,

    insertCompanyServiceCategory: `INSERT INTO company_service_categories
                                                (vendor_id,
                                                service_categories_id
                                                ) VALUES (?, ?)`,

    checkserviceExits: `SELECT 1 FROM services WHERE service_id = ? AND service_categories_id = ?`,

    insertIndividualService: `INSERT INTO individual_services (
                                        vendor_id,
                                        service_id,
                                        serviceLocation
                                        ) VALUES (?, ?, ?)`,

    insertCompanyService: `INSERT INTO company_services (
                                            vendor_id,
                                            service_id,
                                            serviceLocation
                                            ) VALUES (?, ?, ?)`,

    vendorLoginIndividual: `SELECT vendor_id, name , email FROM individual_details WHERE email = ?`,

    vendorLoginCompany: `SELECT vendor_id, companyName AS name , companyEmail AS email FROM company_details WHERE companyEmail = ?`,

    vendorCompanyEmail: 'SELECT companyEmail AS email FROM company_details WHERE companyEmail = ?',

    vendorIndividualEmail: 'SELECT email FROM individual_details WHERE email = ?',

    getVendorIdbycompanyEmail: "SELECT vendor_id FROM company_details WHERE companyEmail = ?",

    getVendorIdbyEmail: "SELECT vendor_id FROM individual_details WHERE email = ?",


    resetVendorPassword: 'UPDATE vendors SET password = ? WHERE vendor_id = ?',

    selectPassword: "SELECT password FROM vendors WHERE vendor_id = ?",

    resetVendorPassword: 'UPDATE vendors SET password = ? WHERE vendor_id = ?',
    checkCategoryExits: `SELECT 1 FROM service_categories WHERE service_categories_id = ?`,

}

module.exports = vendorAuthQueries;
