const userAuthQueries = {
  userInsert: `INSERT INTO users (firstName, lastName, email, phone, profileImage, fcmToken) VALUES (?, ?, ?, ?, ?, ?)`,

  userInsert1 : `INSERT INTO users (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)`,

  userMailCheck: 'SELECT * FROM users WHERE email = ?',

  userSetPassword: `UPDATE users SET password = ? WHERE email = ? AND (password IS NULL OR password = '')`,

  userLogin: `SELECT * FROM users WHERE email = ?`,

  GetUserOnMail: "SELECT * FROM users WHERE email = ?",

  PasswordUpdate: "UPDATE users SET password = ? WHERE email = ?",

}

module.exports = userAuthQueries;