const admin = require("firebase-admin");
const path = require("path");

// Use environment variables if available, otherwise use the service account file
let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
} else {
  const serviceAccount = require("../homiqly-cbc23-firebase-adminsdk-fbsvc-890d39d22a.json");
  credential = admin.credential.cert(serviceAccount);
}

// Initialize Firebase app if it hasn't been initialized already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: credential,
    storageBucket: "homiqly-cbc23.appspot.com",
  });
}

module.exports = admin;