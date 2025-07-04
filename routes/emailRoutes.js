const express = require('express');
const router = express.Router();

const { sendMessageToAdmins } = require("../controller/email");
const { authenticationToken } = require('../middleware/authMiddleware');

router.post("/contact", authenticationToken, sendMessageToAdmins)

module.exports = router;
