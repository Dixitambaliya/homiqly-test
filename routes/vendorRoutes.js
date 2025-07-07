const express = require("express")
const router = express.Router()
const { authenticationToken } = require("../middleware/authMiddleware")
const { upload, handleUploads } = require("../middleware/upload");
const {
    getVendorAssignedPackages,
    applyPackagesToVendor,
    getServiceTypesByVendor,
    getVendorService,
    getProfileVendor,
    updateProfileVendor,
    getServiceTypesByServiceId,
    deletePackage,
    editServiceType,
    getAvailablePackagesForVendor,
    getAllPackagesForVendor
} = require("../controller/vendorController")

const multiUpload = upload.any();

router.get("/getvendorservice", authenticationToken, getVendorAssignedPackages)

router.get("/getvendorservicetype", authenticationToken, getServiceTypesByVendor);
router.get("/vendorservice", authenticationToken, getVendorService);

router.get("/getprofile", authenticationToken, getProfileVendor);
router.get("/getservicetypes/:service_id", authenticationToken, getServiceTypesByServiceId);

router.get("/getpackages", authenticationToken, getAvailablePackagesForVendor)

router.get("/getallpackages", authenticationToken, getAllPackagesForVendor)
router.delete("/deletepackages/:package_id", authenticationToken, deletePackage);

router.post("/applyservice", authenticationToken, applyPackagesToVendor)

router.put("/editservicetype", authenticationToken, editServiceType)
router.put("/updateprofile", authenticationToken, multiUpload, handleUploads, updateProfileVendor);

module.exports = router;
