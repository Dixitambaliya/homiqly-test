import React from "react";
import { FiCheck, FiEye } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import { formatDate } from "../../../shared/utils/dateUtils";

const PaymentsTable = ({ payouts, isLoading, onViewPayment }) => {
  const columns = [
    {
      title: "Payment ID",
      key: "payment_id",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">
          #{row.payment_id}
        </div>
      ),
    },
    {
      title: "User",
      key: "user_firstname",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">
            {row.user_firstname} {row.user_lastname}
          </div>
          <div className="text-xs text-gray-500">{row.user_email}</div>
        </div>
      ),
    },
    {
      title: "Vendor",
      key: "individual_name",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">
            {row.individual_name || row.companyName}
          </div>
          <div className="text-xs text-gray-500">{row.vendorType}</div>
        </div>
      ),
    },
    {
      title: "Package",
      key: "packageName",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.packageName}</div>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      render: (row) => (
        <div className="text-sm font-medium text-green-600">
          {formatCurrency(row.amount)}
        </div>
      ),
    },
    {
      title: "Currency",
      key: "currency",
      render: (row) => (
        <div className="text-sm text-gray-700">
          {row.currency?.toUpperCase()}
        </div>
      ),
    },
    {
      title: "Date",
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
        <IconButton
          icon={<FiEye className="h-4 w-4" />}
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewPayment(row); // ✅ Pass full payment row
          }}
          tooltip="View details"
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payouts}
      isLoading={isLoading}
      emptyMessage="No payment records found."
    />
  );
};

export default PaymentsTable;
