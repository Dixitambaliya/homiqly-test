const express = require("express");
const router = express.Router();
const { authenticationToken } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminAuth");
const { setAdminCode, getAdminCode } = require("../controller/superAdminController");

router.post("/set-code", authenticationToken, adminOnly, setAdminCode);
router.get("/get-code", authenticationToken, adminOnly, getAdminCode);

module.exports = router;