// pages/vendor/components/PaymentsTable.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FiEye } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import { formatDate } from "../../../shared/utils/dateUtils";
import IconButton from "../../../shared/components/Button/IconButton";

const PaymentsTable = ({
  bookings = [],
  isLoading = false,
  filteredStatus = "all",
}) => {
  const navigate = useNavigate();

  const handleViewDetails = (row) => {
    navigate(`/vendor/payments/${row.booking_id}`, {
      state: { payment: row },
    });
  };

  const columns = [
    {
      title: "Booking ID",
      key: "booking_id",
      render: (row) => `#${row.booking_id}`,
    },
    {
      title: "Service ID",
      key: "package_id",
      render: (row) => row.package_id ?? "-",
    },
    {
      title: "Service",
      key: "packageName",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.packageMedia ? (
            <img
              src={row.packageMedia}
              alt={row.packageName || "service"}
              className="w-12 h-8 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-8 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
              N/A
            </div>
          )}
          <div className="text-sm">
            <div className="font-medium">{row.packageName ?? "—"}</div>
            <div className="text-xs text-gray-500">{row.package_id ? `ID: ${row.package_id}` : ""}</div>
          </div>
        </div>
      ),
    },
    {
      title: "User",
      key: "user",
      render: (row) => (
        <div>
          <div className="font-medium">{row.user_name ?? row.user_email ?? "—"}</div>
          {row.user_email && <div className="text-sm text-gray-500">{row.user_email}</div>}
        </div>
      ),
    },
    {
      title: "Date",
      key: "bookingDate",
      render: (row) => (row.bookingDate ? formatDate(row.bookingDate) : "-"),
    },
    {
      title: "Time",
      key: "bookingTime",
      render: (row) => row.bookingTime ?? "-",
    },
    {
      title: "Payment",
      key: "payout_amount",
      render: (row) => {
        const amount =
          row.payout_amount ?? row.totalPrice ?? row.gross_amount ?? 0;
        const currency = (row.currency || "").toUpperCase() || "CAD";
        // Show value with 2 decimals
        const formatted = Number(amount || 0);
        return `${currency === "" ? "" : currency === "CAD" ? "C$" : currency + " "}${formatted.toFixed(2)}`;
      },
    },
    {
      title: "Status",
      key: "payout_status",
      render: (row) => {
        const status = (row.payout_status || "").toLowerCase();
        let label = "Other";
        let color = "bg-gray-100 text-gray-700";

        if (status === "hold") {
          label = "Hold";
          color = "bg-yellow-100 text-yellow-800";
        } else if (status === "paid") {
          label = "Paid";
          color = "bg-blue-100 text-blue-800";
        } else if (status === "completed") {
          label = "Completed";
          color = "bg-green-100 text-green-800";
        } else if (status === "rejected" || status === "cancelled") {
          label = status.charAt(0).toUpperCase() + status.slice(1);
          color = "bg-red-100 text-red-800";
        }

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}
          >
            {label}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (row) => (
        <IconButton
          onClick={() => handleViewDetails(row)}
          variant="ghost"
          icon={<FiEye />}
        />
      ),
    },
  ];

  const filteredBookings =
    filteredStatus && filteredStatus !== "all"
      ? bookings.filter(
          (b) =>
            String((b.payout_status ?? b.bookingStatus ?? "").toLowerCase()) ===
            String(filteredStatus).toLowerCase()
        )
      : bookings;

  return (
    <DataTable
      columns={columns}
      data={filteredBookings}
      isLoading={isLoading}
      emptyMessage="No bookings found."
    />
  );
};

export default PaymentsTable;
