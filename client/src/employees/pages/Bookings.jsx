import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiRefreshCw } from "react-icons/fi";
import BookingsTable from "../components/Tables/BookingsTable";
import { Button } from "../../shared/components/Button";
import { FormSelect } from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/employee/getbookingemployee");
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const response = await axios.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status,
      });

      if (response.status === 200) {
        setBookings((prev) =>
          prev.map((b) =>
            b.booking_id === bookingId || b.bookingId === bookingId
              ? { ...b, bookingStatus: status }
              : b
          )
        );
        toast.success(
          `Booking ${status === 1 ? "approved" : "rejected"} successfully`
        );
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update booking status"
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Employees Booking Management
        </h2>
        <div className="flex space-x-2">
          <FormSelect
            name="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "all", label: "All Bookings" },
              { value: "0", label: "Pending" },
              { value: "1", label: "Approved" },
              { value: "2", label: "Cancelled" },
            ]}
            className="mb-0 w-40"
          />
          <Button
            onClick={fetchBookings}
            variant="outline"
            icon={<FiRefreshCw className="mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      ) : (
        <BookingsTable
          bookings={bookings}
          isLoading={loading}
          onApproveBooking={(id) => handleUpdateStatus(id, 1)}
          onRejectBooking={(id) => handleUpdateStatus(id, 2)}
          filteredStatus={filter !== "all" ? parseInt(filter) : undefined}
        />
      )}
    </div>
  );
};

export default Bookings;
