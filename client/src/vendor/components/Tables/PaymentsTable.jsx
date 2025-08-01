// pages/vendor/components/PaymentsTable.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FiEye } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import { formatDate } from "../../../shared/utils/dateUtils";

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
      key: "service_id",
      render: (row) => row.service_id,
    },
    {
      title: "Date",
      key: "bookingDate",
      render: (row) => formatDate(row.bookingDate),
    },
    {
      title: "Time",
      key: "bookingTime",
      render: (row) => row.bookingTime,
    },
    {
      title: "Status",
      key: "bookingStatus",
      render: (row) => {
        const status = row.bookingStatus;
        const label =
          status === 4 ? "Completed" : status === 1 ? "Approved" : "Other";
        const color =
          status === 4
            ? "bg-green-100 text-green-800"
            : status === 1
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-700";

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
        <button
          className="text-primary hover:text-primary-dark"
          onClick={() => handleViewDetails(row)}
        >
          <FiEye />
        </button>
      ),
    },
  ];

  const filteredBookings =
    filteredStatus !== "all"
      ? bookings.filter(
          (b) => String(b.bookingStatus) === String(filteredStatus)
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
