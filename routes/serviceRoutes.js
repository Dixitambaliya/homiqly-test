const express = require("express")
const router = express.Router()
const { addService,
    getcity,
    addServiceCity,
    getService,
    addCategory,
    getServiceCategories,
    addServiceType,
    editService,
    deleteService,
    editCategory,
    deleteCategory,
    editServiceCity,
    deleteServiceCity,
    getAdminService,
    getServiceTypeById
} = require("../controller/serviceController")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

const { authenticationToken } = require("../middleware/authMiddleware")

router.post("/addservice", multiUpload, handleUploads, authenticationToken, addService)

router.put("/editService", multiUpload, handleUploads, editService);

router.post("/addservicetype", multiUpload, handleUploads, authenticationToken, addServiceType)
router.get("/getservicetype/:service_id", authenticationToken, getServiceTypeById)

router.post("/addcategory", authenticationToken, addCategory)
router.get("/getcity", getcity)

router.post("/addcity", authenticationToken, addServiceCity)
router.get("/getservicecategories", getServiceCategories)
router.get("/getservices", getService)


router.get("/getadminservices", getAdminService)



router.put('/editservice', editService);
router.delete('/deleteservice', deleteService);

router.put('/editcategory', editCategory);
router.delete('/deletecategory', deleteCategory);

router.put('/editservicecity', editServiceCity);
router.delete('/deleteservicecity/:service_city_id', deleteServiceCity);

module.exports = router
