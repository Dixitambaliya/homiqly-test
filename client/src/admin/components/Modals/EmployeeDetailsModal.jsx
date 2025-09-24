import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal"; // adjust path if needed
import { FormInput } from "../../../shared/components/Form";
import axios from "axios";
import { toast } from "react-toastify";

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className="text-sm font-medium text-gray-900">{children}</p>
  </div>
);

/**
 * Props:
 * - employee: object
 * - isOpen: boolean
 * - onClose: fn
 * - onUpdated?: fn(updatedEmployee)  // optional - parent can pass to update list in-place
 */
const EmployeeDetailsModal = ({ employee, isOpen, onClose, onUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // formData mirrors editable fields (first_name, last_name, phone, email)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });

  console.log(employee)

  // initialize form when employee or isOpen changes
  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        first_name: employee.first_name ?? employee.firstName ?? "",
        last_name: employee.last_name ?? employee.lastName ?? "",
        phone: employee.phone ?? "",
        email: employee.email ?? "",
      });
      setIsEditing(false);
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // revert to employee values
    setFormData({
      first_name: employee.first_name ?? employee.firstName ?? "",
      last_name: employee.last_name ?? employee.lastName ?? "",
      phone: employee.phone ?? "",
      email: employee.email ?? "",
    });
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("adminToken");
      // prefer employee.employee_id, fallback to employee.id
      const id = employee.employee_id ?? employee.id;
      // try endpoint used in your screenshots first (no hyphen), fallback if needed
      const endpoints = [
        `/api/admin/editemployees/${id}`,
        `/api/admin/edit-employees/${id}`,
      ];

      let resp = null;
      let lastErr = null;

      for (let ep of endpoints) {
        try {
          resp = await axios.put(
            ep,
            {
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone,
              email: formData.email,
            },
            {
              headers: {
                Authorization: token ? `Bearer ${token}` : undefined,
                "Content-Type": "application/json",
              },
            }
          );
          // if request succeeded, break
          if (resp && (resp.status === 200 || resp.status === 201)) break;
        } catch (err) {
          lastErr = err;
          // try next endpoint
        }
      }

      if (!resp || !(resp.status === 200 || resp.status === 201)) {
        console.error("Edit employee failed", lastErr);
        toast.error("Failed to update employee");
        setSaving(false);
        return;
      }

      // if backend returns the updated employee, use it; otherwise merge local changes
      const updatedEmployee =
        resp.data && resp.data.employee
          ? resp.data.employee
          : { ...employee, ...formData };

      toast.success(
        resp.data && resp.data.message
          ? resp.data.message
          : "Employee profile updated successfully"
      );

      setIsEditing(false);
      setSaving(false);

      // inform parent (optional)
      if (typeof onUpdated === "function") {
        onUpdated(updatedEmployee);
      }

      // keep modal open (you can close it if desired)
      // onClose(); // <-- uncomment if you want to auto-close after save
    } catch (err) {
      console.error("Error saving employee:", err);
      toast.error("Failed to update employee");
      setSaving(false);
    }
  };

  const statusBadge = employee.is_active
    ? "bg-green-50 text-green-700"
    : "bg-red-50 text-red-700";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      title="Employee Details"
    >
      <div className="">
        {/* Top area */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {employee.employee_name || employee.employee_name_full || "Employee"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
              {employee.is_active ? "Active" : "Inactive"}
            </span>

            {/* Edit / Save / Cancel buttons */}
            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  type="button"
                  className="px-3 py-1 rounded bg-gray-200 text-sm hover:bg-gray-300"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  type="button"
                  className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee ID - not editable */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-50">
                <Field label="Employee ID">{employee.employee_id ?? "N/A"}</Field>
              </div>

              {/* Company - not editable */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-50">
                <Field label="Company">{employee.companyName ?? "N/A"}</Field>
              </div>

              {/* Editable fields using your FormInput */}
              <div className="p-4 bg-white rounded-lg border border-gray-50 sm:col-span-2 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">First Name</p>
                  <FormInput
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="First name"
                    disabled={!isEditing}
                    className="w-full"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Last Name</p>
                  <FormInput
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Last name"
                    disabled={!isEditing}
                    className="w-full"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Phone</p>
                  <FormInput
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone"
                    disabled={!isEditing}
                    className="w-full"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Email</p>
                  <FormInput
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    disabled={!isEditing}
                    className="w-full"
                  />
                </div>
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
        </form>
      </div>
    </Modal>
  );
};

export default EmployeeDetailsModal;
