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
    getAllPackagesForVendor,
    addRatingToPackages,
    toggleManualVendorAssignment,
    getManualAssignmentStatus,
    getVendorFullPaymentHistory,
    updateBookingStatusByVendor,
    getVendorDashboardStats,
    removeVendorPackage,
    editEmployeeProfileByCompany,
    getServicesWithPackages
} = require("../controller/vendorController")

const multiUpload = upload.any();

router.get("/serviceswithpackages", getServicesWithPackages)

router.get("/getvendorservice", authenticationToken, getVendorAssignedPackages)
router.get("/getvendorservicetype", authenticationToken, getServiceTypesByVendor);
router.get("/vendorservice", authenticationToken, getVendorService);
router.get("/getprofile", authenticationToken, getProfileVendor);
router.get("/getservicetypes/:service_id", authenticationToken, getServiceTypesByServiceId);
router.get("/getpackages", authenticationToken, getAvailablePackagesForVendor)
router.get("/getallpackages", authenticationToken, getAllPackagesForVendor)
router.delete("/deletepackages/:package_id", authenticationToken, deletePackage);
router.post("/applyservice", authenticationToken, applyPackagesToVendor)
router.get("/getstats", authenticationToken, getVendorDashboardStats)
router.post("/packagerating", authenticationToken, addRatingToPackages)
router.put("/editservicetype", authenticationToken, editServiceType)
router.put("/updateprofile", authenticationToken, multiUpload, handleUploads, updateProfileVendor);
router.get("/getstatus", authenticationToken, getManualAssignmentStatus)
router.get("/getpaymenthistory", authenticationToken, getVendorFullPaymentHistory)
router.put("/updatebookingstatus", authenticationToken, updateBookingStatusByVendor)
router.put("/togglechange", authenticationToken, toggleManualVendorAssignment)

router.put("/employee/:employee_id", multiUpload, handleUploads, authenticationToken, editEmployeeProfileByCompany)
router.delete("/removepackage/:vendor_packages_id", authenticationToken, removeVendorPackage)


module.exports = router;
