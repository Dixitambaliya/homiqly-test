import React from "react";
import Modal from "../../../shared/components/Modal/Modal"; // adjust path if needed

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className="text-sm font-medium text-gray-900">{children}</p>
  </div>
);

const EmployeeDetailsModal = ({ employee, isOpen, onClose }) => {
  if (!isOpen || !employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      title="Employee Details"
    >
      <div className="">
        {/* Card container */}
        {/* Top area */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {employee.employee_name || "Employee"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                employee.is_active
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {employee.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-50">
              <Field label="Employee ID">{employee.employee_id ?? "N/A"}</Field>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-50">
              <Field label="Company">{employee.companyName ?? "N/A"}</Field>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-50 sm:col-span-2">
              <Field label="Phone">{employee.phone ?? "N/A"}</Field>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-50 sm:col-span-2">
              <Field label="Created At">
                {employee.created_at
                  ? new Date(employee.created_at).toLocaleString()
                  : "N/A"}
              </Field>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeDetailsModal;
