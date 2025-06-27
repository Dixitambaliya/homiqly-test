var admin = require("firebase-admin");

var serviceAccount = require("../homiqly-cbc23-firebase-adminsdk-fbsvc-890d39d22a.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://homiqly-cbc23.firebasestorage.app",
});

module.exports = admin;
