import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Link } from "react-router-dom";
import ToggleButton from "../components/ToggleButton";
import StatusBadge from "../../shared/components/StatusBadge";
import Calendar from "./Calendar";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { CheckCircle, Clock, DollarSign, ShoppingBag } from "lucide-react";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      let url = `/api/vendor/getstats?filterType=${filterType}`;
      if (filterType === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const statsResponse = await api.get(url);
      const statsData = statsResponse.data.stats || {};

      setStats({
        totalBookings: statsData.totalBookings || 0,
        pendingBookings: parseInt(statsData.pendingBookings) || 0,
        completedBookings: parseInt(statsData.completedBookings) || 0,
        totalEarnings: statsData.totalEarnings || 0,
      });

      // fetch vendor bookings
      const bookingsResponse = await api.get(
        "/api/booking/vendorassignedservices"
      );
      const bookings = bookingsResponse.data.bookings || [];

      const sortedBookings = [...bookings]
        .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
        .slice(0, 5);

      setRecentBookings(sortedBookings);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, startDate, endDate]);

  // Prepare chart data
  const performanceData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Bookings",
        data: [12, 19, 15, 20, 25, 30],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-t-2 border-b-2 rounded-full animate-spin border-primary-light"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <ToggleButton />

        <div className="flex flex-col space-y-3 sm:flex-row sm:items-end sm:space-x-4 sm:space-y-0">
          {/* Filter Type */}
          <div className="w-full sm:w-48">
            <FormSelect
              // label="Filter Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: "", label: "All" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>

          {/* Date Range (only visible for custom) */}
          {filterType === "custom" && (
            <>
              <div className="flex-1 min-w-0">
                <FormInput
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex-1 min-w-0">
                <FormInput
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center p-6 space-x-4 bg-white rounded-lg shadow">
          <div className="p-3 text-blue-600 bg-blue-100 rounded-full">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Bookings</p>
            <p className="text-2xl font-semibold">{stats.totalBookings}</p>
          </div>
        </div>

        <div className="flex items-center p-6 space-x-4 bg-white rounded-lg shadow">
          <div className="p-3 text-yellow-600 bg-yellow-100 rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Bookings</p>
            <p className="text-2xl font-semibold">{stats.pendingBookings}</p>
          </div>
        </div>

        <div className="flex items-center p-6 space-x-4 bg-white rounded-lg shadow">
          <div className="p-3 text-green-600 bg-green-100 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Completed Bookings</p>
            <p className="text-2xl font-semibold">{stats.completedBookings}</p>
          </div>
        </div>

        <div className="flex items-center p-6 space-x-4 bg-white rounded-lg shadow">
          <div className="p-3 text-purple-600 bg-purple-100 rounded-full">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Earnings</p>
            <p className="text-2xl font-semibold">${stats.totalEarnings}</p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
          {recentBookings.length > 0 ? (
            <div className="divide-y">
              {recentBookings.map((booking) => {
                const statusClass =
                  booking.bookingStatus === 1
                    ? "bg-green-100 text-green-800"
                    : booking.bookingStatus === 2
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800";

                const statusText =
                  booking.bookingStatus === 1
                    ? "Completed"
                    : booking.bookingStatus === 2
                    ? "Cancelled"
                    : "Pending";

                return (
                  <div
                    key={booking.bookingId || booking.booking_id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{booking.userName}</p>
                      <p className="text-sm text-gray-500">
                        {booking.serviceName} -{" "}
                        {new Date(booking.bookingDate).toLocaleDateString()}{" "}
                        {booking.bookingTime}
                      </p>
                    </div>
                    {/* <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
                    >
                      {statusText}
                    </span> */}
                    <StatusBadge status={booking.bookingStatus} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-gray-500">No recent bookings</p>
          )}
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-lg font-semibold">Service Performance</h2>
          <div className="h-64">
            <Line
              data={performanceData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today's Bookings</h2>
          <Link
            to="/vendor/calendar"
            className="text-sm font-medium text-primary-light hover:text-primary-dark"
          >
            View Calendar
          </Link>
        </div>

        <div className="p-4 mx-auto border rounded-lg max-w-7xl">
          <Calendar />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
