import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import { FiEye, FiRefreshCw } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import BookingDetailsModal from "../components/Modals/BookingDetailsModal";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button/Button";
import BookingsTable from "../components/Tables/BookingsTable";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  // const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/getbookings");
      console.log("Bookings response:", response.data.bookings);
      const bookingsList = response.data.bookings || [];
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => setFilter(e.target.value);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter !== "all" && booking.bookingStatus !== parseInt(filter)) {
      return false;
    }
    if (dateRange.startDate && dateRange.endDate) {
      const bookingDate = new Date(booking.bookingDate);
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      if (bookingDate < start || bookingDate > end) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const response = await api.put("/api/booking/approveorrejectbooking", {
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
      toast.error("Failed to update booking status");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Booking Management</h2>
        <Button
          onClick={fetchBookings}
          variant="lightInherit"
          className="flex items-center"
        >
          <FiRefreshCw className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          <div className="flex flex-col md:flex-row md:space-x-4">
            <div>
              <label className="text-xs block text-gray-500">Status</label>
              <select
                value={filter}
                onChange={handleFilterChange}
                className="border px-3 py-2 rounded text-sm"
              >
                <option value="all">All</option>
                <option value="0">Pending</option>
                <option value="1">Approved</option>
                <option value="2">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs block text-gray-500">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="border px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs block text-gray-500">End Date</label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="border px-3 py-2 rounded text-sm"
              />
            </div>
            <Button
              variant="ghost"
              className="mt-4 md:mt-4"
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <BookingsTable
        bookings={filteredBookings}
        isLoading={loading}
        onViewBooking={(booking) =>
          navigate(`/admin/bookings/${booking.booking_id}`, {
            state: { booking },
          })
        }
        onApprove={(bookingId) => handleUpdateStatus(bookingId, 1)}
        onReject={(bookingId) => handleUpdateStatus(bookingId, 2)}
      />
    </div>
  );
};

export default Bookings;
