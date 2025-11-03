import React from "react";
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";
import Button from "../../../shared/components/Button/Button";
import { CheckCircle, Eye, XCircle } from "lucide-react";

/** Small renderer for status */
const StatusPill = ({ status }) => {
  const map = {
    0: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
    1: { label: "Approved", cls: "bg-green-100 text-green-700" },
    2: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] || map[0];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
};

const VendorApplicationTable = ({
  applications,
  isLoading,
  updatingId,
  onApprove,
  onReject,
  onView,
}) => {
  const columns = [
    {
      title: "ID",
      key: "application_id",
      render: (row) => (
        <div className="text-sm text-gray-900">#{row.application_id}</div>
      ),
    },
    {
      title: "Vendor",
      key: "vendorName",
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.vendorName}
          </div>
          <div className="text-xs text-gray-500">{row.vendorEmail}</div>
        </div>
      ),
    },
    {
      title: "Package",
      key: "packageName",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.packageName}</div>
          <div className="text-xs text-gray-500">
            {row.subPackages?.length} items
          </div>
        </div>
      ),
    },

    {
      title: "Status",
      key: "status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          {row.status === 0 || row.status === 1 || row.status === 2 ? (
            <>
              <IconButton
                icon={<CheckCircle />}
                variant="success"
                size="sm"
                disabled={updatingId === row.application_id}
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(row.application_id);
                }}
                tooltip="Approve"
              />
              <IconButton
                icon={<XCircle />}
                variant="danger"
                size="sm"
                disabled={updatingId === row.application_id}
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(row.application_id);
                }}
                tooltip="Reject"
              />
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onView(row);
              }}
            >
              View
            </Button>
          )}
          <IconButton
            icon={<Eye />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(row);
            }}
            tooltip="View details"
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={applications}
      isLoading={isLoading}
      emptyMessage="No vendor applications found."
      onRowClick={onView}
    />
  );
};

export default VendorApplicationTable;
