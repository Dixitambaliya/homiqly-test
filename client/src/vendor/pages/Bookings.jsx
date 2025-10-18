import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FiRefreshCw } from "react-icons/fi";
import BookingsTable from "../components/Tables/BookingsTable";
import { Button } from "../../shared/components/Button";
import { FormSelect, FormInput } from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const VendorBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filter / assignment state
  const [filter, setFilter] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeMap, setSelectedEmployeeMap] = useState({});

  // search (debounced)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // date range
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  // pagination (controlled by backend if provided)
  const [page, setPage] = useState(1); // requested page
  const [limit, setLimit] = useState(10); // requested limit
  const [total, setTotal] = useState(0); // total records from backend
  const [totalPages, setTotalPages] = useState(1); // total pages from backend

  const navigate = useNavigate();

  // debounce search so API isn't called on every key
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // fetch employees (for assign dropdown)
  const fetchEmployees = useCallback(async () => {
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await axios.get("/api/employee/getemployee", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setEmployees(res.data.employees || res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, []);

  // fetch bookings with pagination & filters
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        status: filter !== "all" ? filter : undefined,
        search: debouncedSearch || undefined,
        start_date: dateRange.startDate || undefined,
        end_date: dateRange.endDate || undefined,
      };

      // This endpoint in your screenshot: /api/booking/vendorassignedservices
      const res = await axios.get("/api/booking/vendorassignedservices", {
        params,
      });

      // bookings array - adapt to backend shape
      const pageData =
        res?.data?.bookings ??
        res?.data?.data ??
        res?.data?.rows ??
        res?.data?.results ??
        [];

      // Read pagination info from backend when available
      const apiCurrentPage =
        typeof res?.data?.currentPage !== "undefined"
          ? Number(res.data.currentPage)
          : undefined;
      const apiTotalPages =
        typeof res?.data?.totalPages !== "undefined"
          ? Number(res.data.totalPages)
          : undefined;
      const apiTotalRecords =
        typeof res?.data?.totalRecords !== "undefined"
          ? Number(res.data.totalRecords)
          : typeof res?.data?.total !== "undefined"
          ? Number(res.data.total)
          : pageData.length;
      const apiLimit =
        typeof res?.data?.limit !== "undefined"
          ? Number(res.data.limit)
          : undefined;

      setBookings(pageData);
      setTotal(Number(apiTotalRecords) || pageData.length);

      if (apiLimit && apiLimit !== limit) setLimit(apiLimit);
      if (typeof apiCurrentPage !== "undefined" && apiCurrentPage !== page)
        setPage(apiCurrentPage);

      if (apiTotalPages) {
        setTotalPages(apiTotalPages);
      } else {
        setTotalPages(
          Math.max(
            1,
            Math.ceil(
              (apiTotalRecords || pageData.length) / (apiLimit || limit)
            )
          )
        );
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err?.response?.data?.message || "Failed to load bookings");
      setBookings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filter, debouncedSearch, dateRange]);

  useEffect(() => {
    fetchBookings();
    fetchEmployees();
  }, [fetchBookings, fetchEmployees]);

  // assignment helpers
  const handleSelectEmployee = (bookingId, employeeId) => {
    setSelectedEmployeeMap((prev) => ({ ...prev, [bookingId]: employeeId }));
  };

  const handleAssignEmployee = async (bookingId) => {
    const employeeId = selectedEmployeeMap[bookingId];
    if (!employeeId) {
      toast.error("Please select an employee first");
      return;
    }

    try {
      const token = localStorage.getItem("vendorToken");
      const res = await axios.post(
        "/api/employee/assign-booking",
        { booking_id: bookingId, employee_id: employeeId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      // Update UI: put assigned employee name into booking row if available
      const assignedEmployee = employees.find(
        (e) => e.employee_id === employeeId
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === bookingId
            ? {
                ...b,
                employeeName:
                  assignedEmployee?.employee_name || assignedEmployee?.name,
              }
            : b
        )
      );

      // clear selection for that booking
      setSelectedEmployeeMap((prev) => {
        const copy = { ...prev };
        delete copy[bookingId];
        return copy;
      });

      toast.success(res?.data?.message || "Employee assigned successfully");
      // optionally refresh list (keeps data fresh)
      fetchBookings();
    } catch (err) {
      console.error("Failed to assign employee:", err);
      toast.error(err?.response?.data?.message || "Failed to assign employee");
    }
  };

  // update status (vendor approve/reject)
  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const res = await axios.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status,
      });
      if (res.status === 200) {
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
    } catch (err) {
      console.error("Error updating booking status:", err);
      toast.error(
        err?.response?.data?.message || "Failed to update booking status"
      );
    }
  };

  const viewBookingDetails = (booking) => {
    navigate(`/vendor/bookings/${booking.booking_id}`, { state: { booking } });
  };

  // filters handlers
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // pagination helpers
  const goToPage = (p) => {
    const bounded = Math.max(1, Math.min(totalPages, p));
    if (bounded !== page) setPage(bounded);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(Number(newLimit));
    setPage(1);
  };

  const resetAll = () => {
    setSearchTerm("");
    setFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setLimit(10);
    setPage(1);
  };

  const getPageWindow = () => {
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }
    const arr = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  };

  // render states
  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return <div className="text-red-500 p-4 bg-red-50 rounded">{error}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Vendor Booking Management
        </h2>

        <div className="flex space-x-2 items-center">
          <div className="hidden md:block text-sm text-gray-600 mr-2">
            Page {page} of {totalPages}
          </div>

          <Button
            className="h-9"
            onClick={() => {
              fetchBookings();
              fetchEmployees();
            }}
            variant="outline"
            icon={<FiRefreshCw className="mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Search */}
          <div className="md:col-span-2">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              id="search"
              label="Search"
              type="text"
              placeholder="Search by ID, customer or service"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Status */}
          <div className="md:col-span-1">
            <FormSelect
              name="filter"
              value={filter}
              onChange={handleFilterChange}
              options={[
                { value: "all", label: "All Bookings" },
                { value: "0", label: "Pending" },
                { value: "1", label: "Approved" },
                { value: "2", label: "Cancelled" },
                { value: "3", label: "Completed" },
              ]}
            />
          </div>

          {/* Start Date */}
          <div className="md:col-span-1">
            <input
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              type="date"
              className="w-full border rounded px-3 py-2"
              aria-label="Start date"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-1">
            <input
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              type="date"
              className="w-full border rounded px-3 py-2"
              aria-label="End date"
            />
          </div>

          <div className="md:col-span-1 flex justify-start md:justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
                setPage(1);
              }}
            >
              Clear
            </Button>
            <Button variant="outline" onClick={() => resetAll()}>
              Reset All
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <BookingsTable
          bookings={bookings.map((b) => ({
            ...b,
            selectedEmployeeId: selectedEmployeeMap[b.booking_id] || "",
          }))}
          employees={employees}
          isLoading={loading}
          onViewBooking={viewBookingDetails}
          filteredStatus={filter !== "all" ? parseInt(filter) : undefined}
          onSelectEmployee={handleSelectEmployee}
          onAssignEmployee={handleAssignEmployee}
          onApproveBooking={(id) => handleUpdateStatus(id, 1)}
          onRejectBooking={(id) => handleUpdateStatus(id, 2)}
        />

        {/* Pagination bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t">
          <div className="flex items-center gap-3">
            <div>
              <label className="text-sm mr-2">Show</label>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2 text-sm text-gray-600">entries</span>
            </div>

            <div className="text-sm text-gray-600">
              {total === 0 ? (
                "No entries"
              ) : (
                <>
                  Showing{" "}
                  <strong>{Math.min((page - 1) * limit + 1, total)}</strong> to{" "}
                  <strong>{Math.min(page * limit, total)}</strong> of{" "}
                  <strong>{total}</strong> entries
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {getPageWindow().map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`px-3 py-1 border rounded ${
                    p === page ? "bg-gray-200 font-semibold" : ""
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorBookings;
