import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import { FiEye, FiRefreshCw } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import BookingDetailsModal from "../components/Modals/BookingDetailsModal";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [eligibleVendorsMap, setEligibleVendorsMap] = useState({});
  const [selectedVendorMap, setSelectedVendorMap] = useState({});
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/getbookings");
      const bookingsList = response.data.bookings || [];
      setBookings(bookingsList);

      const vendorsMap = {};
      await Promise.all(
        bookingsList.map(async (booking) => {
          if (!booking.vendorName) {
            try {
              const res = await api.get(
                `/api/booking/get-eligible-vendors/${booking.booking_id}`
              );
              vendorsMap[booking.booking_id] = res.data.eligibleVendors || [];
            } catch {
              vendorsMap[booking.booking_id] = [];
            }
          }
        })
      );
      setEligibleVendorsMap(vendorsMap);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = (bookingId, vendorId) => {
    setSelectedVendorMap((prev) => ({
      ...prev,
      [bookingId]: vendorId,
    }));
  };

  const handleAssignVendor = async (bookingId) => {
    const vendorId = selectedVendorMap[bookingId];
    if (!vendorId) return;

    try {
      const res = await api.post("/api/booking/assignbooking", {
        booking_id: bookingId,
        vendor_id: vendorId,
      });

      const assignedVendor = eligibleVendorsMap[bookingId].find(
        (v) => v.vendor_id === vendorId
      );

      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId
            ? { ...b, vendorName: assignedVendor?.vendorName }
            : b
        )
      );

      toast.success(res.data.message || "Vendor assigned successfully");

      setSelectedVendorMap((prev) => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });

      fetchBookings();
    } catch (error) {
      console.error("Failed to assign vendor:", error);
      toast.error("Failed to assign vendor");
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
        <button
          onClick={fetchBookings}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
        >
          <FiRefreshCw className="mr-2" />
          Refresh
        </button>
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
            <button
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
              }}
              className="px-3 py-2 border rounded text-sm text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Customer</th>
              <th className="px-6 py-3 text-left">Vendor</th>
              <th className="px-6 py-3 text-left">Service</th>
              <th className="px-6 py-3 text-left">Date & Time</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <tr key={booking.booking_id}>
                <td className="px-6 py-4">#{booking.booking_id}</td>
                <td className="px-6 py-4">{booking.userName}</td>
                <td className="px-6 py-4">
                  {booking.vendorName ? (
                    booking.vendorName
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className="px-2 py-1 border rounded text-sm"
                        value={selectedVendorMap[booking.booking_id] || ""}
                        onChange={(e) =>
                          handleSelectVendor(
                            booking.booking_id,
                            Number(e.target.value)
                          )
                        }
                      >
                        <option value="">Select Vendor</option>
                        {(eligibleVendorsMap[booking.booking_id] || []).map(
                          (vendor) => (
                            <option
                              key={vendor.vendor_id}
                              value={vendor.vendor_id}
                            >
                              {vendor.vendorName} ({vendor.vendorType})
                            </option>
                          )
                        )}
                      </select>
                      <button
                        disabled={!selectedVendorMap[booking.booking_id]}
                        onClick={() => handleAssignVendor(booking.booking_id)}
                        className="bg-blue-600 text-white text-sm px-3 py-1 rounded"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {booking.serviceName}
                  <div className="text-xs text-gray-500">
                    {booking.serviceCategory}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {formatDate(booking.bookingDate)} <br />
                  <span className="text-xs text-gray-500">
                    {formatTime(booking.bookingTime)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={booking.bookingStatus} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowDetailsModal(true);
                    }}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <FiEye className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetailsModal && selectedBooking && (
        <BookingDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          booking={selectedBooking}
        />
      )}
    </div>
  );
};

export default Bookings;
