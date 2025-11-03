import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";

import VendorApplicationTable from "../components/Tables/VendorApplicationTable";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import Button from "../../shared/components/Button/Button";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { RefreshCcw, Search } from "lucide-react";

import useServerPagination from "../../shared/hooks/useServerPagination";
import Pagination from "../../shared/components/Pagination";

const fetchVendorApplications = async (params) => {
  const res = await api.get("/api/admin/getvendorapplication", { params });
  return res.data;
};

const VendorApplications = () => {
  const navigate = useNavigate();

  const {
    state: {
      data: applications,
      loading,
      page,
      limit,
      total,
      totalPages,
      search,
      filters,
    },
    actions: {
      setPage,
      setLimit,
      setSearch,
      setFilters,
      refresh,
      reset,
      fetchPage,
    },
  } = useServerPagination(fetchVendorApplications, {
    page: 1,
    limit: 10,
    search: "",
    filters: { status: "all" },
  });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/admin/approverejectapplication/${id}`, { status });
      toast.success(`Application ${id} updated`);
      // refresh current page without changing current page
      fetchPage({ keepPage: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleView = (row) => {
    navigate(`/admin/vendor-applications/${row.application_id}`, {
      state: { application: row },
    });
  };

  // When using FormSelect to update status filter:
  const onStatusChange = (val) => {
    setFilters((prev) => ({ ...prev, status: val }));
    setPage(1);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-gray-800">Vendor Applications</h2>
          <p className="text-sm text-gray-500">
            Review and approve/reject vendor package applications.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden mr-2 text-sm text-gray-600 md:block">
            Page {page} of {totalPages}
          </div>

          <Button
            className="h-9"
            onClick={() => fetchPage({ keepPage: true })}
            variant="outline"
            icon={<RefreshCcw className="w-4 h-4 mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end md:gap-6">
          {/* Search */}
          <div className="flex-1 min-w-0 md:max-w-xs">
            <FormInput
              icon={<Search className="w-4 h-4" />}
              id="search"
              label="Search"
              type="text"
              placeholder="Search by applicant, package or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col items-stretch w-full gap-3 md:w-auto sm:flex-row sm:items-end sm:gap-4">
            {/* Status Select */}
            <div className="w-full sm:w-40">
              <FormSelect
                id="status"
                label="Status"
                value={filters?.status ?? "all"}
                onChange={(e) => onStatusChange(e.target.value)}
                options={[
                  { value: "all", label: "All" },
                  { value: "0", label: "Pending" },
                  { value: "1", label: "Approved" },
                  { value: "2", label: "Rejected" },
                ]}
                dropdownDirection="auto"
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({ status: "all" });
                  setPage(1);
                }}
                className="h-10 px-3"
              >
                Clear
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  reset();
                }}
                className="h-10 px-3"
              >
                Reset All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table and Pagination */}
      <div className="overflow-hidden">
        {loading && applications.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <VendorApplicationTable
              applications={applications}
              isLoading={loading}
              onApprove={(id) => updateStatus(id, 1)}
              onReject={(id) => updateStatus(id, 2)}
              onView={handleView}
            />

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 mt-4 sm:flex-row">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                disabled={loading}
                keepVisibleOnSinglePage={true}
                totalRecords={total}
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
          </>
        )}
      </div>
    </div>
  );
};

export default VendorApplications;