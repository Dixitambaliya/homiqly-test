import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiSend } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import Select from "react-select";
import Button from "../../shared/components/Button/Button";
import { FormInput, FormSelect, FormTextarea } from "../../shared/components/Form";

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userList, setUserList] = useState([]);

  const [formData, setFormData] = useState({
    user_type: "",
    vendor_type: "",
    target_type: "all",
    user_ids: [],
    title: "",
    body: "",
    data: {},
    channel: "notification",
  });

  // Load users/vendors/employees based on user_type
  useEffect(() => {
    const fetchRecipients = async () => {
      if (formData.target_type !== "specific" || !formData.user_type) return;

      setLoading(true);
      try {
        let response;
        let users = [];

        switch (formData.user_type) {
          case "users":
            response = await axios.get("/api/notification/getuserslist");
            users = (response.data.users || []).map((user) => ({
              value: user.user_id.toString(),
              label: user.fullName || `User ${user.user_id}`,
            }));
            break;

          case "vendor":
            if (!formData.vendor_type) {
              toast.warn("Please select a Vendor Type first.");
              setLoading(false);
              return;
            }
            response = await axios.get(
              `/api/notification/getvendorslist?vendor_type=${formData.vendor_type}`
            );
            users = (response.data.vendors || []).map((vendor) => ({
              value: vendor.vendor_id.toString(),
              label: vendor.vendorName || `Vendor ${vendor.vendor_id}`,
            }));
            break;

          case "employees":
            response = await axios.get("/api/notification/getemployees");
            users = (response.data.employees || []).map((emp) => ({
              value: emp.employee_id.toString(),
              label: emp.fullName || `Employee ${emp.employee_id}`,
            }));
            break;

          case "admin":
            response = await axios.get("/api/notification/getadminslist");
            users = (response.data.admins || []).map((admin) => ({
              value: admin.admin_id.toString(),
              label: admin.name || `Admin ${admin.admin_id}`,
            }));
            break;

          default:
            users = [];
        }

        setUserList(users);
      } catch (error) {
        console.error("Error loading recipient list", error);
        toast.error("Failed to load recipients");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipients();
  }, [formData.user_type, formData.vendor_type, formData.target_type]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.user_type || !formData.title || !formData.body) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      user_type: formData.user_type,
      title: formData.title,
      body: formData.body,
      data: formData.data,
      channel: formData.channel,
    };

    if (formData.user_type === "vendor") {
      payload.vendor_type = formData.vendor_type;
    }

    if (formData.target_type === "specific") {
      payload.user_ids = formData.user_ids;
    }

    try {
      setSubmitting(true);
      const response = await axios.post("/api/notification/send", payload);
      if (response.status === 200) {
        toast.success(
          `Notification sent to ${response.data.success_count} recipients`
        );
        resetForm();
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error(
        error.response?.data?.message || "Failed to send notification"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      user_type: "",
      vendor_type: "",
      target_type: "all",
      user_ids: [],
      title: "",
      body: "",
      data: {},
      channel: "notification",
    });
    setUserList([]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Send Notifications
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Compose Notification
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient Type */}
            <FormSelect
              label="Recipient Type*"
              name="user_type"
              value={formData.user_type}
              onChange={handleInputChange}
              required
              options={[
                { value: "", label: "Select Recipient Type" },
                { value: "users", label: "Users" },
                { value: "vendor", label: "Vendors" },
                { value: "employees", label: "Employees" },
                { value: "admin", label: "Admins" },
              ]}
            />

            {/* Vendor Type */}
            {formData.user_type === "vendor" && (
              <FormSelect
                label="Vendor Type*"
                name="vendor_type"
                value={formData.vendor_type}
                onChange={handleInputChange}
                required
                options={[
                  { value: "", label: "Select Vendor Type" },
                  { value: "individual", label: "Individual" },
                  { value: "company", label: "Company" },
                ]}
              />
            )}

            {/* Target Type */}
            <FormSelect
              label="Target*"
              name="target_type"
              value={formData.target_type}
              onChange={handleInputChange}
              options={[
                { value: "all", label: "All" },
                { value: "specific", label: "Specific" },
              ]}
            />

            {/* Multi Select for Specific Users */}
            {formData.target_type === "specific" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Recipients*
                </label>
                <Select
                  isMulti
                  options={userList}
                  value={userList.filter((user) =>
                    formData.user_ids.includes(user.value)
                  )}
                  onChange={(selectedOptions) => {
                    const ids = selectedOptions.map((option) => option.value);
                    setFormData((prev) => ({
                      ...prev,
                      user_ids: ids,
                    }));
                  }}
                  isLoading={loading}
                  placeholder="Search & select recipients"
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            )}

            {/* Channel dropdown */}
            <FormSelect
              label="Channel*"
              name="channel"
              value={formData.channel}
              onChange={handleInputChange}
              options={[
                { value: "notification", label: "Notification" },
                { value: "mail", label: "Mail" },
              ]}
            />

            {/* Title */}
            <FormInput
              label="Notification Title*"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Enter title..."
            />

            {/* Body */}
            <FormTextarea
              label="Notification Message*"
              name="body"
              value={formData.body}
              onChange={handleInputChange}
              rows={4}
              required
              placeholder="Write your message here..."
            />

            {/* Submit Button */}
            <div className="flex justify-end pt-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="ml-2">Sending...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right: Guidelines */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Notification Guidelines
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Keep messages concise and clear</li>
            <li>Only use notifications for important updates</li>
            <li>Avoid sending too frequently</li>
            <li>
              When targeting specific users, the recipient list is fetched from
              the backend automatically.
            </li>
            <li>
              Vendor type (individual/company) is required only when sending to
              vendors.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
