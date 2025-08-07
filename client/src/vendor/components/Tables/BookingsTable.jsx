import React from "react";
import { FiEye, FiCheckCircle, FiXCircle } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";
import { Button, IconButton } from "../../../shared/components/Button";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";

const BookingsTable = ({
  bookings,
  isLoading,
  onViewBooking,
  onApproveBooking,
  onRejectBooking,
  filteredStatus,
  employees = [],
  onSelectEmployee,
  onAssignEmployee,
}) => {
  const vendorType = localStorage.getItem("vendorData")
    ? JSON.parse(localStorage.getItem("vendorData"))?.vendor_type
    : null;

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
    ...(vendorType !== "individual"
      ? [
          {
            title: "Assign Employee",
            key: "employeeName",
            render: (row) => (
              <div className="py-4 whitespace-nowrap">
                {row.assignedEmployee && row.assignedEmployee.name ? (
                  <span className="text-gray-800">
                    {row.assignedEmployee.name}
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={row.selectedEmployeeId || ""}
                      onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        onSelectEmployee(row.booking_id, selectedId);
                      }}
                    >
                      <option value="">Select</option>
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_name}
                        </option>
                      ))}
                    </select>

                    <Button
                      onClick={() => onAssignEmployee(row.booking_id)}
                      disabled={!row.selectedEmployeeId}
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            ),
          },
        ]
      : []),
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
        <div className="text-sm text-gray-900">{row.payment_amount}</div>
      ),
    },
    {
      title: "Status",
      key: "bookingStatus",
      render: (row) => <StatusBadge status={row.bookingStatus} />,
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            icon={<FiEye className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewBooking(row);
            }}
            tooltip="View details"
          />

          {row.bookingStatus === 0 && (
            <>
              <IconButton
                icon={<FiCheckCircle className="h-4 w-4" />}
                variant="success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveBooking(row.booking_id || row.bookingId);
                }}
                tooltip="Accept"
              />
              <IconButton
                icon={<FiXCircle className="h-4 w-4" />}
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRejectBooking(row.booking_id || row.bookingId);
                }}
                tooltip="Reject"
              />
            </>
          )}
        </div>
      ),
    },
  ];

  // Filter bookings by status if needed
  const filteredBookings =
    filteredStatus !== undefined && filteredStatus !== "all"
      ? bookings.filter(
          (booking) => booking.bookingStatus === parseInt(filteredStatus)
        )
      : bookings;

  return (
    <DataTable
      columns={columns}
      data={filteredBookings}
      isLoading={isLoading}
      emptyMessage="No bookings found."
      // onRowClick={onViewBooking}
    />
  );
};

export default BookingsTable;
