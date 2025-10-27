// src/app/components/Tables/PayoutsTable.jsx
import React from "react";
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";
import { formatDate } from "../../../shared/utils/dateUtils";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import { Eye } from "lucide-react";

const statusMap = {
  0: "Pending",
  1: "Approved",
  2: "Rejected",
};

const PayoutsTable = ({
  payouts = [],
  isLoading,
  onView,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      title: "Request ID",
      key: "payout_request_id",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.payout_request_id ?? row.id}
        </div>
      ),
    },
    {
      title: "Vendor ID",
      key: "vendor_id",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.vendor_id}</div>
      ),
    },
    {
      title: "Vendor Name",
      key: "vendor_name",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">
          {row.vendor_name || "—"}
        </div>
      ),
    },
    {
      title: "Amount",
      key: "requested_amount",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.requested_amount ? formatCurrency(row.requested_amount) : "—"}
        </div>
      ),
    },
    {
      title: "Bank / Account",
      key: "bank_info",
      render: (row) => (
        <div className="text-sm text-gray-700">
          <div>{row.account_holder_name || "—"}</div>
          <div className="text-xs text-gray-500">{row.bank_name || ""}</div>
        </div>
      ),
    },
    {
      title: "Transfer Type",
      key: "preferred_transfer_type",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.preferred_transfer_type || "—"}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {statusMap[row.status] ?? row.status}
        </div>
      ),
    },
    {
      title: "Requested At",
      key: "created_at",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {formatDate(row.created_at)}
        </div>
      ),
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            icon={<Eye />}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              // pass row explicitly so parent always gets the object
              onView?.(row);
            }}
            tooltip="View"
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payouts}
      isLoading={isLoading}
      emptyMessage="No payout requests found."
      // wrap to ensure the table passes the row object (in case DataTable passes event or different args)
      onRowClick={(row) => onView?.(row)}
    />
  );
};

export default PayoutsTable;
