const express = require("express")
const router = express.Router()
const { authenticationToken } = require("../middleware/authMiddleware")
const { upload, handleUploads } = require("../middleware/upload");
const { getVendorServices,
    vendorSelectOrAddPackage,
    getServiceTypesByVendor,
    getVendorService,
    getProfileVendor,
    updateProfileVendor,
    getServiceTypesByServiceId,
    deletePackage,
    editServiceType,
    getPackagesForVendor
} = require("../controller/vendorController")

const multiUpload = upload.any();

router.get("/getvendorservice", authenticationToken, getVendorServices)
router.get("/getvendorservicetype", authenticationToken, getServiceTypesByVendor);
router.get("/vendorservice", authenticationToken, getVendorService);
router.get("/getprofile", authenticationToken, getProfileVendor);

router.get("/getservicetypes/:service_id", authenticationToken, getServiceTypesByServiceId);
router.get("/getpackages", authenticationToken, getPackagesForVendor)

router.delete("/deletepackages/:package_id", authenticationToken, deletePackage);

router.post("/applyservicetype", authenticationToken, multiUpload, handleUploads, vendorSelectOrAddPackage)
router.put("/editservicetype", authenticationToken, editServiceType)
router.put("/updateprofile", authenticationToken, multiUpload, handleUploads, updateProfileVendor);

module.exports = router;
