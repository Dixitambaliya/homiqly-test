import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button/Button";
import BookingsTable from "../components/Tables/BookingsTable";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { RefreshCcw, Search } from "lucide-react";

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
      booking.userName,
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
      const bookingDate = new Date(
        booking.bookingDate || booking.date || booking.createdAt
      );
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
            b.booking_id === bookingId ||
            b.bookingId === bookingId ||
            b.id === bookingId
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
    <div className="mx-auto max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Admin Booking Management
        </h2>
        <Button
          onClick={fetchBookings}
          variant="lightInherit"
          className="flex items-center"
          icon={<RefreshCcw />}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Search (bigger on md) */}
          <div className="md:col-span-2">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              id="search"
              label="Search"
              type="text"
              placeholder="Search by ID, customer name or service"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search bookings"
            />
          </div>

          {/* Status */}
          <div className="md:col-span-1">
            <FormSelect
              label="Status"
              id="status"
              value={filter}
              onChange={handleFilterChange}
              options={[
                { value: "all", label: "All" },
                {
                  value: "0",
                  label: "pending",
                },
                {
                  value: "1",
                  label: "Approved",
                },
                {
                  value: "2",
                  label: "Cancelled",
                },
              ]}
            />
          </div>

          {/* Start Date */}
          <div className="md:col-span-1">
            <FormInput
              id="startDate"
              label="Start Date"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              aria-label="Start date"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-1">
            <FormInput
              id="endDate"
              label="End Date"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              aria-label="End date"
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-1 flex justify-start md:justify-end space-x-2">
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2"
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
              }}
            >
              Clear
            </Button>

            <Button
              type="button"
              variant="outline"
              className="px-3 py-2"
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

      {/* Bookings Table */}
      <BookingsTable
        bookings={filteredBookings}
        isLoading={loading}
        onViewBooking={(booking) =>
          navigate(
            `/admin/bookings/${
              booking.booking_id || booking.id || booking.bookingId
            }`,
            {
              state: { booking },
            }
          )
        }
        onApprove={(bookingId) => handleUpdateStatus(bookingId, 1)}
        onReject={(bookingId) => handleUpdateStatus(bookingId, 2)}
      />
    </div>
  );
};

export default Bookings;
