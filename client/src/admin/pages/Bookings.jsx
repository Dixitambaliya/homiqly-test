import { useState, useEffect, useCallback } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/components/Button/Button";
import BookingsTable from "../components/Tables/BookingsTable";
import { FormInput, FormSelect } from "../../shared/components/Form";
import Pagination from "../../shared/components/Pagination";
import { RefreshCcw, Search } from "lucide-react";

const Bookings = () => {
  // data + load/error
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters & selection
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // pagination state (controlled by backend)
  const [page, setPage] = useState(1); // requested page
  const [limit, setLimit] = useState(10); // requested limit
  const [total, setTotal] = useState(0); // total records (from backend)
  const [totalPages, setTotalPages] = useState(1); // total pages (from backend)

  const navigate = useNavigate();

  // debounce search input (avoid calling API on every key)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // reset to first page when search changes
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // API fetch - memoized so dependencies are explicit
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: filter !== "all" ? filter : undefined,
        start_date: dateRange.startDate || undefined,
        end_date: dateRange.endDate || undefined,
      };

      const res = await api.get("/api/admin/getbookings", { params });

      // bookings array expected somewhere in response
      const bookingsList = res?.data?.bookings ?? res?.data?.data ?? [];

      // Prefer API-provided pagination values when available
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
          : bookingsList.length;
      const apiLimit =
        typeof res?.data?.limit !== "undefined"
          ? Number(res.data.limit)
          : undefined;

      setBookings(bookingsList);
      setTotal(Number(apiTotalRecords) || bookingsList.length);

      // update limit & page if API reports a different limit/currentPage
      if (apiLimit && apiLimit !== limit) {
        setLimit(apiLimit);
      }

      if (apiCurrentPage && apiCurrentPage !== page) {
        // if backend corrected the current page (e.g., out-of-range), update UI page
        setPage(apiCurrentPage);
      }

      if (apiTotalPages) {
        setTotalPages(apiTotalPages);
      } else {
        // fallback if backend doesn't provide totalPages
        setTotalPages(
          Math.max(
            1,
            Math.ceil(
              (apiTotalRecords || bookingsList.length) / (apiLimit || limit)
            )
          )
        );
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings");
      setBookings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filter, dateRange]);

  // fetch when parameters change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // update status (approve/reject) and refresh page
  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const response = await api.put("/api/booking/approveorrejectbooking", {
        booking_id: bookingId,
        status,
      });
      if (response.status === 200) {
        toast.success(
          `Booking ${status === 1 ? "approved" : "rejected"} successfully`
        );
        fetchBookings();
      }
    } catch (err) {
      console.error("Error updating booking status:", err);
      toast.error("Failed to update booking status");
    }
  };

  // filter handlers
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const resetAll = () => {
    setSearchTerm("");
    setFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setLimit(10);
    setPage(1);
  };

  // UI states for loading & error (when no data)
  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="p-4 rounded-md bg-red-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Admin Booking Management
        </h2>
        
        <div className="flex items-center space-x-2">
          <div className="hidden mr-2 text-sm text-gray-600 md:block">
            Page {page} of {totalPages}
          </div>

          <Button
            className="h-9"
            onClick={fetchBookings}
            variant="outline"
            icon={<RefreshCcw className="w-4 h-4 mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="grid items-end grid-cols-1 gap-4 md:grid-cols-6">
          {/* Search */}
          <div className="md:col-span-2">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              id="search"
              label="Search"
              type="text"
              placeholder="Search by ID, customer name or service"
              value={searchTerm}
              onChange={handleSearchChange}
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
                { value: "0", label: "Pending" },
                { value: "1", label: "Approved" },
                { value: "2", label: "Cancelled" },
                { value: "3", label: "Completed" },
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
          <div className="flex justify-start space-x-2 md:col-span-1 md:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2"
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
                setPage(1);
              }}
            >
              Clear
            </Button>

            <Button
              type="button"
              variant="outline"
              className="px-3 py-2"
              onClick={() => {
                resetAll();
              }}
            >
              Reset All
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <BookingsTable
          bookings={bookings}
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
          filteredStatus={filter}
        />

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 mt-4 sm:flex-row">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            disabled={loading}
            keepVisibleOnSinglePage={true}
            totalRecords={total}
            limit={limit}
            onLimitChange={(n) => { setLimit(n); setPage(1); }}
            renderLimitSelect={({ value, onChange, options }) => (
              <FormSelect
                id="limit"
                name="limit"
                dropdownDirection="auto"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                options={options.map((v) => ({ value: v, label: `${v} / page` }))}
              />
            )}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      </div>
    </div>
  );
};

export default Bookings;