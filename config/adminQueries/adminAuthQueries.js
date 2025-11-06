const adminAuthQueries = {

    adminCheck: 'SELECT * FROM admin WHERE email = ?',

    adminInsert: `INSERT INTO admin (email, name, password) VALUES (?,?,?)`,

    adminLogin: `SELECT * FROM admin WHERE email = ?`,

    adminMailCheck: `SELECT email FROM admin WHERE email = ?`,

    getAdminByEmail: `SELECT admin_id FROM admin WHERE email = ?`,

    resetAdminPassword: `UPDATE admin SET password = ? WHERE email = ?`,

    resetAdminPasswordById: "UPDATE admin SET password = ? WHERE admin_id = ?"


}

module.exports = adminAuthQueries;
