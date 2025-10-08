const express = require("express");
const router = express.Router();
const {
    createServiceTax,
    getAllServiceTaxes,
    updateServiceTax,
    deleteServiceTax
} = require("../controller/serviceTaxController");
const { authenticationToken } = require('../middleware/authMiddleware');


router.post("/createservicetax", authenticationToken, createServiceTax);
router.get("/getservicetax", authenticationToken, getAllServiceTaxes);
router.put("/updateservicetax/:service_taxes_id", authenticationToken, updateServiceTax);
router.delete("/deletetax/:service_taxes_id", authenticationToken, deleteServiceTax);

module.exports = router;
