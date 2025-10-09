// components/PromosTable.jsx
import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";

const PromosTable = ({ promos = [], isLoading = false, onEdit, onDelete }) => {
  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString() : "-";

  const renderDiscount = (row) => {
    // Prefer multiple possible fields (match your original data)
    const v = row.discountValue ?? row.discount_value ?? row.discount ?? "-";
    return <div className="text-sm text-gray-900">{v}</div>;
  };

  const renderType = (row) => (
    <div className="text-sm text-gray-900">
      {row.discount_type ?? row.discountType ?? "-"}
    </div>
  );

  const renderNumberFallback = (value) => (
    <div className="text-sm text-gray-900">{value ?? "-"}</div>
  );

  const columns = [
    {
      title: "Code",
      key: "code",
      render: (row) => <div className="text-sm font-medium">{row.code}</div>,
    },
    {
      title: "Discount",
      key: "discount",
      render: (row) => renderDiscount(row),
    },
    {
      title: "Type",
      key: "type",
      render: (row) => renderType(row),
    },
    {
      title: "Min Spend",
      key: "minSpend",
      render: (row) =>
        renderNumberFallback(
          row.minSpend ?? row.min_spend ?? row.min_spend_value
        ),
    },
    {
      title: "Max Uses",
      key: "maxUse",
      render: (row) =>
        renderNumberFallback(row.maxUse ?? row.max_use ?? row.max_uses),
    },
    {
      title: "Start",
      key: "start_date",
      render: (row) => (
        <div className="text-sm">{formatDateTime(row.start_date)}</div>
      ),
    },
    {
      title: "End",
      key: "end_date",
      render: (row) => (
        <div className="text-sm">{formatDateTime(row.end_date)}</div>
      ),
    },
    {
      title: "Required Bookings",
      key: "requiredBookings",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.requiredBookings ?? row.required_bookings ?? 0}
        </div>
      ),
    },
    {
      title: "Description",
      key: "description",
      render: (row) => (
        <div className="text-sm text-gray-700">
          {row.description ? row.description : "-"}
        </div>
      ),
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            icon={<Edit2 className="w-4 h-4" />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit(row);
            }}
            tooltip="Edit promo"
          />
          <IconButton
            icon={<Trash2 className="w-4 h-4" />}
            variant="lightDanger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete(row);
            }}
            tooltip="Delete promo"
          />
        </div>
      ),
    },
  ];

  // You can apply additional filtering here if needed before passing to DataTable
  const data = promos || [];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyMessage="No promo codes found."
      // onRowClick could be provided if you want click-to-edit behavior
      // onRowClick={(row) => onEdit && onEdit(row)}
    />
  );
};

export default PromosTable;
