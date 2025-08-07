import { useState, useEffect } from "react";
import axios from "axios";
import { FiDownload, FiFilter } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import { formatCurrency } from "../../shared/utils/formatUtils";
import { Button } from "../../shared/components/Button";
import FormSelect from "../../shared/components/Form/FormSelect";
import PaymentsTable from "../components/Tables/PaymentsTable";
import { useNavigate } from "react-router-dom";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, individual, company
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/admin/getpayments");
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError("Failed to load payment history");
    } finally {
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

  const filteredPayments = payments.filter((payment) => {
    if (filter !== "all" && payment.vendorType !== filter) return false;
    if (dateRange.startDate && dateRange.endDate) {
      const paymentDate = new Date(payment.created_at);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (paymentDate < startDate || paymentDate > endDate) return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = [
      "Payment ID",
      "User",
      "Vendor",
      "Package",
      "Amount",
      "Currency",
      "Date",
    ];
    const rows = filteredPayments.map((payment) => [
      payment.payment_id,
      `${payment.user_firstname} ${payment.user_lastname}`,
      payment.individual_name,
      payment.packageName,
      payment.amount,
      payment.currency.toUpperCase(),
      new Date(payment.created_at).toLocaleDateString(),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
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
        <h2 className="text-2xl font-bold text-gray-800">
          Admin Payment History
        </h2>
        <Button
          onClick={exportToCSV}
          // className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
        >
          <FiDownload className="mr-2" />
          Export CSV
        </Button>
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
                Vendor Type
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={handleFilterChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
              >
                <option value="all">All</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setFilter("all");
                  setDateRange({ startDate: "", endDate: "" });
                }}
                variant="ghost"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PaymentsTable
        payouts={filteredPayments}
        isLoading={loading}
        onViewPayment={(payment) =>
          navigate(`/admin/payments/${payment.payment_id}`, {
            state: { payment },
          })
        }
      />
    </div>
  );
};

export default Payments;
