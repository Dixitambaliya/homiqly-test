import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import api from "../../lib/axiosConfig";
import TicketsTable from "../components/Tables/TicketsTable"; // Update the path as needed
import axios from "axios";
import { toast } from "react-toastify";

const Tickets = () => {
  const { currentUser } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/gettickets");
      console.log("Raw API response:", response.data);
      setTickets(response.data?.tickets || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;

    try {
      setLoading(true);
      await axios.delete(`/api/deleteticket/${ticketId}`);
      setTickets((prev) =>
        prev.filter((ticket) => ticket.ticket_id !== ticketId)
      );
      toast.success("Ticket deleted successfully.");
      fetchTickets(); // Refresh the ticket list
    } catch (error) {
      toast.error("Failed to delete ticket.");
      console.error("Error deleting ticket:", error);
      alert("Failed to delete ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (ticket) => {
    console.log("View Ticket:", ticket);
    // Optionally open a modal or route to ticket detail
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">Support Tickets</h1>
        <p className="text-gray-600">Manage customer support queries here.</p>
      </div>

      <TicketsTable
        tickets={tickets}
        isLoading={loading}
        onViewTicket={handleViewTicket}
        onDeleteTicket={handleDeleteTicket}
      />
    </div>
  );
};

export default Tickets;
