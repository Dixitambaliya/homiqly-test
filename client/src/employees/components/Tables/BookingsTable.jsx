import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";
import { IconButton } from "../../../shared/components/Button";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import { useNavigate } from "react-router-dom";
import PaymentBadge from "../../../shared/components/PaymentBadge";
import { CheckCircle, Eye, XCircle } from "lucide-react";

const BookingsTable = ({
  bookings,
  isLoading,
  onApproveBooking,
  onRejectBooking,
  filteredStatus,
}) => {
  const navigate = useNavigate();

  const handleViewDetails = (row) => {
    navigate(`/employees/bookings/${row.booking_id}`, {
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
      key: "payment_status",
      render: (row) => <PaymentBadge status={row.payment_status} />,
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
            icon={<Eye className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row)}
            tooltip="View details"
          />
          {row.bookingStatus === 0 && (
            <>
              <IconButton
                icon={<CheckCircle className="h-4 w-4" />}
                variant="success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveBooking(row.booking_id || row.bookingId);
                }}
                tooltip="Accept"
              />
              <IconButton
                icon={<XCircle className="h-4 w-4" />}
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
    />
  );
};

export default BookingsTable;
