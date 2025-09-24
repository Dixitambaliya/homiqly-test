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
    getServiceTypeById,
    addServiceFilter,
    getServiceFilters,
    updateServiceFilter,
    deleteServiceFilter,
    getAdminServicesWithfilter
} = require("../controller/serviceController")
const { upload, handleUploads } = require("../middleware/upload");

const multiUpload = upload.any();

const { authenticationToken } = require("../middleware/authMiddleware")

router.post("/addservice", multiUpload, handleUploads, authenticationToken, addService)
router.put("/editService", multiUpload, handleUploads, editService);

router.post("/addservicefilter", multiUpload, handleUploads, addServiceFilter);
router.get("/getservicefilter", authenticationToken, getServiceFilters);
router.put("/updateservicefilter/:service_filter_id", authenticationToken, updateServiceFilter);
router.delete("/deleteservicefilter/:service_filter_id", authenticationToken, deleteServiceFilter);

router.post("/addservicetype", multiUpload, handleUploads, authenticationToken, addServiceType)
router.get("/getservicetype/:service_id", authenticationToken, getServiceTypeById)

router.get("/getcategorywithservices", authenticationToken, getAdminServicesWithfilter)

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
