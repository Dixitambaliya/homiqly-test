import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import Button from "../../shared/components/Button/Button";

const VendorApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/getvendorapplication");
      setApplications(res.data?.applications || []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load applications"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      await api.put(`/api/admin/approverejectapplication/${id}`, { status });
      toast.success(`Application ${id} updated`);
      await fetchApplications();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  return (
    <div className="mt-12 p-6 bg-white shadow rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-1">📦 Vendor Applications</h2>
      <p className="text-sm text-gray-500 mb-6">
        Review and approve/reject vendor package applications.
      </p>

      {loading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-gray-500">Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <p className="text-gray-500">No applications found.</p>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {applications.map((app) => (
                <tr key={app.application_id}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {app.application_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>{app.vendorName}</div>
                    <div className="text-gray-500 text-xs">
                      {app.vendorEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {app.packageName}
                    <div className="text-gray-500 text-xs">
                      {app.totalTime} · {app.sub_packages?.length || 0} items
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {app.totalPrice}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {app.status === 1 ? (
                      <span className="text-green-600 font-medium">
                        Approved
                      </span>
                    ) : app.status === 0 ? (
                      <span className="text-yellow-600 font-medium">
                        Pending
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">Rejected</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateStatus(app.application_id, 1)}
                        disabled={updatingId === app.application_id}
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateStatus(app.application_id, 2)}
                        disabled={updatingId === app.application_id}
                        variant="error"
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VendorApplications;
