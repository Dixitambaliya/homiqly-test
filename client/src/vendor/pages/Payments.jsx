// pages/vendor/Payments.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import PaymentsTable from "../components/Tables/PaymentsTable";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { Button } from "../../shared/components/Button";

const Payments = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [stats, setStats] = useState({
    pendingPayout: 0,
    totalBookings: 0,
    totalPayout: 0,
    paidPayout: 0,
  });

  // modal state for apply payout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applySuccess, setApplySuccess] = useState(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/vendor/getpaymenthistory");
      const resp = response.data || {};
      console.log(resp);

      const payouts = Array.isArray(resp.allPayouts) ? resp.allPayouts : [];

      setBookings(
        payouts.map((p) => ({
          ...p,
          bookingDate: p.bookingDate || p.created_at || null,
          bookingStatus: p.payout_status || p.bookingStatus || null,
        }))
      );

      setStats({
        totalPayout:
          resp.totalPayout ??
          payouts.reduce((a, b) => a + (Number(b.payout_amount) || 0), 0),
        totalBookings: resp.totalBookings ?? payouts.length,
        pendingPayout:
          resp.pendingPayout ??
          resp.pendingPayout ??
          payouts.reduce(
            (a, b) =>
              a +
              (String(b.payout_status || "").toLowerCase() === "pending"
                ? Number(b.payout_amount || 0)
                : 0),
            0
          ),
        paidPayout: resp.paidPayout ?? 0,
      });

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      setError("Failed to load payment history");
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const openApplyModal = () => {
    // default requested amount to the pending payout value (rounded to 2 dec)
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

    // optionally prevent requesting more than pending payout:
    const pending = Number(stats.pendingPayout || 0);
    if (amt > pending) {
      setApplyError("Requested amount cannot be greater than pending payout.");
      return;
    }

    try {
      setApplyLoading(true);
      const payload = { requested_amount: Math.round(amt) }; // API in screenshot used integer amounts
      const res = await axios.post("/api/payment/applypayout", payload);

      setApplySuccess(res.data?.message || "Payout requested successfully.");
      // refresh the list/stats
    } catch (err) {
      console.error("Apply payout error:", err);
      // try to surface server message
      const msg =
        err?.response?.data?.message || "Failed to submit payout request.";
      setApplyError(msg);
    } finally {
      setApplyLoading(false);
      // keep modal open briefly to show success, then close
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
      await fetchBookings();
    }
  };

  const filteredBookings = bookings.filter((booking) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-100 text-red-600 p-4 rounded">{error}</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Booking History</h2>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <p className="text-gray-500 text-sm">Pending Payout</p>
          <p className="text-xl font-bold text-gray-800">
            C${Number(stats.pendingPayout || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-gray-500 text-sm">Total Bookings</p>
          <p className="text-xl font-bold text-blue-600">
            {stats.totalBookings}
          </p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Payout</p>
              <p className="text-xl font-bold text-green-600">
                C${Number(stats.totalPayout || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-gray-500 text-sm">Paid Payout</p>
          <p className="text-xl font-bold text-blue-600">
            C${Number(stats.paidPayout || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-4 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="payout-filter" className="sr-only">
              Filter payouts
            </label>
            <FormSelect
              id="payout-filter"
              label="Filter"
              value={filter}
              className="min-w-[150px] w-full sm:w-auto"
              onChange={handleFilterChange}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "completed", label: "Completed" },
              ]}
              aria-label="Filter payouts"
            />

            <div className="flex items-center gap-2">
              <label htmlFor="start-date" className="sr-only">
                Start date
              </label>
              <FormInput
                id="start-date"
                type="date"
                name="startDate"
                label="Start Date"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="max-w-[160px] w-full sm:w-auto"
                aria-label="Start date"
              />

              <label htmlFor="end-date" className="sr-only">
                End date
              </label>
              <FormInput
                id="end-date"
                type="date"
                name="endDate"
                label="End Date"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="max-w-[160px] w-full sm:w-auto"
                aria-label="End date"
              />
            </div>
          </div>

          {/* Right: Request payout button */}
          <div className="flex items-center sm:ml-4">
            <Button
              onClick={openApplyModal}
              size="sm"
              variant="primary"
              className="w-full sm:w-auto"
              aria-label="Request payout"
            >
              Request Payout
            </Button>
          </div>
        </div>
        <PaymentsTable
          bookings={filteredBookings}
          isLoading={loading}
          filteredStatus={filter}
        />
      </>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
            <h3 className="text-lg font-semibold mb-3">Request Payout</h3>
            <p className="text-sm text-gray-600 mb-4">
              Available for withdrawal:{" "}
              <strong>C${Number(stats.pendingPayout || 0).toFixed(2)}</strong>
            </p>

            <label className="block text-sm text-gray-600 mb-1">
              Amount to request
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              disabled
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
            />

            {applyError && (
              <div className="text-red-600 text-sm mb-2">{applyError}</div>
            )}
            {applySuccess && (
              <div className="text-green-700 text-sm mb-2">{applySuccess}</div>
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
