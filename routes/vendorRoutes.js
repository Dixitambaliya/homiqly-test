const express = require("express");
const router = express.Router();

const { authenticationToken } = require("../middleware/authMiddleware");
const vendorAuthMiddleware = require("../middleware/vendorAuthMiddleware");

const { upload, handleUploads } = require("../middleware/upload");
const multiUpload = upload.any();

// Apply both middlewares to ALL vendor routes
router.use(authenticationToken);      // decode JWT
router.use(vendorAuthMiddleware);     // verify vendor_id

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
    getVendorPayoutHistory,
    updateBookingStatusByVendor,
    getVendorDashboardStats,
    removeVendorPackage,
    editEmployeeProfileByCompany,
    getServicesWithPackages,
    getAdminCreatedPackages
} = require("../controller/vendorController");


// 📌 Vendor Routes (NO need for authenticationToken on each)
router.get("/serviceswithpackages", getServicesWithPackages);
router.get("/getvendorservice", getVendorAssignedPackages);
router.get("/getvendorservicetype", getServiceTypesByVendor);
router.get("/vendorservice", getVendorService);
router.get("/getprofile", getProfileVendor);
router.get("/getservicetypes/:service_id", getServiceTypesByServiceId);
router.get("/getpackages", getAvailablePackagesForVendor);
router.get("/getallpackages", getAllPackagesForVendor);
router.delete("/deletepackages/:package_id", deletePackage);
router.post("/applyservice", applyPackagesToVendor);
router.get("/getstats", getVendorDashboardStats);
router.post("/packagerating", addRatingToPackages);
router.put("/editservicetype", editServiceType);
router.put("/updateprofile",multiUpload,handleUploads,updateProfileVendor);
router.get("/getstatus", getManualAssignmentStatus);
router.get("/admingetpackages", getAdminCreatedPackages);
router.get("/getpaymenthistory", getVendorPayoutHistory);
router.put("/updatebookingstatus", updateBookingStatusByVendor);
router.put("/togglechange", toggleManualVendorAssignment);
router.put("/employee/:employee_id",multiUpload,handleUploads,editEmployeeProfileByCompany);
router.delete("/removepackage/:vendor_packages_id", removeVendorPackage);

module.exports = router;
