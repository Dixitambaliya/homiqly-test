const express = require("express")
const router = express.Router()

const { authenticationToken } = require("../middleware/authMiddleware");
const {
    createPromoCode,
    getAllPromoCodes,
    updatePromoCode,
    deletePromoCode,
    getUserPromoCodes,
    assignWelcomeCode,
    toggleAutoAssignWelcomeCode,
    getAutoAssignWelcomeCodeStatus
} = require("../controller/promoCode")

router.post("/createpromo", authenticationToken, createPromoCode)
router.post("/system-promo", authenticationToken, assignWelcomeCode)
router.get("/getallcodes", authenticationToken, getAllPromoCodes)
router.patch("/updatecode/:id", authenticationToken, updatePromoCode)
router.delete("/deletecode/:id", authenticationToken, deletePromoCode)
router.get("/getpromocodes", authenticationToken, getUserPromoCodes)
router.get("/getstatuscode", authenticationToken, getAutoAssignWelcomeCodeStatus)
router.patch("/changautogeneratecode", authenticationToken, toggleAutoAssignWelcomeCode)

module.exports = router;
