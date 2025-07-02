var admin = require("firebase-admin");

var serviceAccount = require("../homiqly-cbc23-firebase-adminsdk-fbsvc-4863447c27.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "homiqly-cbc23.appspot.com",
});

module.exports = admin;
