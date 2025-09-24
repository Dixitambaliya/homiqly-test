const express = require("express")
const router = express.Router()

const { authenticationToken } = require("../middleware/authMiddleware")
const { getServiceCategories,
    getServiceByCategory,
    getServiceNames,
    getServicestypes,
    getServiceTypesByServiceId,
    getUserData,
    updateUserData,
    addUserData,
    getPackagesByServiceTypeId,
    getPackagesDetails,
    deleteBooking,
    // getVendorPackagesByServiceTypeId,
    getPackagesByServiceType,
    getPackageDetailsById
} = require("../controller/userController")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

router.get("/service", getServiceCategories)
router.get("/servicesbycategories", getServiceByCategory)
router.get("/services/:service_id/servicetype", getServiceNames)
router.get("/services/:service_id/allservicetypes", getServiceTypesByServiceId)
router.get("/getallpackges", getServicestypes)
router.get("/getdata", authenticationToken, getUserData)
router.delete("/deletebookings/:booking_id", authenticationToken, deleteBooking)
router.get("/getpackagedetails/:service_type_id", getPackagesDetails)
router.get("/services/:service_type_id/packages", getPackagesByServiceTypeId)
// router.get("/services/:service_type_id/getpackages", getVendorPackagesByServiceTypeId)

router.get("/services/:service_type_id/getpackageimages", getPackagesByServiceType)
router.get("/services/:package_id/getpackagedetails", getPackageDetailsById)
router.put("/updatedata", multiUpload, handleUploads, authenticationToken, updateUserData)
router.put("/insertdata", authenticationToken, addUserData)

module.exports = router
