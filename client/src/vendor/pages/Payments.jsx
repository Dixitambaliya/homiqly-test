// pages/vendor/Payments.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiDownload, FiFilter, FiEye } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import PaymentsTable from "../components/Tables/PaymentsTable";

const Payments = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    completed: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/vendor/getpaymenthistory");
      const data = response.data.bookings || [];
      setBookings(data);

      setStats({
        total: data.length,
        approved: data.filter((b) => b.bookingStatus === 1).length,
        completed: data.filter((b) => b.bookingStatus === 4).length,
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

  const filteredBookings = bookings.filter((booking) => {
    if (filter !== "all" && String(booking.bookingStatus) !== filter)
      return false;

    if (dateRange.startDate && dateRange.endDate) {
      const date = new Date(booking.bookingDate);
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      if (date < start || date > end) return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ["Booking ID", "Service ID", "Date", "Status"];
    const rows = filteredBookings.map((b) => [
      b.booking_id,
      b.service_id,
      formatDate(b.bookingDate),
      b.bookingStatus === 4
        ? "Completed"
        : b.bookingStatus === 1
        ? "Approved"
        : "Other",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `booking_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

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
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Booking History</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark flex items-center"
        >
          <FiDownload className="mr-2" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <p className="text-gray-500 text-sm">Total Bookings</p>
          <p className="text-xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-gray-500 text-sm">Approved</p>
          <p className="text-xl font-bold text-blue-600">{stats.approved}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <select
            value={filter}
            onChange={handleFilterChange}
            className="border p-2 rounded"
          >
            <option value="all">All</option>
            <option value="1">Approved</option>
            <option value="4">Completed</option>
          </select>

          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            className="border p-2 rounded"
          />
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            className="border p-2 rounded"
          />
        </div>

        <PaymentsTable
          bookings={filteredBookings}
          isLoading={loading}
          filteredStatus={filter}
        />
      </div>
    </div>
  );
};

export default Payments;
