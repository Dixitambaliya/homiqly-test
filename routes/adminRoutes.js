const express = require("express")
const router = express.Router()
const { getVendor,
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
    getPackageDetails
} = require("../controller/adminController")
const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware")

const multiUpload = upload.any();

router.get("/getvendors", authenticationToken, getVendor)
router.get("/getallservicetype", authenticationToken, getAllServiceType)
router.get("/getusers", authenticationToken, getUsers)
router.get("/getbookings", authenticationToken, getBookings)
router.put("/editusers/:user_id", authenticationToken, updateUserByAdmin)
router.put("/editpackage", authenticationToken, multiUpload, handleUploads, editPackageByAdmin)
router.post("/addpackages", authenticationToken, multiUpload, handleUploads, createPackageByAdmin)
router.post("/assignpackage", authenticationToken, assignPackageToVendor)
router.delete("/deletepackage/:package_id", authenticationToken, deletePackageByAdmin)
router.get("/getallemployees", authenticationToken, getAllEmployeesForAdmin)


router.get("/getpackagelist", authenticationToken, getPackageList)
router.get("/getpackagedetails/:package_id", authenticationToken, getPackageDetails)


router.get("/getvendorapplication", authenticationToken, getAllVendorPackageRequests)
router.put("/approverejectapplication/:application_id", authenticationToken, updateVendorPackageRequestStatus)
router.get("/getpayments", authenticationToken, getAllPayments)
router.get("/getallpackages", authenticationToken, getAllPackages)
router.put("/editvendorstatus/:vendor_id", authenticationToken, toggleManualVendorAssignmentByAdmin)
router.delete("/removepackage/:vendor_packages_id", authenticationToken, removeVendorPackageByAdmin)
router.delete("/deleteusers/:user_id", authenticationToken, deleteUserByAdmin)
router.put("/editemployees/:employee_id", authenticationToken, multiUpload, handleUploads, editEmployeeProfileByAdmin)
router.delete("/delete-employee/:employee_id", authenticationToken, deleteEmployeeProfileByAdmin)

module.exports = router
