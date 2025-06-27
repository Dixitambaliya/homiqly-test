const express = require("express")
const router = express.Router()
const { authenticationToken } = require("../middleware/authMiddleware")
const { upload, handleUploads } = require("../middleware/upload");
const { getVendorServices,
    applyForServiceType,
    getServiceTypesByVendor,
    getVendorService,
    getProfileVendor,
    updateProfileVendor,
    editServiceType } = require("../controller/vendorController")

const multiUpload = upload.any();

router.get("/getvendorservice", authenticationToken, getVendorServices)
router.get("/getvendorservicetype", authenticationToken, getServiceTypesByVendor);
router.get("/vendorservice", authenticationToken, getVendorService);
router.get("/getprofile", authenticationToken, getProfileVendor);

router.post("/applyservicetype", authenticationToken, multiUpload, handleUploads, applyForServiceType)
router.put("/editservicetype", authenticationToken, editServiceType)
router.put("/updateprofile", authenticationToken, multiUpload, handleUploads, updateProfileVendor);

module.exports = router;
