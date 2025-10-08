// components/Modals/EditEmployeesModal.jsx
import { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig";
import { Button } from "../../../shared/components/Button";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import { FormInput } from "../../../shared/components/Form";

const EditEmployeesModal = ({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated,
}) => {
  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debugging: shows what prop we received
  // console.log("Editing employee prop:", employee);

  // Populate form when modal opens or employee changes
  useEffect(() => {
    if (isOpen && employee) {
      setFormData({
        employee_id: employee.employee_id ?? employee.id ?? "",
        first_name: employee.first_name ?? employee.employee_name ?? "",
        last_name: employee.last_name ?? "",
        phone: employee.phone ?? "",
        email: employee.email ?? "",
      });
    } else if (!isOpen) {
      // reset when modal closed
      setFormData({
        employee_id: "",
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
      });
      setIsSubmitting(false);
    }
  }, [isOpen, employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get id from the most reliable source available
    const id = formData.employee_id || employee?.employee_id || employee?.id;
    if (!id) {
      console.error("No employee ID to update");
      alert("No employee selected for update.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("first_name", formData.first_name ?? "");
      payload.append("last_name", formData.last_name ?? "");
      payload.append("phone", formData.phone ?? "");
      payload.append("email", formData.email ?? "");
      payload.append("password", formData.password ?? "");

      await api.put(`/api/vendor/employee/${id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (typeof onEmployeeUpdated === "function") onEmployeeUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to update employee", err);
      alert("Failed to update employee. See console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Edit Employee</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormInput
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First Name"
              required
              label={`First name`}
            />
          </div>

          <div>
            <FormInput
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last Name"
              required
              label={`Last name`}
            />
          </div>

          <div>
            <FormInput
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone"
              label={`Phone`}
            />
          </div>

          <div>
            <FormInput
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              label={`Email`}
            />
          </div>
          <div>
            <FormInput
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="******"
              label={`Password`}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="light"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeesModal;
