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
    getVendorPackagesDetailed
} = require("../controller/userController")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

router.get("/service", getServiceCategories)
router.get("/servicesbycategories", getServiceByCategory)
router.get("/services/:service_id/servicetype", getServiceNames)
router.get("/services/:service_id/allservicetypes", getServiceTypesByServiceId)

router.get("/getallpackges", authenticationToken, getServicestypes)

router.get("/getdata", authenticationToken, getUserData)

router.get("/getpackagedetails/:vendor_id", authenticationToken, getVendorPackagesDetailed)

router.get("/services/:service_type_id/packages", authenticationToken, getPackagesByServiceTypeId)
router.put("/updatedata", multiUpload, handleUploads, authenticationToken, updateUserData)
router.put("/insertdata", authenticationToken, addUserData)

module.exports = router
