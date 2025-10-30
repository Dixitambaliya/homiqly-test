import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";

import VendorApplicationTable from "../components/Tables/VendorApplicationTable";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import Button from "../../shared/components/Button/Button";
import { FormInput, FormSelect } from "../../shared/components/Form";
import { Search } from "lucide-react";

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
    <div className="p-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Vendor Applications</h2>
          <p className="text-sm text-gray-500">
            Review and approve/reject vendor package applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchPage({ keepPage: true })}
            variant="lightInherit"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        {/* container becomes column on small screens and row on md+ */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 justify-between">
          {/* left: search — grows to fill available space */}
          <div className="flex-1 min-w-0">
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

          {/* right: filters + actions */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 items-stretch">
            {/* status select */}
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
                dropdownDirection="auto" // recommended
                dropdownMaxHeight={280} // optional tweak
                className="w-full"
              />
            </div>

            {/* buttons group: horizontal on >=sm, stacked on xs */}
            <div className="flex items-center space-x-2 justify-end">
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

      {/* Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        {loading && applications.length === 0 ? (
          <div className="flex justify-center items-center h-64">
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

            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              onNext={() => {}}
              onPrev={() => {}}
              limit={limit}
              onLimit={setLimit}
              limitOptions={[5, 10, 20, 50]}
              total={total}
              windowSize={5}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default VendorApplications;
