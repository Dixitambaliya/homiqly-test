const express = require("express");
const router = express.Router();

const { authenticationToken } = require("../middleware/authMiddleware");
const { createPromoCode, getAllPromoCodes, updatePromoCode, deletePromoCode, getUserPromoUsage } = require("../controller/promoCode")

router.post("/createpromo", authenticationToken, createPromoCode)
router.get("/getallcodes", authenticationToken, getAllPromoCodes)
router.patch("/updatecode/:promo_id", authenticationToken, updatePromoCode)
router.delete("/deletecode/:promo_id", authenticationToken, deletePromoCode)

router.get("/getpromocodes", authenticationToken, getUserPromoUsage)
// router.post("/applypromocode", authenticationToken, applyPromoCodeToCart)

module.exports = router;
