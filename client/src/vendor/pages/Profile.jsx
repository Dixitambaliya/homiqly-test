import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiEdit,
  FiSave,
  FiX,
} from "react-icons/fi";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { Card } from "../../shared/components/Card";
import { Button } from "../../shared/components/Button";
import {
  FormInput,
  FormTextarea,
  FormFileInput,
} from "../../shared/components/Form";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

const Profile = () => {
  const { currentUser } = useVendorAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [certificates, setCertificates] = useState([{ name: "", file: null }]);
  const [services, setServices] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    companyAddress: "",
    contactPerson: "",
    googleBusinessProfileLink: "",
    otherInfo: "",
    birthDate: "",
  });

  useEffect(() => {
    fetchVendorProfile();
    fetchVendorService();
  }, []);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/vendor/getprofile");
      if (response.data?.profile) {
        const profileData = response.data.profile;
        setProfile(profileData);
        setCertificates(
          profileData.certificates?.map((cert) => ({
            name: cert.certificateName,
            file: cert.certificateFile,
          })) || [{ name: "", file: null }]
        );
        setFormData({
          name: profileData.name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
          companyAddress: profileData.companyAddress || "",
          contactPerson: profileData.contactPerson || "",
          googleBusinessProfileLink:
            profileData.googleBusinessProfileLink || "",
          otherInfo: profileData.otherInfo || "",
          birthDate: profileData.birthDate?.slice(0, 10) || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load profile data");
      console.error("Error fetching vendor profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorService = async () => {
    try {
      const response = await api.get("/api/vendor/getvendorservice");
      if (response.data?.result) {
        setServices(response.data.result);
      }
    } catch (error) {
      console.error("Error fetching vendor services:", error);
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

      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });

      if (profileImage) {
        data.append("profileImageVendor", profileImage);
      }

      certificates.forEach((cert, index) => {
        if (cert.name)
          data.append(`certificates[${index}][certificateName]`, cert.name);
        if (cert.file instanceof File) {
          data.append(`certificates[${index}][certificateFile]`, cert.file);
        }
      });

      const response = await api.put("/api/vendor/updateprofile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        toast.success("Profile updated successfully");
        setEditing(false);
        fetchVendorProfile();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const toggleEdit = () => {
    setEditing(!editing);
  };

  const handleCertificateChange = (index, field, value) => {
    const updated = [...certificates];
    updated[index][field] = value;
    setCertificates(updated);
  };

  const addCertificate = () => {
    setCertificates([...certificates, { name: "", file: null }]);
  };

  const removeCertificate = (index) => {
    const updated = certificates.filter((_, i) => i !== index);
    setCertificates(updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendor Profile</h1>
          <p className="text-sm text-gray-500">
            View or update your account information
          </p>
        </div>
        <Button
          onClick={toggleEdit}
          variant={editing ? "outline" : "primary"}
          icon={
            editing ? <FiX className="mr-2" /> : <FiEdit className="mr-2" />
          }
        >
          {editing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      <div>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Left Profile Info */}
          <div className="col-span-1 bg-white rounded-xl p-6 shadow border">
            <div className="flex flex-col items-center space-y-4  justify-between">
              {/* Profile Image */}
              <div className="w-32 h-32 rounded-full overflow-hidden border">
                <img
                  src={
                    profileImage
                      ? URL.createObjectURL(profileImage)
                      : profile?.profileImage ||
                        "https://via.placeholder.com/150"
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Image Upload */}
              {editing && (
                <FormFileInput
                  name="profileImageVendor"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              )}

              {/* Name and Type */}
              {/* <div className="text-center">
                <h3 className="text-lg font-semibold">{profile?.name}</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {profile?.vendorType}
                </p>
              </div> */}

              {/* Account Info */}
              <div className="w-full space-y-3 text-center">
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">
                    Account Type
                  </h4>
                  <p className="text-gray-800 capitalize">
                    {profile?.vendorType}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500 font-medium">
                    Member Since
                  </h4>
                  <p className="text-gray-800">
                    {new Date(profile?.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Form Inputs */}
          <div className="col-span-2 bg-white rounded-xl p-6 shadow border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiUser />}
              />
              <FormInput
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiMail />}
              />
              <FormInput
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiPhone />}
              />
              <FormInput
                label="Date of Birth"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleInputChange}
                disabled={!editing}
                icon={<FiUser />}
              />

              {profile?.vendorType === "company" && (
                <>
                  <FormInput
                    label="Contact Person"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    disabled={!editing}
                    icon={<FiUser />}
                  />
                  <FormInput
                    label="Google Business Profile"
                    name="googleBusinessProfileLink"
                    value={formData.googleBusinessProfileLink}
                    onChange={handleInputChange}
                    disabled={!editing}
                  />
                  <div className="col-span-2">
                    <FormTextarea
                      label="Company Address"
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleInputChange}
                      disabled={!editing}
                      rows={2}
                    />
                  </div>
                </>
              )}

              {profile?.vendorType === "individual" && (
                <>
                  <div className="col-span-2">
                    <FormTextarea
                      label="Other Info"
                      name="otherInfo"
                      value={formData.otherInfo}
                      onChange={handleInputChange}
                      disabled={!editing}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormTextarea
                      label="Address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!editing}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>

            {editing && (
              <div className="flex justify-end mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updating}
                  icon={<FiSave className="mr-2" />}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Services */}
      <Card title="Services Offered">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-6"
            >
              {/* Header */}
              {service.package_name && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {service.package_name}
                </h3>
              )}

              {/* Content grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  {service.source && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Source:</span>{" "}
                      {service.source}
                    </p>
                  )}

                  {service.service_type_name && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Service Type Name:</span>{" "}
                      {service.service_type_name}
                    </p>
                  )}

                  {service.service_name && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Service Name:</span>{" "}
                      {service.service_name}
                    </p>
                  )}
                  {service.service_description && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Service Description:</span>{" "}
                      {service.service_description}
                    </p>
                  )}
                  {service.service_categories && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Service Sub Categories:</span>{" "}
                      {service.service_categories}
                    </p>
                  )}

                  {service.service_category_name && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">
                        Service Category Name:
                      </span>{" "}
                      {service.service_category_name}
                    </p>
                  )}
                </div>

                {/* Media Section */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {service.package_media && (
                    <div>
                      <img
                        src={service.package_media}
                        alt="package media"
                        className="w-full h-24 object-cover rounded-xl border"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Package Media
                      </p>
                    </div>
                  )}
                  {service.service_type_media && (
                    <div>
                      <img
                        src={service.service_type_media}
                        alt="service type media"
                        className="w-full h-24 object-cover rounded-xl border"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Service Type Media
                      </p>
                    </div>
                  )}
                  {service.service_media && (
                    <div>
                      <img
                        src={service.service_media}
                        alt="service media"
                        className="w-full h-24 object-cover rounded-xl border"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Service Media
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Profile;
