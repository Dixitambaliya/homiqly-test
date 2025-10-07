import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import {
  FiUsers,
  FiUserCheck,
  FiShoppingBag,
  FiDollarSign,
} from "react-icons/fi";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import { Link } from "react-router-dom";
import Loader from "../../components/Loader";
import LoadingSlider from "../../shared/components/LoadingSpinner";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_vendors: 0,
    completed_bookings: 0,
    total_revenue: 0,
  });

  const [bookingTrends, setBookingTrends] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard stats
        const statsResponse = await api.get("/api/analytics/dashboard");
        setStats(statsResponse.data.stats);

        // Fetch booking trends
        const trendsResponse = await api.get("/api/analytics/booking-trends");
        setBookingTrends(trendsResponse.data.trends);

        // Fetch service category stats
        const categoryResponse = await api.get(
          "/api/analytics/service-categories"
        );
        setCategoryStats(categoryResponse.data.stats);

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
  const bookingChartData = {
    labels: bookingTrends.map((t) =>
      new Date(t.booking_date).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Total Bookings",
        data: bookingTrends.map((t) => t.booking_count),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const categoryChartData = {
    labels: categoryStats.map((s) => s.serviceCategory),
    datasets: [
      {
        data: categoryStats.map((s) => s.booking_count),
        backgroundColor: [
          "#3b82f6",
          "#60a5fa",
          "#1e40af",
          "#1e3a8a",
          "#dbeafe",
          "#93c5fd",
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return <LoadingSlider />;
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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <FiUsers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-semibold">{stats.total_users}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <FiUserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Vendors</p>
            <p className="text-2xl font-semibold">{stats.total_vendors}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600">
            <FiShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Completed Bookings</p>
            <p className="text-2xl font-semibold">{stats.completed_bookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <FiDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-semibold">
              ${stats.total_revenue || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Booking Trends</h2>
          <div className="h-64">
            <Line
              data={bookingChartData}
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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Service Categories</h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Booking Calendar</h2>
          <Link
            to="/admin/bookings"
            className="text-sm text-primary-light hover:text-primary-dark font-medium"
          >
            View All Bookings
          </Link>
        </div>
        <div className="border rounded-lg p-4 h-96 flex items-center justify-center">
          <p className="text-gray-500">
            Calendar component will be integrated here
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
