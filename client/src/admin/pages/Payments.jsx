import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import { formatCurrency } from "../../shared/utils/formatUtils";
import { Button } from "../../shared/components/Button";
import PaymentsTable from "../components/Tables/PaymentsTable";
import { useNavigate } from "react-router-dom";
import { FormInput, FormSelect } from "../../shared/components/Form";
import Pagination from "../../shared/components/Pagination";
import { RefreshCcw, Search } from "lucide-react";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [filter, setFilter] = useState("all"); // all, individual, company
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  const navigate = useNavigate();

  // debounce search (500ms) -> update debouncedSearch and reset page
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // whenever filter or dateRange changes reset to first page
  useEffect(
    () => setPage(1),
    [filter, dateRange.startDate, dateRange.endDate, limit]
  );

  const fetchPayments = useCallback(
    async (opts = {}) => {
      try {
        // Keep loading true so child table / controls can show inline loaders,
        // but we will NOT force a full-page spinner unless there are no payments.
        setLoading(true);
        setError(null);

        const qPage = opts.page ?? page;
        const qLimit = opts.limit ?? limit;
        const qSearch = opts.search ?? debouncedSearch;
        const qFilter = opts.filter ?? filter;
        const qStart = opts.startDate ?? dateRange.startDate;
        const qEnd = opts.endDate ?? dateRange.endDate;

        const params = {
          page: qPage,
          limit: qLimit,
        };

        if (qSearch) params.search = qSearch;

        // map filter to vendorType param if backend expects that name
        if (qFilter && qFilter !== "all") params.vendorType = qFilter;

        if (qStart) params.startDate = qStart;
        if (qEnd) params.endDate = qEnd;

        const response = await axios.get("/api/admin/getpayments", { params });
        const data = response.data || {};

        // set payments array (common key: payments)
        setPayments(data.payments ?? data.data ?? []);

        // pagination fields (support multiple possible names)
        setPage(data.page ?? qPage);
        setLimit(data.limit ?? qLimit);
        setTotalPages(data.totalPages ?? data.total_pages ?? 1);
        setTotalPayments(
          data.totalPayments ??
            data.total ??
            data.count ??
            (Array.isArray(data.payments) ? data.payments.length : 0)
        );
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payment history");
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      limit,
      debouncedSearch,
      filter,
      dateRange.startDate,
      dateRange.endDate,
    ]
  );

  // initial + reactive fetch when page/limit/debouncedSearch/filter/dateRange change
  useEffect(() => {
    fetchPayments();
  }, [
    fetchPayments,
    page,
    limit,
    debouncedSearch,
    filter,
    dateRange.startDate,
    dateRange.endDate,
  ]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const normalize = (v) =>
    (v === null || v === undefined ? "" : String(v)).toLowerCase().trim();

  const matchesSearch = (payment, term) => {
    if (!term) return true;
    const t = term.toLowerCase().trim();

    // possible ID fields
    const idCandidates = [payment.payment_id, payment.id, payment._id];
    const idCombined = idCandidates.filter(Boolean).join(" ");

    // possible user name fields
    const userCandidates = [
      `${payment.user_firstname || ""} ${payment.user_lastname || ""}`,
      payment.user?.name,
      payment.user_name,
      payment.customer_name,
    ];
    const userCombined = userCandidates.filter(Boolean).join(" ");

    // possible vendor fields (individual/company)
    const vendorCandidates = [
      payment.individual_name,
      payment.company_name,
      payment.vendor_name,
      payment.vendor?.name,
    ];
    const vendorCombined = vendorCandidates.filter(Boolean).join(" ");

    return (
      normalize(idCombined).includes(t) ||
      normalize(userCombined).includes(t) ||
      normalize(vendorCombined).includes(t)
    );
  };

  // Allow a small client-side filter on top of server results for better UX (search already server-backed, but safe)
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (filter !== "all" && payment.vendorType !== filter) return false;

      if (dateRange.startDate && dateRange.endDate) {
        const paymentDate = new Date(
          payment.created_at || payment.createdAt || payment.date
        );
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (isNaN(paymentDate.getTime())) return false;
        if (paymentDate < startDate || paymentDate > endDate) return false;
      }

      // We use debouncedSearch here (server requested same) so this is mostly safe
      if (!matchesSearch(payment, debouncedSearch)) return false;

      return true;
    });
  }, [
    payments,
    filter,
    dateRange.startDate,
    dateRange.endDate,
    debouncedSearch,
  ]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Admin Payment History
        </h2>
        
        <div className="flex items-center space-x-2">
          <div className="hidden mr-2 text-sm text-gray-600 md:block">
            Page {page} of {totalPages}
          </div>

          <Button
            className="h-9"
            onClick={fetchPayments}
            variant="outline"
            icon={<RefreshCcw className="w-4 h-4 mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 mb-6 bg-white rounded-lg shadow">
        <div className="grid items-end grid-cols-1 gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              label="Search"
              type="text"
              placeholder="Search by Payment ID, user or vendor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              aria-label="Search payments"
            />
          </div>

          <div className="md:col-span-1">
            <FormSelect
              label="Vendor Type"
              id="status-filter"
              value={filter}
              onChange={handleFilterChange}
              options={[
                { value: "all", label: "All" },
                { value: "individual", label: "Individual" },
                { value: "company", label: "Company" },
              ]}
              className="w-full"
              aria-label="Filter by vendor type"
            />
          </div>

          <div className="md:col-span-1">
            <FormInput
              label="Start Date"
              type="date"
              id="start-date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full"
              aria-label="Start date"
            />
          </div>

          <div className="md:col-span-1">
            <FormInput
              type="date"
              label="End Date"
              id="end-date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full"
              aria-label="End date"
            />
          </div>

          <div className="flex justify-start space-x-2 md:col-span-1 md:justify-end">
            <Button
              variant="ghost"
              className="px-3 py-2"
              onClick={() => {
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
                setSearchTerm("");
              }}
              aria-label="Clear filters"
            >
              Clear Filters
            </Button>

            <Button
              variant="outline"
              className="px-3 py-2"
              onClick={() => {
                setSearchTerm("");
                setFilter("all");
                setDateRange({ startDate: "", endDate: "" });
                setLimit(10);
                setPage(1);
              }}
              aria-label="Reset all"
            >
              Reset All
            </Button>
          </div>
        </div>
      </div>

      {/* Error banner (inline) */}
      {error && (
        <div className="p-4 mb-4 rounded-md bg-red-50">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* If it's the very first load and there are no payments yet, show full-page spinner */}
      {loading && payments.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-hidden">
          {/* Payments table. Pass isLoading so the table can show inline skeleton/loader */}
          <PaymentsTable
            payouts={filteredPayments}
            isLoading={loading}
            onViewPayment={(payment) =>
              navigate(`/admin/payments/${payment.payment_id}`, {
                state: { payment },
              })
            }
          />

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 mt-4 sm:flex-row">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              disabled={loading}
              keepVisibleOnSinglePage={true}
              totalRecords={totalPayments}
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
      )}
    </div>
  );
};

export default Payments;