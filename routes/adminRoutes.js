const express = require("express")
const router = express.Router()

const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");
const { authenticationToken } = require("../middleware/authMiddleware");
const { upload, handleUploads } = require("../middleware/upload");

router.use(authenticationToken);  
router.use(adminAuthMiddleware);

const {
    getAdminProfile,
    editAdminProfile,
    getVendor,
    getAllServiceType,
    getUsers,
    updateUserByAdmin,
    getBookings,
    createPackageByAdmin,
    assignPackageToVendor,
    editPackageByAdmin,
    deletePackageByAdmin,
    getAllPayments,
    getAllPackages,
    getAllEmployeesForAdmin,
    getAllVendorPackageRequests,
    updateVendorPackageRequestStatus,
    toggleManualVendorAssignmentByAdmin,
    removeVendorPackageByAdmin,
    deleteUserByAdmin,
    editEmployeeProfileByAdmin,
    deleteEmployeeProfileByAdmin,
    getPackageList,
    getPackageDetails,
    getAdminCreatedPackages,
    adminUpdateVendorCities

} = require("../controller/adminController")

const multiUpload = upload.any();

router.get("/getprofile", getAdminProfile)
router.patch("/editprofile", editAdminProfile)
router.get("/getvendors", getVendor)
router.get("/getallservicetype", getAllServiceType)
router.get("/getusers", getUsers)
router.get("/getbookings", getBookings)
router.put("/editusers/:user_id", updateUserByAdmin)
router.put("/editpackage", multiUpload, handleUploads, editPackageByAdmin)
router.post("/addpackages", multiUpload, handleUploads, createPackageByAdmin)
router.post("/assignpackage", assignPackageToVendor)
router.delete("/deletepackage/:package_id", deletePackageByAdmin)
router.get("/getallemployees", getAllEmployeesForAdmin)
router.get("/getpackagelist", getPackageList)
router.get("/getpackagedetails/:package_id", getPackageDetails)
router.get("/getpackages", getAdminCreatedPackages)
router.get("/getvendorapplication", getAllVendorPackageRequests)
router.put("/approverejectapplication/:application_id", updateVendorPackageRequestStatus)
router.get("/getpayments", getAllPayments)
router.get("/getallpackages", getAllPackages)
router.put("/editvendorstatus/:vendor_id", toggleManualVendorAssignmentByAdmin)
router.delete("/removepackage/:vendor_packages_id", removeVendorPackageByAdmin)
router.delete("/deleteusers/:user_id", deleteUserByAdmin)
router.put("/editemployees/:employee_id", multiUpload, handleUploads, editEmployeeProfileByAdmin)

router.patch("/update-service-location/:vendor_id", adminUpdateVendorCities)

router.delete("/delete-employee/:employee_id", deleteEmployeeProfileByAdmin)

module.exports = router
