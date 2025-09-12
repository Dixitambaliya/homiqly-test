import React, { useState } from "react";
import { toast } from "react-toastify";
import { FiSave, FiLock } from "react-icons/fi";
import { Card } from "../../../shared/components/Card";
import { Button } from "../../../shared/components/Button";
import { FormInput, FormSelect } from "../../../shared/components/Form";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const GeneralSettings = () => {
  const { currentUser } = useAdminAuth();
  const [generalSettings, setGeneralSettings] = useState({
    theme: "light",
    language: "en",
    notifications: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGeneralSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveGeneralSettings = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      toast.success("Settings saved successfully");
      setIsSubmitting(false);
    }, 1000);
  };

  const changePassword = (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

      {/* <Card title="General Settings" icon={<FiSave className="h-5 w-5" />}>
        <form onSubmit={saveGeneralSettings}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect
              label="Theme"
              name="theme"
              value={generalSettings.theme}
              onChange={handleGeneralChange}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System Default" },
              ]}
            />

            <FormSelect
              label="Language"
              name="language"
              value={generalSettings.language}
              onChange={handleGeneralChange}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "Hindi" },
                { value: "ta", label: "Tamil" },
              ]}
            />

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="notifications"
                  checked={generalSettings.notifications}
                  onChange={handleGeneralChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable email notifications
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Card> */}

      <Card title="Change Password" icon={<FiLock className="h-5 w-5" />}>
        <form onSubmit={changePassword}>
          <div className="space-y-4">
            <FormInput
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />

            <FormInput
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
            />

            <FormInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Account Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
            <p className="text-gray-900">{currentUser?.name || "Admin User"}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
            <p className="text-gray-900">
              {currentUser?.email || "admin@example.com"}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
            <p className="text-gray-900 capitalize">
              {currentUser?.role || "admin"}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Last Login
            </h4>
            <p className="text-gray-900">
              Today at {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GeneralSettings;
