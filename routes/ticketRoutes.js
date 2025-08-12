const express = require('express');
const router = express.Router();

const { sendMessageToAdmins,
    getAllSupportTickets,
    deleteTicket
} = require("../controller/ticket");
const { authenticationToken } = require('../middleware/authMiddleware');

router.post("/contact", authenticationToken, sendMessageToAdmins)
router.get("/gettickets", authenticationToken, getAllSupportTickets)
router.delete("/deleteticket/:ticket_id", authenticationToken, deleteTicket)

module.exports = router;
