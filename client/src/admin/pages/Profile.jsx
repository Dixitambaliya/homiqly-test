import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { Card } from "../../shared/components/Card";
import { Button } from "../../shared/components/Button";
import { FormInput, FormTextarea } from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { Edit, Lock, Mail, Save, User, X, Shield, Camera } from "lucide-react";

const Profile = () => {
  const { currentUser } = useAdminAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      // Revert changes if cancelling
      setFormData({ name: profile?.name || "", email: profile?.email || "" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    setEditing((prev) => !prev);
  };

  const changePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsChangingPassword(true);

    try {
      const payload = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      };

      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );

      const res = await axios.patch("/api/admin/changepassword", payload, {
        headers: getHeaders(),
      });

      toast.success(res?.data?.message || "Password changed successfully");

      setPasswordData({
        currentPassword: "",
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

  const avatarLetter =
    (profile?.name || profile?.email || "").trim().charAt(0).toUpperCase() ||
    "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="y-8  bg-gray-50">
      <div className="max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="p-6 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 space-x-4 md:mb-0">
              <div className="relative">
                <div className="flex items-center justify-center w-20 h-20 text-5xl font-bold text-white bg-gray-600 rounded-2xl">
                  {avatarLetter}
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.name || "Admin User"}
                </h1>
                <p className="flex items-center text-gray-500">
                  <Mail className="w-4 h-4 mr-1" />
                  {profile?.email}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {!editing ? (
                <Button
                  onClick={toggleEdit}
                  icon={<Edit className="w-4 h-4" />}
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  onClick={toggleEdit}
                  variant="ghost"
                  icon={<X className="w-4 h-4" />}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Mode - Show Both Sections */}
        {editing ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Profile Information Card */}
            <Card className="lg:col-span-2">
              <div className="flex items-center pb-4 mb-6 space-x-2 border-b border-gray-100">
                <User className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Profile Information
                </h2>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormInput
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      icon={<User className="w-5 h-5 text-gray-400" />}
                      required
                    />

                    <FormInput
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      icon={<Mail className="w-5 h-5 text-gray-400" />}
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button
                      type="submit"
                      disabled={updating}
                      isLoading={updating}
                      icon={<Save className="w-4 h-4" />}
                    >
                      Update Profile
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {/* Change Password Card */}
            <Card className="lg:col-span-2">
              <div className="flex items-center pb-4 mb-6 space-x-2 border-b border-gray-100">
                <Lock className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Change Password
                </h2>
              </div>

              <form onSubmit={changePassword}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      isLoading={isChangingPassword}
                      icon={<Save className="w-4 h-4" />}
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        ) : (
          /* View Mode - Read Only Information */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Profile Details Card */}
            <Card>
              <div className="flex items-center pb-4 mb-6 space-x-2 border-b border-gray-100">
                <User className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Profile Details
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center p-3 space-x-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">{profile?.name}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 space-x-3 bg-gray-50 rounded-xl">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium text-gray-900">{profile?.email}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Card */}
            <Card>
              <div className="flex items-center pb-4 mb-6 space-x-2 border-b border-gray-100">
                <Lock className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Security
                </h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                      <Lock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Password</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;