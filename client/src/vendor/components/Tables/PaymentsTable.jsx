// pages/vendor/components/PaymentsTable.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../../shared/components/Table/DataTable";
import { formatDate } from "../../../shared/utils/dateUtils";
import IconButton from "../../../shared/components/Button/IconButton";
import { Eye } from "lucide-react";

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

  // Normalize bookings so the table column renderers can rely on consistent keys
  const normalizedBookings = useMemo(() => {
    return (bookings || []).map((b) => {
      const firstPackage =
        Array.isArray(b.packages) && b.packages.length > 0
          ? b.packages[0]
          : null;

      return {
        // keep original object around for reference
        ...b,
        // normalized fields used by columns
        package_id: firstPackage?.package_id ?? b.package_id ?? null,
        packageName:
          firstPackage?.packageName ??
          b.packageName ??
          firstPackage?.sub_packages?.[0]?.sub_package_name ??
          "-",
        packageMedia:
          firstPackage?.packageMedia ??
          firstPackage?.sub_packages?.[0]?.sub_package_media ??
          b.packageMedia ??
          null,
        // Payment amount fallback order preserved
        payout_amount: b.payout_amount ?? b.totalPrice ?? b.gross_amount ?? 0,
        // currency normalized to upper-case code (or empty string)
        currency: (b.currency || "").toString().trim().toUpperCase(),
        // unify status field
        payout_status: (b.payout_status ?? b.bookingStatus ?? "")
          .toString()
          .toLowerCase(),
        // ensure bookingDate is passed through (formatDate handles ISO)
        bookingDate: b.bookingDate ?? b.created_at ?? null,
        bookingTime: b.bookingTime ?? b.time ?? null,
      };
    });
  }, [bookings]);

  const columns = [
    {
      title: "Booking ID",
      key: "booking_id",
      render: (row) => `#${row.booking_id}`,
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
            <div className="text-xs text-gray-500">
              {row.package_id ? `ID: ${row.package_id}` : ""}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "User",
      key: "user",
      render: (row) => (
        <div>
          <div className="font-medium">
            {row.user_name ?? row.user_email ?? "—"}
          </div>
          {row.user_email && (
            <div className="text-sm text-gray-500">{row.user_email}</div>
          )}
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
        const amount = Number(row.payout_amount || 0);
        const currency = (row.currency || "").toUpperCase(); // already normalized above
        const formatted = amount.toFixed(2);

        const prefix =
          currency === "" ? "" : currency === "CAD" ? "C$" : currency + " ";

        return `${prefix}${formatted}`;
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
        } else if (status === "pending") {
          label = "Pending";
          color = "bg-yellow-100 text-yellow-800";
        } else if (status === "paid") {
          label = "Paid";
          color = "bg-blue-100 text-blue-800";
        } else if (status === "completed") {
          label = "Completed";
          color = "bg-green-100 text-green-800";
        } else if (
          status === "rejected" ||
          status === "cancelled" ||
          status === "canceled"
        ) {
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
          icon={<Eye />}
        />
      ),
    },
  ];

  const filteredBookings =
    filteredStatus && filteredStatus !== "all"
      ? normalizedBookings.filter(
          (b) =>
            String(b.payout_status).toLowerCase() ===
            String(filteredStatus).toLowerCase()
        )
      : normalizedBookings;

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
