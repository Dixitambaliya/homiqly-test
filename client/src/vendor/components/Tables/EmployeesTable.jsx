import React from "react";
import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";
import { FiTrash2 } from "react-icons/fi";
import api from "../../../lib/axiosConfig";
import { IconButton } from "../../../shared/components/Button";
import { Edit, Icon, Pen, Pencil } from "lucide-react";

const EmployeesTable = ({ employees, isLoading, onDelete, onEdit }) => {
  const handleDelete = async (employee_id) => {
    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;
    try {
      await api.delete("/api/employee/remove-employee", {
        data: { employee_id },
      });
      onDelete(); // Refresh list
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert("Error deleting employee. Please try again.");
    }
  };

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
          {row.first_name} {row.last_name}
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
    {
      title: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <IconButton
            className="text-red-600 hover:text-red-800 p-1"
            onClick={() => handleDelete(row.employee_id)}
            title="Delete employee"
            icon={<FiTrash2 className="h-4 w-4" />}
            variant="lightDanger"
          >
            {/* <FiTrash2 /> */}
          </IconButton>
          <IconButton
            className="text-blue-600 hover:text-blue-800 p-1"
            onClick={() => onEdit(row)}
            title="Edit employee"
            icon={<Pencil name="edit" className="h-4 w-4" />}
            variant="lightGhost"
          >
            {/* <FiEdit /> */}
          </IconButton>
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
