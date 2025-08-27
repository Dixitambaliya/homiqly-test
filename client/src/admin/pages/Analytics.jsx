import { useState, useEffect } from "react";
import axios from "axios";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from "chart.js";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatCurrency } from "../../shared/utils/formatUtils";
import { Button } from "../../shared/components/Button";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

const Analytics = () => {
  const [bookingTrends, setBookingTrends] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [vendorPerformance, setVendorPerformance] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch booking trends
      const trendsResponse = await axios.get("/api/analytics/booking-trends");
      setBookingTrends(trendsResponse.data.trends || []);

      // Fetch service category stats
      const categoryResponse = await axios.get(
        "/api/analytics/service-categories"
      );
      setCategoryStats(categoryResponse.data.stats || []);

      // Fetch vendor performance
      const vendorResponse = await axios.get(
        "/api/analytics/vendor-performance"
      );
      setVendorPerformance(vendorResponse.data.performance || []);

      // Fetch revenue analytics
      const revenueResponse = await axios.get("/api/analytics/revenue");
      setRevenueData(revenueResponse.data.revenue || []);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data");
      setLoading(false);
    }
  };

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
      {
        label: "Completed",
        data: bookingTrends.map((t) => t.completed_count),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: false,
      },
      {
        label: "Cancelled",
        data: bookingTrends.map((t) => t.cancelled_count),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: false,
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

  const vendorChartData = {
    labels: vendorPerformance.slice(0, 10).map((v) => v.vendor_name),
    datasets: [
      {
        label: "Total Bookings",
        data: vendorPerformance.slice(0, 10).map((v) => v.total_bookings),
        backgroundColor: "#60a5fa",
        borderColor: "#3b82f6",
        borderWidth: 1,
      },
    ],
  };

  const revenueChartData = {
    labels: revenueData.map((r) => `${r.month}/${r.year}`),
    datasets: [
      {
        label: "Gross Revenue",
        data: revenueData.map((r) => r.gross_revenue),
        backgroundColor: "#3b82f6",
        borderColor: "#3b82f6",
        borderWidth: 1,
      },
      {
        label: "Commission",
        data: revenueData.map((r) => r.commission_revenue),
        backgroundColor: "#10b981",
        borderColor: "#10b981",
        borderWidth: 1,
      },
    ],
  };

  const exportAnalyticsData = () => {
    // Create CSV content
    const bookingTrendsCSV = [
      ["Date", "Total Bookings", "Completed", "Pending", "Cancelled"],
      ...bookingTrends.map((t) => [
        new Date(t.booking_date).toLocaleDateString(),
        t.booking_count,
        t.completed_count,
        t.pending_count,
        t.cancelled_count,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Create and download file
    const blob = new Blob([bookingTrendsCSV], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `booking_trends_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <h2 className="text-2xl font-bold text-gray-800">
          Analytics & Reports
        </h2>
        <div className="flex space-x-2">
          <Button onClick={exportAnalyticsData}>
            <FiDownload className="mr-2" />
            Export Data
          </Button>
          <Button
            onClick={fetchAnalyticsData}
            variant="ghost"
            icon={<FiRefreshCw />}
          >
            Refresh 
          </Button>
        </div>
      </div>

      {/* Booking Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Booking Trends
        </h3>
        <div className="h-80">
          <Line
            data={bookingChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "top",
                },
                title: {
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

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Service Categories Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Service Categories
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "right",
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Top Vendors Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Top Performing Vendors
          </h3>
          <div className="h-64">
            <Bar
              data={vendorChartData}
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

      {/* Revenue Analytics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Revenue Analytics
        </h3>
        <div className="h-80">
          <Bar
            data={revenueChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "top",
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

      {/* Category Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Category Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Bookings
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Avg. Price
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryStats.map((category, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {category.serviceCategory}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {category.booking_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(category.avg_price || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(category.total_revenue || 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Vendors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Top Vendors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Bookings
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rating
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Earnings
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendorPerformance.slice(0, 10).map((vendor, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vendor.vendor_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {vendor.vendorType}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vendor.total_bookings}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vendor.avg_rating
                        ? typeof vendor.avg_rating === "number"
                          ? vendor.avg_rating.toFixed(1)
                          : vendor.avg_rating
                        : "N/A"}
                      {vendor.avg_rating ? " ★" : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(vendor.total_earnings || 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
