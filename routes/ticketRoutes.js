const express = require("express");
const router = express.Router();

const {
  sendMessageToAdmins,
  getAllSupportTickets,
  deleteTicket,
  getVendorSupportTickets,
} = require("../controller/ticket");
const { authenticationToken } = require("../middleware/authMiddleware");

router.post("/contact", authenticationToken, sendMessageToAdmins);
router.get("/gettickets", authenticationToken, getAllSupportTickets);
router.get("/vendor", authenticationToken, getVendorSupportTickets); // <-- new route
router.delete("/deleteticket/:ticket_id", authenticationToken, deleteTicket);

module.exports = router;
