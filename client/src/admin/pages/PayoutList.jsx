// src/app/payouts/PayoutList.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/axiosConfig";
import PayoutsTable from "../components/Tables/PayoutsTable";
import { toast } from "react-toastify";
import { FiDownload } from "react-icons/fi";

const PayoutList = () => {
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/payment/getallpayout");
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setPayouts(data);
    } catch (err) {
      setError(err);
      console.error("Fetch payouts error:", err);
      toast.error?.("Failed to load payouts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // NAVIGATE to details page and pass the selected payout in state
  const handleView = (maybeRow) => {
    let row = null;

    if (!maybeRow) {
      console.warn("handleView called without row");
      return;
    }

    // If DataTable sends an object wrapper like { original: row } or { row: {...} }, try those
    if (maybeRow.original && typeof maybeRow.original === "object") {
      row = maybeRow.original;
      console.log("original");
    } else if (maybeRow.row && typeof maybeRow.row === "object") {
      row = maybeRow.row;
      console.log("object");
    } else if (maybeRow.currentTarget || maybeRow.target) {
      // Looks like an event — try to find attached dataset or bail
      console.warn(
        "handleView got an event rather than row. Inspect the DataTable's onRowClick signature."
      );
      return;
    } else {
      row = maybeRow;
    }

    const id = row?.payout_request_id;

    if (!id) {
      console.warn("Couldn't find id on row:", row);
      return;
    }
    navigate(`/admin/payments/payoutlist/${id}`, { state: { payout: row } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Payout List
        </h2>
      </div>{" "}
      <PayoutsTable
        payouts={payouts}
        isLoading={isLoading}
        onView={handleView}
      />
      {error && (
        <div className="text-sm text-red-600 mt-3">Failed to load payouts.</div>
      )}
    </div>
  );
};

export default PayoutList;
