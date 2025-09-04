import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import VendorApplicationTable from "../components/Tables/VendorApplicationTable";

const VendorApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

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

  const handleView = (row) => {
    navigate(`/admin/vendor-applications/${row.application_id}`, {
      state: { application: row }, // <- pass full row (no API on details page)
    });
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  return (
    <div className="p-3 ">
      <h2 className="text-2xl font-bold mb-1">Vendor Applications</h2>
      <p className="text-sm text-gray-500 mb-6">
        Review and approve/reject vendor package applications.
      </p>

      <VendorApplicationTable
        applications={applications}
        isLoading={loading}
        updatingId={updatingId}
        onApprove={(id) => updateStatus(id, 1)}
        onReject={(id) => updateStatus(id, 2)}
        onView={handleView}
      />
    </div>
  );
};

export default VendorApplications;
