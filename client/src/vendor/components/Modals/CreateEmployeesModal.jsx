import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "../../../shared/components/Button";
import { FormInput } from "../../../shared/components/Form";
import Loader from "../../../shared/components/LoadingSpinner";
import LoadingSlider from "../../../shared/components/LoadingSpinner";

const CreateEmployeesModal = ({ isOpen, onClose, onEmployeeCreated }) => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/employee/create-employee", form);
      toast.success("Employee created successfully!");
      onEmployeeCreated();
      onClose();
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
      });
    } catch (err) {
      toast.error("Failed to create employee");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    <LoadingSlider />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create Employee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="First Name"
            required
          />
          <FormInput
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            required
          />
          <FormInput
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            required
          />
          <FormInput
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone"
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="lightInherit"
              onClick={onClose}
              //   className="px-4 py-2 bg-gray-300 rounded"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              //   className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeesModal;
