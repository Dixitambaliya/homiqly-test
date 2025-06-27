const express = require("express")
const router = express.Router()

const { authenticationToken } = require("../middleware/authMiddleware")
const { getServiceCategories,
    getServiceByCategory,
    getServiceNames,
    getApprovedServices,
    getServiceTypesByServiceId,
    getUserData,
    updateUserData,
    addUserData
} = require("../controller/userController")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

router.get("/service", getServiceCategories)
router.get("/servicesbycategories", getServiceByCategory)
router.get("/services/:service_id/servicetype", getServiceNames)
router.get("/services/:service_id/vendorservice", getServiceTypesByServiceId)
router.get("/getallservicetypes", getApprovedServices)
router.get("/getdata", authenticationToken, getUserData)
router.put("/updatedata", multiUpload, handleUploads, authenticationToken, updateUserData)
router.put("/insertdata", authenticationToken, addUserData)

module.exports = router