import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import VendorsTable from "../components/Tables/VendorsTable";
import VendorDetailsModal from "../components/Modals/VendorDetailsModal";
import { Button } from "../../shared/components/Button";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { RefreshCcw, Search } from "lucide-react";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Server-driven controls
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search input (500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // reset to first page when search changes
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // fetchVendors uses current page, limit, debouncedSearch and filter
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
      };

      // Add search if present
      if (debouncedSearch) params.search = debouncedSearch;

      // Map UI filter to API status param if your API expects it:
      // assuming API expects something like status=0|1|2 or not sending parameter for 'all'
      if (filter === "pending") params.status = 0;
      else if (filter === "approved") params.status = 1;
      else if (filter === "rejected") params.status = 2;

      const response = await axios.get("/api/admin/getvendors", { params });

      // adapt to your response shape
      const respData = response.data || {};
      setVendors(respData.data || []);
      setPage(respData.page || page);
      setLimit(respData.limit || limit);
      setTotalPages(respData.totalPages || 1);
      setTotal(respData.total || (respData.totalCount ?? 0));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setError("Failed to load vendors");
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filter]);

  // Fetch whenever page, limit, debouncedSearch or filter changes
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleApproveVendor = async (vendorId, status) => {
    try {
      const response = await axios.put(
        `/api/approval/verification/${vendorId}`,
        {
          is_authenticated: status,
        }
      );

      if (response.status === 200) {
        // Update local state (optimistic local update)
        setVendors((prev) =>
          prev.map((vendor) =>
            vendor.vendor_id === vendorId
              ? { ...vendor, is_authenticated: status }
              : vendor
          )
        );

        if (selectedVendor && selectedVendor.vendor_id === vendorId) {
          setSelectedVendor({
            ...selectedVendor,
            is_authenticated: status,
          });
        }

        toast.success(
          `Vendor ${status === 1 ? "approved" : "rejected"} successfully`
        );

        setShowDetailsModal(false);

        // re-fetch current page to guarantee server/client consistency
        fetchVendors();
      }
    } catch (error) {
      console.error("Error updating vendor status:", error);
      toast.error("Failed to update vendor status");
    }
  };

  const viewVendorDetails = (vendor) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  // Pagination helpers
  const goToPage = (p) => {
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setPage(p);
  };

  const onChangeLimit = (newLimit) => {
    setLimit(Number(newLimit));
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Vendor Management</h2>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="flex-1 min-w-0">
            <FormInput
              icon={<Search />}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendor by name, email or company"
              className="w-full"
              aria-label="Search vendors"
            />
          </div>

          <div className="w-full sm:w-56">
            <FormSelect
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1); // reset to first page on filter change
              }}
              options={[
                { value: "all", label: "All Vendors" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
              aria-label="Filter vendors by status"
            />
          </div>

          <div className="flex-shrink-0">
            <Button
              onClick={() => fetchVendors()}
              variant="ghost"
              icon={<RefreshCcw className="mr-2 w-4 h-4" />}
              aria-label="Refresh vendors"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <VendorsTable
        refresh={fetchVendors}
        vendors={vendors}
        isLoading={loading}
        onViewVendor={viewVendorDetails}
        onApproveVendor={(vendorId) => handleApproveVendor(vendorId, 1)}
        onRejectVendor={(vendorId) => handleApproveVendor(vendorId, 2)}
      />

      {/* Pagination controls */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            Showing page {page} of {totalPages} • {total} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Prev
          </button>

          {/* Simple numeric pagination (show up to 7 pages with ellipsis) */}
          <PaginationNumbers
            page={page}
            totalPages={totalPages}
            onGoToPage={goToPage}
          />

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>

          <select
            value={limit}
            onChange={(e) => onChangeLimit(e.target.value)}
            className="ml-3 border rounded px-2 py-1"
            aria-label="Items per page"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <VendorDetailsModal
        refresh={fetchVendors}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        vendor={selectedVendor}
        onApprove={(vendorId) => handleApproveVendor(vendorId, 1)}
        onReject={(vendorId) => handleApproveVendor(vendorId, 2)}
      />
    </div>
  );
};

export default Vendors;

/**
 * Small helper component for rendering page numbers with basic ellipses.
 * Keeps the UI tidy for many pages.
 *
 * Props:
 * - page: current page (number)
 * - totalPages: total pages (number)
 * - onGoToPage: function(pageNumber)
 */
function PaginationNumbers({ page, totalPages, onGoToPage }) {
  const pages = [];

  // show up to 7 page tokens: first, maybe left ellipsis, two before, current, two after, maybe right ellipsis, last
  const add = (p) => pages.push(p);

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
  } else {
    add(1);
    let left = Math.max(2, page - 2);
    let right = Math.min(totalPages - 1, page + 2);

    if (left > 2) add("left-ellipsis");
    for (let i = left; i <= right; i++) add(i);
    if (right < totalPages - 1) add("right-ellipsis");
    add(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, idx) =>
        typeof p === "number" ? (
          <button
            key={idx}
            onClick={() => onGoToPage(p)}
            disabled={p === page}
            className={`px-3 py-1 rounded border ${
              p === page ? "font-bold bg-gray-100" : ""
            }`}
          >
            {p}
          </button>
        ) : p === "left-ellipsis" || p === "right-ellipsis" ? (
          <span key={idx} className="px-2">
            ...
          </span>
        ) : null
      )}
    </div>
  );
}
