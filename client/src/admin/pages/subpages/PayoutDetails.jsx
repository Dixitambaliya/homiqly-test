// src/app/payouts/PayoutDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../lib/axiosConfig";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { Button } from "../../../shared/components/Button";
import Modal from "../../../shared/components/Modal/Modal"; // adjust path if needed
import { toast } from "react-toastify";
import { CustomFileInput } from "../../../shared/components/CustomFileInput";
import { FormTextarea } from "../../../shared/components/Form";

const PayoutDetails = () => {
  const { payoutId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [payout, setPayout] = useState(location.state?.payout || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal & form state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null); // object URL or existing preview URL
  const [submitting, setSubmitting] = useState(false);

  // Keep track of generated object URL so we can revoke it on cleanup/remove
  const generatedPreviewRef = useRef(null);

  useEffect(() => {
    if (payout) return;

    const fetchPayout = async () => {
      setLoading(true);
      try {
        const singleRes = await api
          .get(`/api/payment/getpayout/${payoutId}`)
          .catch(() => null);

        if (
          singleRes &&
          (Array.isArray(singleRes.data) ? singleRes.data[0] : singleRes.data)
        ) {
          const maybeObj = Array.isArray(singleRes.data)
            ? singleRes.data[0]
            : singleRes.data;
          setPayout(maybeObj);
        } else {
          // Fallback: fetch all and find by id
          const allRes = await api.get("/api/payment/getallpayout");
          const list = Array.isArray(allRes.data)
            ? allRes.data
            : allRes.data.data || [];
          const found = list.find(
            (p) => String(p.payout_request_id ?? p.id) === String(payoutId)
          );
          if (found) setPayout(found);
          else setError("Payout request not found.");
        }
      } catch (err) {
        console.error("Error fetching payout:", err);
        setError("Failed to load payout details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayout();
  }, [payoutId, payout]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (generatedPreviewRef.current) {
        URL.revokeObjectURL(generatedPreviewRef.current);
        generatedPreviewRef.current = null;
      }
    };
  }, []);

  // Handler for CustomFileInput (supports File, event, or array)
  const handleFile = (payload) => {
    // If payload is File directly
    if (payload instanceof File) {
      setSelectedFile(payload);
      createAndSetPreview(payload);
      return;
    }

    // If payload is an event
    if (
      payload &&
      payload.target &&
      payload.target.files &&
      payload.target.files[0]
    ) {
      const f = payload.target.files[0];
      setSelectedFile(f);
      createAndSetPreview(f);
      return;
    }

    // If payload is an array
    if (Array.isArray(payload) && payload[0] instanceof File) {
      setSelectedFile(payload[0]);
      createAndSetPreview(payload[0]);
      return;
    }

    // If payload is an object with file property
    if (payload && payload.file instanceof File) {
      setSelectedFile(payload.file);
      createAndSetPreview(payload.file);
      return;
    }

    // Unknown payload -> clear
    removeImage();
  };

  // create object URL preview and clean previous one
  const createAndSetPreview = (file) => {
    // revoke previous
    if (generatedPreviewRef.current) {
      URL.revokeObjectURL(generatedPreviewRef.current);
      generatedPreviewRef.current = null;
    }

    try {
      const objUrl = URL.createObjectURL(file);
      generatedPreviewRef.current = objUrl;
      setPreview(objUrl);
    } catch (err) {
      console.warn("Failed to create preview URL", err);
      setPreview(null);
    }
  };

  // remove selected file and clear preview
  const removeImage = () => {
    setSelectedFile(null);
    if (generatedPreviewRef.current) {
      URL.revokeObjectURL(generatedPreviewRef.current);
      generatedPreviewRef.current = null;
    }
    setPreview(null);
  };

  const openApproveModal = () => {
    setAdminNotes("");
    removeImage();
    setShowApproveModal(true);
  };

  const closeApproveModal = () => {
    if (submitting) return;
    setShowApproveModal(false);
  };

  const handleApproveSubmit = async (e) => {
    e?.preventDefault?.();
    if (!payoutId) {
      toast.error("Missing payout id");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("status", "1");
      formData.append("admin_notes", adminNotes || "");
      if (selectedFile) formData.append("payoutMedia", selectedFile);

      const res = await api.post(
        `/api/payment/updatepayout/${payoutId}`,
        formData,
        {
          headers: {
            // don't set multipart/form-data manually; axios will set boundary
          },
        }
      );

      toast.success(res?.data?.message || "Payout updated");
      // optimistic update
      setPayout((prev) => ({
        ...prev,
        status: 1,
        admin_notes: adminNotes,
        ...(res.data?.updatedPayout ? res.data.updatedPayout : {}),
      }));

      setShowApproveModal(false);
    } catch (err) {
      console.error("Approve error:", err);
      const msg = err?.response?.data?.message || "Failed to update payout";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-6">
        <button onClick={() => navigate(-1)} className="mb-4 btn btn-ghost">
          Back
        </button>
        <div className="bg-red-50 p-4 rounded-md text-red-600">{error}</div>
      </div>
    );
  }

  if (!payout) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        links={[
          { label: "Admin", to: "/admin" },
          { label: "Payments", to: "/admin/payments" },
          {
            label: `Payout #${payout.payout_request_id ?? payout.id}`,
            to: "#",
          },
        ]}
      />

      <div className="bg-white rounded-md shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Payout Request #{payout.payout_request_id ?? payout.id}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {payout.vendor_name} • Vendor ID: {payout.vendor_id}
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold">
              {payout.requested_amount ? `$${payout.requested_amount}` : "—"}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {payout.created_at
                ? new Date(payout.created_at).toLocaleString()
                : "-"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h3 className="font-medium text-gray-700 mb-2">
              Bank / Account Info
            </h3>
            <div className="text-sm text-gray-800">
              <div>
                <strong>Account holder:</strong>{" "}
                {payout.account_holder_name || "-"}
              </div>
              <div>
                <strong>Bank name:</strong> {payout.bank_name || "-"}
              </div>
              <div>
                <strong>Institution number:</strong>{" "}
                {payout.institution_number || "-"}
              </div>
              <div>
                <strong>Transit:</strong> {payout.transit_number || "-"}
              </div>
              <div>
                <strong>Account #:</strong>{" "}
                {payout.account_number
                  ? `•••• ${String(payout.account_number).slice(-4)}`
                  : "-"}
              </div>
              <div className="mt-2">
                <strong>Bank address:</strong> {payout.bank_address || "-"}
              </div>
            </div>
          </div>

          <div className="border rounded p-4">
            <h3 className="font-medium text-gray-700 mb-2">Vendor Info</h3>
            <div className="text-sm text-gray-800">
              <div>
                <strong>Name:</strong> {payout.vendor_name || "-"}
              </div>
              <div>
                <strong>Email:</strong> {payout.email || "-"}
              </div>
              <div>
                <strong>Vendor type:</strong> {payout.vendorType || "-"}
              </div>
              <div>
                <strong>Business name:</strong> {payout.business_name || "-"}
              </div>
              <div>
                <strong>Government ID:</strong> {payout.government_id || "-"}
              </div>
              <div>
                <strong>Preferred transfer:</strong>{" "}
                {payout.preferred_transfer_type || "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-2">
          <Button onClick={() => navigate(-1)} variant="ghost">
            Back
          </Button>

          <Button onClick={openApproveModal} disabled={payout.status === 1}>
            Approve
          </Button>
        </div>
      </div>

      {/* Approve modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={closeApproveModal}
        title="Approve Payout Request"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Admin notes
            </label>
            <FormTextarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              placeholder="Add notes for vendor or internal record"
            />
          </div>

          <div>
            {/* pass props exactly as you specified */}
            <CustomFileInput
              label="Payment Image"
              onChange={handleFile}
              preview={preview || null}
              onRemove={removeImage}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeApproveModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Approving..." : "Confirm Approve"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PayoutDetails;
