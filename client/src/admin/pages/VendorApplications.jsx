import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import VendorApplicationTable from "../components/Tables/VendorApplicationTable";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import Button from "../../shared/components/Button/Button";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { Search } from "lucide-react";

const VendorApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // filters & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // server pagination state (controlled by backend)
  const [page, setPage] = useState(1); // requested page
  const [limit, setLimit] = useState(10); // requested limit
  const [total, setTotal] = useState(0); // total records from backend
  const [totalPages, setTotalPages] = useState(1); // total pages from backend

  const navigate = useNavigate();

  // debounce search so we don't hit API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      // NOTE: your original endpoint was /api/admin/getvendorapplication
      // If you are using a different paginated endpoint for vendor side, change below.
      const res = await api.get("/api/admin/getvendorapplication", { params });

      // Try to extract page data from common shapes
      const pageData =
        res?.data?.applications ?? res?.data?.data ?? res?.data?.rows ?? [];
      const apiCurrentPage =
        typeof res?.data?.currentPage !== "undefined"
          ? Number(res.data.currentPage)
          : undefined;
      const apiTotalPages =
        typeof res?.data?.totalPages !== "undefined"
          ? Number(res.data.totalPages)
          : undefined;
      const apiTotalRecords =
        typeof res?.data?.totalRecords !== "undefined"
          ? Number(res.data.totalRecords)
          : typeof res?.data?.total !== "undefined"
          ? Number(res.data.total)
          : pageData.length;
      const apiLimit =
        typeof res?.data?.limit !== "undefined"
          ? Number(res.data.limit)
          : undefined;

      setApplications(pageData);
      setTotal(Number(apiTotalRecords) || pageData.length);

      if (apiLimit && apiLimit !== limit) setLimit(apiLimit);
      if (apiCurrentPage && apiCurrentPage !== page) setPage(apiCurrentPage);

      if (apiTotalPages) {
        setTotalPages(apiTotalPages);
      } else {
        setTotalPages(
          Math.max(
            1,
            Math.ceil(
              (apiTotalRecords || pageData.length) / (apiLimit || limit)
            )
          )
        );
      }
    } catch (err) {
      console.error("Failed to fetch vendor applications:", err);
      toast.error(
        err?.response?.data?.message || "Failed to load applications"
      );
      setApplications([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  // fetch whenever params change
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      await api.put(`/api/admin/approverejectapplication/${id}`, { status });
      toast.success(`Application ${id} updated`);
      // refresh current page
      fetchApplications();
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleView = (row) => {
    navigate(`/admin/vendor-applications/${row.application_id}`, {
      state: { application: row },
    });
  };

  // pagination helpers
  const goToPage = (p) => {
    const bounded = Math.max(1, Math.min(totalPages, p));
    if (bounded !== page) setPage(bounded);
  };
  const handleLimitChange = (newLimit) => {
    setLimit(Number(newLimit));
    setPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setLimit(10);
    setPage(1);
  };

  // helper to build page window
  const getPageWindow = () => {
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }
    const arr = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  };

  // render states
  if (loading && applications.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Vendor Applications</h2>
          <p className="text-sm text-gray-500">
            Review and approve/reject vendor package applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchApplications} variant="lightInherit">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              id="search"
              label="Search"
              type="text"
              placeholder="Search by applicant, package or ID"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // page reset is handled by debounce effect
              }}
            />
          </div>

          <div className="md:col-span-1">
            <FormSelect
              id="status"
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "0", label: "Pending" },
                { value: "1", label: "Approved" },
                { value: "2", label: "Rejected" },
              ]}
            />
          </div>

          <div className="md:col-span-3 flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetFilters();
              }}
            >
              Reset All
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <VendorApplicationTable
          applications={applications}
          isLoading={loading}
          updatingId={updatingId}
          onApprove={(id) => updateStatus(id, 1)}
          onReject={(id) => updateStatus(id, 2)}
          onView={handleView}
        />

        {/* Pagination bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t">
          <div className="flex items-center gap-3">
            <div>
              <label className="text-sm mr-2">Show</label>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="ml-2 text-sm text-gray-600">entries</span>
            </div>

            <div className="text-sm text-gray-600">
              {total === 0 ? (
                "No entries"
              ) : (
                <>
                  Showing{" "}
                  <strong>{Math.min((page - 1) * limit + 1, total)}</strong> to{" "}
                  <strong>{Math.min(page * limit, total)}</strong> of{" "}
                  <strong>{total}</strong> entries
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {getPageWindow().map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`px-3 py-1 border rounded ${
                    p === page ? "bg-gray-200 font-semibold" : ""
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorApplications;
