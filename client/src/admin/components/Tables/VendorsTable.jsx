import React from "react";
import { FiEye, FiCheck, FiX, FiPlus } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";
import { IconButton } from "../../../shared/components/Button";
import { useState } from "react";
import ApplyServiceModal from "../Modals/ApplyServiceModal";
// import AssignServiceModal from "./AssignServiceModal";

const VendorsTable = ({
  vendors,
  isLoading,
  onViewVendor,
  onApproveVendor,
  onRejectVendor,
  refresh,
}) => {
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const columns = [
    {
      title: "ID",
      key: "vendor_id",
      render: (row) => (
        <div className="text-sm text-gray-900">#{row.vendor_id}</div>
      ),
    },
    {
      title: "Name",
      render: (row) => {
        const name =
          row.vendorType === "individual"
            ? row.individual_name
            : row.company_companyName;
        return (
          <div className="text-sm font-medium text-gray-900">
            {name || "N/A"}
          </div>
        );
      },
    },
    {
      title: "Type",
      key: "vendorType",
      render: (row) => (
        <div className="text-sm text-gray-900 capitalize">{row.vendorType}</div>
      ),
    },
    {
      title: "Email",
      render: (row) => {
        const email =
          row.vendorType === "individual"
            ? row.individual_email
            : row.company_companyEmail;
        return <div className="text-sm text-gray-900">{email || "N/A"}</div>;
      },
    },
    {
      title: "Phone",
      render: (row) => {
        const phone =
          row.vendorType === "individual"
            ? row.individual_phone
            : row.company_companyPhone;
        return <div className="text-sm text-gray-900">{phone || "N/A"}</div>;
      },
    },
    {
      title: "Status",
      key: "is_authenticated",
      render: (row) => <StatusBadge status={row.is_authenticated} />,
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
              onViewVendor(row);
            }}
            tooltip="View details"
          />

          {row.is_authenticated === 0 && (
            <>
              <IconButton
                icon={<FiCheck className="h-4 w-4" />}
                variant="success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveVendor(row.vendor_id);
                }}
                tooltip="Approve"
              />
              <IconButton
                icon={<FiX className="h-4 w-4" />}
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRejectVendor(row.vendor_id);
                }}
                tooltip="Reject"
              />
            </>
          )}

          <IconButton
            icon={<FiPlus className="h-4 w-4" />}
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVendor(row);
              setIsAssignModalOpen(true);
            }}
            tooltip="Apply Service"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={vendors}
        isLoading={isLoading}
        emptyMessage="No vendors found."
        onRowClick={onViewVendor}
      />
      <ApplyServiceModal
        refresh={refresh}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        vendor={selectedVendor}
      />
    </>
  );
};

export default VendorsTable;
