import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import {
  FiShoppingBag,
  FiClock,
  FiCheckCircle,
  FiDollarSign,
} from "react-icons/fi";
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch vendor bookings
        const bookingsResponse = await api.get(
          "/api/employee/getbookingemployee"
        );
        const bookings = bookingsResponse.data.bookings || [];

        // Calculate stats
        const totalBookings = bookings.length;
        const pendingBookings = bookings.filter(
          (b) => b.bookingStatus === 0
        ).length;
        const completedBookings = bookings.filter(
          (b) => b.bookingStatus === 1
        ).length;

        // Get recent bookings
        const sortedBookings = [...bookings]
          .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
          .slice(0, 5);

        setStats({
          totalBookings,
          pendingBookings,
          completedBookings,
          totalEarnings: 0, // This would need payment data
        });

        setRecentBookings(sortedBookings);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-light"></div>
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
    <div className="space-y-6">
      <ToggleButton />
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <FiShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Bookings</p>
            <p className="text-2xl font-semibold">{stats.totalBookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <FiClock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Bookings</p>
            <p className="text-2xl font-semibold">{stats.pendingBookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <FiCheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Completed Bookings</p>
            <p className="text-2xl font-semibold">{stats.completedBookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600">
            <FiDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Earnings</p>
            <p className="text-2xl font-semibold">${stats.totalEarnings}</p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
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
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{booking.userName}</p>
                      <p className="text-sm text-gray-500">
                        {booking.serviceName} -{" "}
                        {new Date(booking.bookingDate).toLocaleDateString()}{" "}
                        {booking.bookingTime}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
                    >
                      {statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent bookings</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Service Performance</h2>
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Today's Bookings</h2>
          <Link
            to="/vendor/calendar"
            className="text-sm text-primary-light hover:text-primary-dark font-medium"
          >
            View Calendar
          </Link>
        </div>

        <div className="border rounded-lg p-4">
          <p className="text-center text-gray-500">
            Calendar component will be integrated here
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
