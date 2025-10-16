import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiUser, FiMail, FiEdit, FiSave, FiX, FiLock } from "react-icons/fi";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { Card } from "../../shared/components/Card";
import { Button } from "../../shared/components/Button";
import { FormInput, FormTextarea } from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

const Profile = () => {
  const { currentUser } = useAdminAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);

  // only name & email (as per your API)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  // Change password state (moved from GeneralSettings)
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Helper: build headers (include token if available)
  const getHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (currentUser?.token)
      headers.Authorization = `Bearer ${currentUser.token}`;
    return headers;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/admin/getprofile", {
          headers: getHeaders(),
        });

        const adminItem =
          res?.data?.admin && res.data.admin.length ? res.data.admin[0] : null;

        if (!adminItem) {
          toast.error("Profile not found");
          setLoading(false);
          return;
        }

        const profileData = {
          name: adminItem.name || "",
          email: adminItem.email || "",
          admin_id: adminItem.admin_id,
          created_at: adminItem.created_at,
        };

        setProfile(profileData);
        setFormData({ name: profileData.name, email: profileData.email });
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      email: formData.email,
    };

    try {
      setUpdating(true);
      const res = await axios.patch("/api/admin/editprofile", payload, {
        headers: getHeaders(),
      });

      if (res.status >= 200 && res.status < 300) {
        setProfile((prev) => ({ ...prev, ...payload }));
        toast.success(res.data?.message || "Profile updated successfully");
        setEditing(false);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      const message =
        err?.response?.data?.message || "Failed to update profile";
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const toggleEdit = () => {
    if (editing) {
      // revert changes if cancelling
      setFormData({ name: profile?.name || "", email: profile?.email || "" });
    }
    setEditing((prev) => !prev);
  };

  // Change password handler (integrated from GeneralSettings)
  const changePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      const payload = {
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      };

      // remove undefined keys
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );

      const res = await axios.patch("/api/admin/changepassword", payload, {
        headers: getHeaders(),
      });

      toast.success(res?.data?.message || "Password changed successfully");

      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Change password error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Avatar: first letter of name or email (uppercase)
  const avatarLetter =
    (profile?.name || profile?.email || "").trim().charAt(0).toUpperCase() ||
    "?";

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Admin Profile</h2>
        {!editing ? (
          <Button
            onClick={toggleEdit}
            variant="primary"
            icon={<FiEdit className="mr-2" />}
          >
            Edit Profile
          </Button>
        ) : (
          <Button
            onClick={toggleEdit}
            variant="outline"
            icon={<FiX className="mr-2" />}
          >
            Cancel
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Section (non-editable initial) */}
            <div className="flex flex-col items-center space-y-4">
              <div
                className="h-40 w-40 rounded-full flex items-center justify-center text-4xl font-semibold border-2 border-primary bg-gray-100 text-gray-700"
                title={profile?.name || profile?.email}
                aria-hidden="true"
              >
                {avatarLetter}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {profile?.name || "Admin User"}
                </h3>
                <p className="text-gray-500 capitalize">
                  {currentUser?.role || "admin"}
                </p>
              </div>
              <p className="text-xs text-gray-400">
                Profile picture is fixed (initial shown)
              </p>
            </div>

            {/* Profile Details Section - only name & email (per API) */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiUser className="h-5 w-5 text-gray-400" />}
                />

                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiMail className="h-5 w-5 text-gray-400" />}
                />
              </div>

              {editing && (
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={updating}
                    isLoading={updating}
                    icon={<FiSave className="mr-2" />}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Change Password Card (moved here from GeneralSettings) */}
      <Card title="Change Password" icon={<FiLock className="h-5 w-5" />}>
        <form onSubmit={changePassword}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isChangingPassword}
              isLoading={isChangingPassword}
              icon={<FiSave className="mr-2" />}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
