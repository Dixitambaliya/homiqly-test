const express = require("express")
const router = express.Router()
const { getVendor,
    getAllServiceType,
    getUsers,
    updateUserByAdmin,
    getBookings,
    createPackageByAdmin,
    getAdminCreatedPackages,
    assignPackageToVendor
} = require("../controller/adminController")
const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware")

const multiUpload = upload.any();

router.get("/getvendors", authenticationToken, getVendor)
router.get("/getallservicetype", authenticationToken, getAllServiceType)
router.get("/getusers", authenticationToken, getUsers)
router.get("/getbookings", authenticationToken, getBookings)
router.put("/editusers/:user_id", authenticationToken, updateUserByAdmin)
router.post("/addpackages", authenticationToken, multiUpload, handleUploads, createPackageByAdmin)

router.post("/assignpackage",assignPackageToVendor)

router.get("/getpackages", authenticationToken, getAdminCreatedPackages)
module.exports = router
