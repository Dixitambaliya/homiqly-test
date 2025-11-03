import React, { useState, useCallback } from "react";
import DataTable from "../../../shared/components/Table/DataTable";
import StatusBadge from "../../../shared/components/StatusBadge";
import api from "../../../lib/axiosConfig";
import { IconButton, Button } from "../../../shared/components/Button";
import { Pencil, Trash } from "lucide-react";

/**
 * EmployeesTable
 *
 * Replaces window.confirm(...) with a modern modal popup for delete confirmation.
 */
const EmployeesTable = ({ employees, isLoading, onDelete, onEdit }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = useCallback((employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deleting) return; // prevent closing while deleting
    setShowDeleteModal(false);
    setEmployeeToDelete(null);
  }, [deleting]);

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      setDeleting(true);
      await api.delete("/api/employee/remove-employee", {
        data: { employee_id: employeeToDelete.employee_id },
      });
      // refresh parent
      onDelete?.();
      // close modal
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Failed to delete employee:", error);
      // keep UX simple — you can replace with toast if available
      alert("Error deleting employee. Please try again.");
    } finally {
      setDeleting(false);
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
            onClick={() => openDeleteModal(row)}
            title="Delete employee"
            icon={<Trash className="h-4 w-4" />}
            variant="lightDanger"
          />
          <IconButton
            className="text-blue-600 hover:text-blue-800 p-1"
            onClick={() => onEdit(row)}
            title="Edit employee"
            icon={<Pencil className="h-4 w-4" />}
            variant="lightGhost"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        emptyMessage="No employees found."
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-employee-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-lg mx-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6">
                <h3
                  id="delete-employee-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  Delete employee
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {employeeToDelete?.first_name} {employeeToDelete?.last_name}
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={closeDeleteModal}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="error"
                    onClick={confirmDelete}
                    isLoading={deleting}
                    className="inline-flex items-center"
                  >
                    <Trash className="mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeesTable;
