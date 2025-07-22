import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import {
  FiEye,
  FiRefreshCw,
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
  FiX,
  FiCheck,
  FiXCircle,
} from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import StatusBadge from "../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../shared/utils/dateUtils";
import { IconButton } from "../../shared/components/Button";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState("all"); // all, pending, approved, cancelled
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [assignVendorModal, setAssignVendorModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/getbookings");
      console.log("Bookings fetched:", response.data);
      setBookings(response.data.bookings || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
      setLoading(false);
    }
  };

  const viewBookingDetails = async (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);

    try {
      const res = await api.get(
        `/api/booking/get-eligible-vendors/${booking.booking_id}`
      );
      setEligibleVendors(res.data.eligibleVendors || []);
    } catch (error) {
      console.error("Failed to fetch eligible vendors:", error);
      setEligibleVendors([]);
    }
  };

  const assignVendor = async () => {
    try {
      await api.post("/api/booking/assignbooking", {
        booking_id: selectedBooking.booking_id,
        vendor_id: selectedVendorId,
      });

      toast.success("Vendor assigned successfully.");

      // Update booking with assigned vendor name
      const assignedVendor = eligibleVendors.find(
        (v) => v.vendor_id === selectedVendorId
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === selectedBooking.booking_id
            ? { ...b, vendorName: assignedVendor.vendorName }
            : b
        )
      );

      setAssignVendorModal(false);
      setShowDetailsModal(false);
    } catch (error) {
      toast.error("Failed to assign vendor.");
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBookingAction = async (bookingId, status) => {
    try {
      const res = await api.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status: status,
      });

      toast.success(res.data.message || "Status updated");

      // Update the booking status in state
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId ? { ...b, bookingStatus: status } : b
        )
      );
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    // Status filter
    if (filter !== "all") {
      const status = parseInt(filter);
      if (booking.bookingStatus !== status) {
        return false;
      }
    }

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const bookingDate = new Date(booking.bookingDate);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day

      if (bookingDate < startDate || bookingDate > endDate) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
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
        <div className="flex space-x-2">
          <button
            onClick={fetchBookings}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>

          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div>
              <label
                htmlFor="status-filter"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={handleFilterChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
              >
                <option value="all">All</option>
                <option value="0">Pending</option>
                <option value="1">Approved</option>
                <option value="2">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="start-date"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="end-date"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilter("all");
                  setDateRange({ startDate: "", endDate: "" });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      {bookings.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Vendor
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Service
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date & Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        #{booking.booking_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.vendorName ? (
                          <span>{booking.vendorName}</span>
                        ) : selectedBooking?.booking_id ===
                            booking.booking_id && eligibleVendors.length > 0 ? (
                          <div className="flex gap-2">
                            <select
                              onChange={(e) =>
                                setSelectedVendorId(Number(e.target.value))
                              }
                              className="px-3 py-2 border rounded-md text-sm text-gray-800"
                              value={selectedVendorId || ""}
                            >
                              <option value="" disabled>
                                Select Vendor
                              </option>
                              {eligibleVendors.map((vendor) => (
                                <option
                                  key={vendor.vendor_id}
                                  value={vendor.vendor_id}
                                >
                                  {vendor.vendorName} ({vendor.vendorType})
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={!selectedVendorId}
                              onClick={() => setAssignVendorModal(true)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md"
                            >
                              Assign
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.serviceName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.serviceCategory}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(booking.bookingDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(booking.bookingTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.bookingStatus === 0 ? (
                        <div className="flex gap-2">
                          <IconButton
                            icon={<FiCheck className="h-4 w-4" />}
                            variant="success"
                            size="sm"
                            onClick={() =>
                              handleBookingAction(booking.booking_id, 1)
                            }
                            tooltip="Approve"
                          />
                          <IconButton
                            icon={<FiX className="h-4 w-4" />}
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              handleBookingAction(booking.booking_id, 2)
                            }
                            tooltip="Reject"
                          />
                        </div>
                      ) : (
                        <StatusBadge status={booking.bookingStatus} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewBookingDetails(booking)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No bookings found.</p>
        </div>
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Booking Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Booking ID
                  </h4>
                  <p className="text-gray-900">#{selectedBooking.booking_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Status
                  </h4>
                  <StatusBadge status={selectedBooking.bookingStatus} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Customer
                  </h4>
                  <p className="text-gray-900 flex items-center">
                    <FiUser className="mr-1 text-gray-400" />
                    {selectedBooking.userName}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Vendor
                  </h4>
                  <p className="text-gray-900">{selectedBooking.vendorName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Service
                  </h4>
                  <p className="text-gray-900">{selectedBooking.serviceName}</p>
                  <p className="text-sm text-gray-500">
                    {selectedBooking.serviceCategory}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Service Type
                  </h4>
                  <p className="text-gray-900">
                    {selectedBooking.serviceTypeName || "N/A"}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Date
                  </h4>
                  <p className="text-gray-900 flex items-center">
                    <FiCalendar className="mr-1 text-gray-400" />
                    {formatDate(selectedBooking.bookingDate)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Time
                  </h4>
                  <p className="text-gray-900 flex items-center">
                    <FiClock className="mr-1 text-gray-400" />
                    {formatTime(selectedBooking.bookingTime)}
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Notes
                  </h4>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              {selectedBooking.bookingMedia && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Attached Media
                  </h4>
                  <div className="mt-2">
                    <a
                      href={selectedBooking.bookingMedia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800"
                    >
                      View Attachment
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {assignVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-md shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Assignment</h3>
            <p className="mb-4">
              Are you sure you want to assign this booking to vendor:
              <strong>
                {" "}
                {
                  eligibleVendors.find((v) => v.vendor_id === selectedVendorId)
                    ?.vendorName
                }
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAssignVendorModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={assignVendor}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
