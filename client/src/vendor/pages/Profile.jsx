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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Vendor Profile</h2>
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

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Image Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="h-40 w-40 rounded-full overflow-hidden border-2 border-primary">
                <img
                  src={
                    profile?.profileImage ||
                    "https://via.placeholder.com/150?text=No+Image"
                  }
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              {editing && (
                <FormFileInput
                  name="profileImageVendor"
                  accept="image/*"
                  onChange={handleImageChange}
                  showPreview={false}
                  className="mt-2"
                />
              )}
              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {profile?.name || "Vendor Name"}
                </h3>
                <p className="text-gray-500 capitalize">
                  {profile?.vendorType || "Vendor"}
                </p>
              </div>
            </div>

            {/* Details Section */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label={
                    profile?.vendorType === "company"
                      ? "Company Name"
                      : "Full Name"
                  }
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

                <FormInput
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiPhone className="h-5 w-5 text-gray-400" />}
                />

                <FormInput
                  label="Date of Birth"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiUser className="h-5 w-5 text-gray-400" />}
                />

                {/* <FormInput
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiMapPin className="h-5 w-5 text-gray-400" />}
                /> */}

                {!editing && certificates?.length > 0 && (
                  <div className="md:col-span-2 space-y-2 mt-4">
                    <h4 className="text-md font-semibold text-gray-700 mb-2">
                      Certificates
                    </h4>
                    {certificates.map((cert, index) =>
                      cert.name && cert.file ? (
                        <div
                          key={index}
                          className="flex items-center justify-between border p-3 rounded-md bg-gray-50"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {cert.name}
                          </span>
                          <a
                            href={cert.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View File
                          </a>
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {editing && (
                  <div className="space-y-4 border-t pt-6 mt-6">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Certificates
                    </h4>

                    {certificates.map((cert, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
                      >
                        <FormInput
                          label="Certificate Name"
                          name={`certificateName_${index}`}
                          value={cert.name}
                          onChange={(e) =>
                            handleCertificateChange(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                        />
                        <FormFileInput
                          name={`certificateFile_${index}`}
                          accept="application/pdf,image/*"
                          onChange={(e) =>
                            handleCertificateChange(
                              index,
                              "file",
                              e.target.files[0]
                            )
                          }
                        />
                        {typeof cert.file === "string" && (
                          <a
                            href={cert.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View Existing File
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeCertificate(index)}
                          className="text-red-500"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCertificate}
                    >
                      Add Certificate
                    </Button>
                  </div>
                )}

                {profile?.vendorType === "company" && (
                  <>
                    <FormInput
                      label="Contact Person"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      disabled={!editing}
                      icon={<FiUser className="h-5 w-5 text-gray-400" />}
                    />
                    <div className="md:col-span-2">
                      <FormTextarea
                        label="Company Address"
                        name="companyAddress"
                        value={formData.companyAddress}
                        onChange={handleInputChange}
                        disabled={!editing}
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormInput
                        label="Google Business Profile Link"
                        name="googleBusinessProfileLink"
                        type="url"
                        value={formData.googleBusinessProfileLink}
                        onChange={handleInputChange}
                        disabled={!editing}
                      />
                    </div>
                  </>
                )}

                {profile?.vendorType === "individual" && (
                  <>
                    <FormTextarea
                      label="Other Information"
                      name="otherInfo"
                      value={formData.otherInfo}
                      onChange={handleInputChange}
                      disabled={!editing}
                      rows={3}
                    />
                    <FormTextarea
                      label="Address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      disabled={!editing}
                      rows={3}
                      icon={<FiMapPin className="h-5 w-5 text-gray-400" />}
                    />
                  </>
                )}
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

      <Card title="Account Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Account Type
            </h4>
            <p className="text-gray-900 capitalize">
              {profile?.vendorType || "Vendor"}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Account Status
            </h4>
            <p>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Member Since
            </h4>
            <p className="text-gray-800">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not available"}
            </p>
          </div>
          {profile?.vendorType === "individual" && profile?.resume && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Resume</h4>
              <a
                href={profile.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-dark"
              >
                View Resume
              </a>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Services Offered">
          <div className="space-y-6">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 shadow-sm bg-white"
              >
                <h2 className="text-xl font-semibold text-primary mb-1">
                  {service.service_type_name}
                </h2>
                <p className="text-gray-500 mb-2">
                  {service.service_category_name} / {service.service_name}
                </p>

                {/* Packages */}
                {service.packages?.map((pkg, pIdx) => (
                  <div
                    key={pIdx}
                    className="border rounded-md p-3 my-4 bg-gray-50"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={pkg.package_media}
                        alt={pkg.title}
                        className="w-32 h-24 object-cover rounded"
                      />
                      <div>
                        <h3 className="text-lg font-medium text-gray-800">
                          {pkg.title}
                        </h3>
                        <p className="text-gray-600">{pkg.description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          ₹ {pkg.price} • {pkg.time_required}
                        </p>
                      </div>
                    </div>

                    {/* Preferences */}
                    {pkg.preferences?.length > 0 && (
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Preferences:</strong>{" "}
                        {pkg.preferences.map((pref, pi) => (
                          <span
                            key={pi}
                            className="inline-block bg-gray-200 px-2 py-1 rounded text-xs mr-2"
                          >
                            {pref.preference_value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sub-packages */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                        Sub-Packages
                      </h4>
                      <div className="space-y-2">
                        {pkg.sub_packages?.map((sub, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-start gap-4 border p-2 rounded bg-white"
                          >
                            <img
                              src={sub.item_media}
                              alt={sub.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800">
                                {sub.title}
                              </p>
                              <p className="text-gray-600 text-sm">
                                {sub.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                ₹ {sub.price} • {sub.time_required}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
