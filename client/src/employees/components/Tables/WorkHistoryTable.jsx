import React from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../../shared/components/Table/DataTable";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";

const WorkHistoryTable = ({ bookings, loading }) => {
  const navigate = useNavigate();

  const handleViewDetails = (row) => {
    navigate(`/employees/workhistory/${row.booking_id}`, {
      state: { booking: row },
    });
  };

  const columns = [
    {
      title: "Booking ID",
      key: "bookingId",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">
          {row.booking_id}
        </div>
      ),
    },
    {
      title: "Customer",
      key: "userName",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">{row.userName}</div>
      ),
    },
    {
      title: "Service",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.serviceName}</div>
          <div className="text-xs text-gray-500">{row.serviceCategory}</div>
        </div>
      ),
    },
    {
      title: "Date & Time",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">
            {formatDate(row.bookingDate)}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(row.bookingTime)}
          </div>
        </div>
      ),
    },
    {
      title: "Payment",
      key: "payment_amount",
      render: (row) => (
        <div className="text-sm text-gray-900">${row.payment_amount}</div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={bookings}
      loading={loading}
      onRowClick={handleViewDetails}
      emptyMessage="No bookings found"
    />
  );
};

export default WorkHistoryTable;
