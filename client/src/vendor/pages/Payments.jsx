import { useState, useEffect } from "react";
import axios from "axios";
import { FiDownload, FiFilter } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import { formatCurrency } from "../../shared/utils/formatUtils";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, completed
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingAmount: 0,
    completedAmount: 0,
    commissionPaid: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/vendor/getpaymenthistory");
      const paymentData = response.data.payments || [];
      setPayments(paymentData);

      // Calculate stats
      calculateStats(paymentData);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError("Failed to load payment history");
      setLoading(false);
    }
  };

  const calculateStats = (paymentData) => {
    const totalEarnings = paymentData.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const pendingAmount = paymentData
      .filter((payment) => payment.payment_status === "pending")
      .reduce((sum, payment) => sum + payment.net_amount, 0);
    const completedAmount = paymentData
      .filter((payment) => payment.payment_status === "completed")
      .reduce((sum, payment) => sum + payment.net_amount, 0);
    const commissionPaid = paymentData.reduce(
      (sum, payment) => sum + payment.commission_amount,
      0
    );

    setStats({
      totalEarnings,
      pendingAmount,
      completedAmount,
      commissionPaid,
    });
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

  const filteredPayments = payments.filter((payment) => {
    // Status filter
    if (filter !== "all" && payment.payment_status !== filter) {
      return false;
    }

    // Date range filter
    if (dateRange.startDate && dateRange.endDate) {
      const paymentDate = new Date(payment.payment_date);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day

      if (paymentDate < startDate || paymentDate > endDate) {
        return false;
      }
    }

    return true;
  });

  const exportToCSV = () => {
    // Create CSV content
    const headers = [
      "Payment ID",
      "Service",
      "Amount",
      "Commission",
      "Net Amount",
      "Status",
      "Date",
    ];
    const rows = filteredPayments.map((payment) => [
      payment.payment_id,
      payment.serviceName,
      payment.amount,
      payment.commission_amount,
      payment.net_amount,
      payment.payment_status,
      new Date(payment.payment_date).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `payment_history_${new Date().toISOString().split("T")[0]}.csv`
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
        <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
        >
          <FiDownload className="mr-2" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalEarnings)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Pending Amount</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(stats.pendingAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Received Amount</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.completedAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 mb-1">Commission Paid</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.commissionPaid)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center">
            <FiFilter className="mr-2 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          </div>

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
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
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

      {/* Payments Table */}
      {payments.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Payment ID
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
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Commission
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Net Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{payment.payment_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {payment.serviceName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.serviceCategory}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(payment.commission_amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {payment.commission_rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(payment.net_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.payment_status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {payment.payment_status.charAt(0).toUpperCase() +
                          payment.payment_status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No payment records found.</p>
        </div>
      )}
    </div>
  );
};

export default Payments;
