import React from "react";
import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";

const EmployeesTable = ({ employees, isLoading }) => {
  const columns = [
    {
      title: "ID",
      key: "employee_id",
      render: (row) => (
        <div className="text-sm text-gray-900">#{row.employee_id}</div>
      ),
    },
    {
      title: "Name",
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">
          {row.employee_name}
        </div>
      ),
    },
    {
      title: "Email",
      key: "email",
      render: (row) => <div className="text-sm text-gray-900">{row.email}</div>,
    },
    {
      title: "Phone",
      key: "phone",
      render: (row) => <div className="text-sm text-gray-900">{row.phone}</div>,
    },
    {
      title: "Status",
      key: "is_active",
      render: (row) => <StatusBadge status={row.is_active} />,
    },
    {
      title: "Created At",
      key: "created_at",
      render: (row) => (
        <div className="text-sm text-gray-600">
          {new Date(row.created_at).toLocaleDateString()}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={employees}
      isLoading={isLoading}
      emptyMessage="No employees found."
    />
  );
};

export default EmployeesTable;
