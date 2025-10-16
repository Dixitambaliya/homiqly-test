const express = require("express")
const router = express.Router()

const { registerVendorLogin, getVendorRegistrations } = require("../controller/vendorTemporary")
const { upload, handleUploads } = require("../middleware/upload");
const multiUpload = upload.any();

router.post('/registertemporary', multiUpload, handleUploads, registerVendorLogin);
router.get('/get-temp-vendor', getVendorRegistrations);

module.exports = router;