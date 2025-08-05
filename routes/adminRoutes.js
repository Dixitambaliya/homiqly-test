const express = require("express")
const router = express.Router()
const { getVendor,
    getAllServiceType,
    getUsers,
    updateUserByAdmin,
    getBookings,
    createPackageByAdmin,
    getAdminCreatedPackages,
    assignPackageToVendor,
    editPackageByAdmin,
    deletePackageByAdmin,
    getAllPayments,
    getAllPackages
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
router.get("/getpackages", authenticationToken, getAdminCreatedPackages)

router.get("/getpayments", authenticationToken, getAllPayments)
router.get("/getallpackages", authenticationToken, getAllPackages)

module.exports = router
