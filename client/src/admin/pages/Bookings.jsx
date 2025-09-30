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
  const [searchTerm, setSearchTerm] = useState("");
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

  const normalize = (v) =>
    (v === null || v === undefined ? "" : String(v)).toLowerCase().trim();

  const matchesSearch = (booking, term) => {
    if (!term) return true;
    const t = term.toLowerCase().trim();

    // possible ID fields
    const idCandidates = [
      booking.booking_id,
      booking.bookingId,
      booking.id,
      booking._id,
    ];
    const idCombined = idCandidates.filter(Boolean).join(" ");

    // possible customer name fields
    const customerCandidates = [
      booking.customerName,
      booking.customer?.name,
      booking.user?.name,
      booking.customer_name,
      booking.user_name,
    ];
    const customerCombined = customerCandidates.filter(Boolean).join(" ");

    // possible service fields
    const serviceCandidates = [
      booking.serviceName,
      booking.service?.name,
      booking.package?.title,
      booking.packageName,
      booking.productName,
    ];
    const serviceCombined = serviceCandidates.filter(Boolean).join(" ");

    // Match if term appears in id, customer, or service
    return (
      normalize(idCombined).includes(t) ||
      normalize(customerCombined).includes(t) ||
      normalize(serviceCombined).includes(t)
    );
  };

  const filteredBookings = bookings.filter((booking) => {
    // Status filter
    if (filter !== "all") {
      // bookingStatus might be number or string; convert both to string for safe compare
      const statusVal =
        booking.bookingStatus !== undefined
          ? String(booking.bookingStatus)
          : booking.status !== undefined
          ? String(booking.status)
          : "";
      if (statusVal !== String(filter)) return false;
    }

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const bookingDate = new Date(booking.bookingDate || booking.date || booking.createdAt);
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      if (isNaN(bookingDate.getTime())) {
        // if booking has invalid/missing date, exclude it when date filter applied
        return false;
      }
      if (bookingDate < start || bookingDate > end) return false;
    }

    // Search filter
    if (!matchesSearch(booking, searchTerm)) return false;

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
            b.booking_id === bookingId || b.bookingId === bookingId || b.id === bookingId
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
          <div className="flex flex-col md:flex-row md:space-x-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none md:w-48">
              <label className="text-xs block text-gray-500">Search</label>
              <input
                type="text"
                placeholder="Search by ID, customer name or service"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border px-3 py-2 rounded text-sm w-full"
              />
            </div>

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

            <div className="flex items-end space-x-2">
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

              <Button
                variant="outline"
                className="mt-4 md:mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setFilter("all");
                  setDateRange({ startDate: "", endDate: "" });
                }}
              >
                Reset All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <BookingsTable
        bookings={filteredBookings}
        isLoading={loading}
        onViewBooking={(booking) =>
          navigate(`/admin/bookings/${booking.booking_id || booking.id || booking.bookingId}`, {
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
