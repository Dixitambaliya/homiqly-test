import { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiEdit,
  FiSave,
  FiX,
} from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { Card } from "../../shared/components/Card";
import { Button } from "../../shared/components/Button";
import { FormInput, FormFileInput } from "../../shared/components/Form";
import { toast } from "react-toastify";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchEmployeeProfile();
  }, []);

  const fetchEmployeeProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/employee/getprofile");
      const data = res.data;
      setProfile(data);
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
      });
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files?.length > 0) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const data = new FormData();
      data.append("first_name", formData.first_name);
      data.append("last_name", formData.last_name);
      data.append("email", formData.email);
      data.append("phone", formData.phone);

      if (profileImage) {
        data.append("profile_image", profileImage);
      }

      await api.put("/api/employee/editprofile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Profile updated successfully");
      setEditing(false);
      fetchEmployeeProfile();
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-gray-500">Profile not available.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Employee Profile</h2>
        <Button
          onClick={() => setEditing((prev) => !prev)}
          variant={editing ? "outline" : "primary"}
          icon={
            editing ? <FiX className="mr-2" /> : <FiEdit className="mr-2" />
          }
        >
          {editing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-36 w-36 rounded-full overflow-hidden border border-gray-300">
                <img
                  src={
                    profileImage
                      ? URL.createObjectURL(profileImage)
                      : profile.profile_image ||
                        "https://via.placeholder.com/150?text=No+Image"
                  }
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              {editing && (
                <FormFileInput
                  name="profile_image"
                  accept="image/*"
                  onChange={handleImageChange}
                  showPreview={false}
                />
              )}
              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {formData.first_name} {formData.last_name}
                </h3>
                <p className="text-gray-500 text-sm">
                  Employee ID: {profile.employee_id}
                </p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiUser className="h-5 w-5 text-gray-400" />}
              />
              <FormInput
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiUser className="h-5 w-5 text-gray-400" />}
              />
              <FormInput
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiMail className="h-5 w-5 text-gray-400" />}
              />
              <FormInput
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiPhone className="h-5 w-5 text-gray-400" />}
              />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
                  <FiCalendar className="text-gray-400" />
                  Member Since
                </h4>
                <p className="text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  Status
                </h4>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    profile.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {profile.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
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
        </form>
      </Card>
    </div>
  );
};

export default Profile;
