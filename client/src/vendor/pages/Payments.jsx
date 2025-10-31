// pages/vendor/Payments.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import PaymentsTable from "../components/Tables/PaymentsTable";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { Button } from "../../shared/components/Button";
import Pagination from "../../shared/components/Pagination";
import { RefreshCcw } from "lucide-react";

const Payments = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters & pagination
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // stats coming from server / computed
  const [stats, setStats] = useState({
    pendingPayout: 0,
    totalBookings: 0,
    totalPayout: 0,
    paidPayout: 0,
  });

  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // modal state for apply payout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applySuccess, setApplySuccess] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
      };
      if (filter && filter !== "all") params.status = filter;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const response = await axios.get("/api/vendor/getpaymenthistory", {
        params,
      });
      const resp = response.data || {};

      // server payload structure fallback
      const payouts = Array.isArray(resp.allPayouts) ? resp.allPayouts : [];

      setBookings(
        payouts.map((p) => ({
          ...p,
          bookingDate: p.bookingDate || p.created_at || null,
          bookingStatus: p.payout_status || p.bookingStatus || null,
        }))
      );

      // Stats: prefer server-provided numbers, else compute
      const computedTotalPayout =
        resp.totalPayout ??
        payouts.reduce((a, b) => a + (Number(b.payout_amount) || 0), 0);

      const computedPendingPayout =
        resp.pendingPayout ??
        payouts.reduce(
          (a, b) =>
            a +
            (String(b.payout_status || "").toLowerCase() === "pending"
              ? Number(b.payout_amount || 0)
              : 0),
          0
        );

      setStats({
        totalPayout: computedTotalPayout,
        totalBookings:
          resp.totalBookings ?? resp.totalRecords ?? payouts.length,
        pendingPayout: computedPendingPayout,
        paidPayout: resp.paidPayout ?? 0,
      });

      // pagination meta (from API if present)
      setTotalPages(
        resp.totalPages ??
          Math.max(1, Math.ceil((resp.totalRecords ?? payouts.length) / limit))
      );
      setTotalRecords(
        resp.totalRecords ?? resp.totalBookings ?? payouts.length
      );

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      setError("Failed to load payment history");
      setLoading(false);
    }
  }, [page, limit, filter, dateRange]);

  // initial load + refetch when page/limit/filter/dateRange change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // handlers
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1); // reset page when filter changes
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const openApplyModal = () => {
    setRequestAmount(Number(stats.pendingPayout || 0).toFixed(2));
    setApplyError(null);
    setApplySuccess(null);
    setIsModalOpen(true);
  };

  const closeApplyModal = () => {
    setIsModalOpen(false);
  };

  const handleApplySubmit = async () => {
    setApplyError(null);
    setApplySuccess(null);

    const amt = Number(requestAmount);
    if (!amt || amt <= 0) {
      setApplyError("Please enter a valid amount greater than 0.");
      return;
    }

    const pending = Number(stats.pendingPayout || 0);
    if (amt > pending) {
      setApplyError("Requested amount cannot be greater than pending payout.");
      return;
    }

    try {
      setApplyLoading(true);
      const payload = { requested_amount: Math.round(amt) }; // API expects integer
      const res = await axios.post("/api/payment/applypayout", payload);

      setApplySuccess(res.data?.message || "Payout requested successfully.");
    } catch (err) {
      console.error("Apply payout error:", err);
      const msg =
        err?.response?.data?.message || "Failed to submit payout request.";
      setApplyError(msg);
    } finally {
      setApplyLoading(false);
      // Refresh the list & stats after submit and keep modal open to show result briefly
      await fetchBookings();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 900);
    }
  };

  // client-side filtering fallback (keeps PaymentsTable's props compatible)
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter !== "all") {
        const status = String(
          booking.payout_status ?? booking.bookingStatus ?? ""
        ).toLowerCase();
        if (status !== String(filter).toLowerCase()) return false;
      }

      if (dateRange.startDate && dateRange.endDate && booking.bookingDate) {
        const date = new Date(booking.bookingDate);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59, 999);
        if (date < start || date > end) return false;
      }
      return true;
    });
  }, [bookings, filter, dateRange]);

  const resetAll = () => {
    setFilter("all");
    setDateRange({ startDate: "", endDate: "" });
    setLimit(10);
    setPage(1);
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return <div className="p-4 text-red-600 bg-red-100 rounded">{error}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Booking History</h2>
        
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

      <div className="grid grid-cols-4 gap-4 sm:grid-cols-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-500">Pending Payout</p>
          <p className="text-xl font-bold text-gray-800">
            C${Number(stats.pendingPayout || 0).toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-xl font-bold text-blue-600">
            {stats.totalBookings}
          </p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Payout</p>
              <p className="text-xl font-bold text-green-600">
                C${Number(stats.totalPayout || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-500">Paid Payout</p>
          <p className="text-xl font-bold text-blue-600">
            C${Number(stats.paidPayout || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
<div className="grid items-end grid-cols-1 gap-4 md:grid-cols-6">
  {/* Filter */}
  <div className="md:col-span-1">
    <label htmlFor="filter" className="block mb-1 text-sm font-medium text-gray-700">
      Filter
    </label>
    <FormSelect
      id="filter"
      name="filter"
      value={filter}
      onChange={handleFilterChange}
      options={[
        { value: "all", label: "All Payouts" },
        { value: "pending", label: "Pending" },
        { value: "paid", label: "Paid" },
        { value: "completed", label: "Completed" },
      ]}
    />
  </div>

  {/* Start Date */}
  <div className="md:col-span-1">
    <label htmlFor="startDate" className="block mb-1 text-sm font-medium text-gray-700">
      Start Date
    </label>
    <FormInput
      id="startDate"
      name="startDate"
      value={dateRange.startDate}
      onChange={handleDateChange}
      type="date"
      aria-label="Start date"
    />
  </div>

  {/* End Date */}
  <div className="md:col-span-1">
    <label htmlFor="endDate" className="block mb-1 text-sm font-medium text-gray-700">
      End Date
    </label>
    <FormInput
      id="endDate"
      name="endDate"
      value={dateRange.endDate}
      onChange={handleDateChange}
      type="date"
      aria-label="End date"
    />
  </div>

  {/* Spacer to push button to right */}
  <div className="md:col-span-2"></div>

  {/* Request Payout Button - Right aligned */}
  <div className="flex justify-end md:col-span-1">
    <Button
      onClick={openApplyModal}
      size="sm"
      variant="primary"
      className="w-full md:w-auto"
      aria-label="Request payout"
      disabled={Number(stats.pendingPayout || 0) <= 0}
      title={
        Number(stats.pendingPayout || 0) <= 0
          ? "No pending payout available"
          : "Request payout"
      }
    >
      Request Payout
    </Button>
  </div>
</div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <PaymentsTable
          bookings={filteredBookings}
          isLoadixng={loading}
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
            totalRecords={totalRecords}
            limit={limit}
            onLimitChange={(n) => { setLimit(n); setPage(1); }}
            renderLimitSelect={({ value, onChange, options }) => (
              <FormSelect
                id="limit"
                name="limit"
                dropdownDirection="auto"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                options={options.map((v) => ({ value: v, label: String(v) }))}
              />
            )}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-11/12 max-w-md p-6 bg-white rounded-lg shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">Request Payout</h3>
            <p className="mb-4 text-sm text-gray-600">
              Available for withdrawal:{" "}
              <strong>C${Number(stats.pendingPayout || 0).toFixed(2)}</strong>
            </p>

            <label className="block mb-1 text-sm text-gray-600">
              Amount to request
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              className="w-full px-3 py-2 mb-3 border rounded"
            />

            {applyError && (
              <div className="mb-2 text-sm text-red-600">{applyError}</div>
            )}
            {applySuccess && (
              <div className="mb-2 text-sm text-green-700">{applySuccess}</div>
            )}

            <div className="flex justify-end gap-3">
              <Button onClick={closeApplyModal} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button
                onClick={handleApplySubmit}
                disabled={applyLoading}
                size="sm"
                variant="primary"
              >
                {applyLoading ? "Submitting..." : "Confirm Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;