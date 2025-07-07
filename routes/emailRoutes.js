const express = require('express');
const router = express.Router();

const { sendMessageToAdmins, getAllSupportTickets } = require("../controller/email");
const { authenticationToken } = require('../middleware/authMiddleware');

router.post("/contact", authenticationToken, sendMessageToAdmins)
router.get("/gettickets", authenticationToken, getAllSupportTickets)

module.exports = router;
