import { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { Card } from "../../shared/components/Card";
import { Button, IconButton } from "../../shared/components/Button";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import ProfileEditModal from "../../vendor/components/Modals/ProfileEditModal";
import { 
  Edit, 
  User, 
  Trash,
  Calendar,
  Package,
  BadgeCheck,
} from "lucide-react";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState("auto");

  useEffect(() => {
    fetchVendorProfile();
    fetchVendorService();
  }, []);

  // Set consistent height when tab changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      setContentHeight("auto");
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/vendor/getprofile");
      if (response.data?.profile) {
        const profileData = response.data.profile;
        setProfile(profileData);
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

  const deleteVendorService = async (vendor_packages_id) => {
    if (
      vendor_packages_id === undefined ||
      vendor_packages_id === null ||
      vendor_packages_id === ""
    ) {
      console.warn(
        "deleteVendorService called with invalid vendor_packages_id:",
        vendor_packages_id
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this service? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await api.delete(
        `/api/vendor/removepackage/${vendor_packages_id}`
      );

      console.log("delete service response:", response);

      if (response?.status === 200) {
        toast.success(response.data?.message || "Service deleted successfully");
        fetchVendorService();
      } else {
        toast.error(response.data?.message || "Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting vendor service:", error);
      const serverMsg = error?.response?.data?.message;
      if (serverMsg) {
        toast.error(serverMsg);
      } else {
        toast.error("Failed to delete service");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    setIsEditModalOpen(false);
    fetchVendorProfile();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50/30">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Navigation Tabs with Edit Button */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-7xl"> {/* Increased to match service section */}
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  {/* Tabs */}
                  <nav className="flex -mb-px space-x-8">
                    <button
                      onClick={() => setActiveTab("profile")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                        activeTab === "profile"
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <User className="inline w-4 h-4 mr-2" />
                      Profile Information
                    </button>
                    <button
                      onClick={() => setActiveTab("services")}
                      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                        activeTab === "services"
                          ? "border-green-500 text-green-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Package className="inline w-4 h-4 mr-2" />
                      Services Offered
                    </button>
                  </nav>

                  {/* Edit Button */}
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={() => setIsEditModalOpen(true)}
                      variant="primary"
                      size="sm"
                      icon={<Edit className="w-4 h-4" />}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area with Consistent Width */}
          <div className="flex justify-center">
            <div className="w-full max-w-7xl"> {/* Consistent max-width */}
              
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="transition-all duration-300 ease-in-out">
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Left Sidebar - Profile Overview */}
                    <div className="lg:col-span-1">
                      <Card className="border-0 shadow-lg">
                        <div className="p-6 text-center">
                          {/* Profile Image */}
                          <div className="relative inline-block">
                            <div className="w-32 h-32 mx-auto overflow-hidden border-4 border-white shadow-lg rounded-2xl">
                              <img
                                src={profile?.profileImage}
                                alt="Profile"
                                className="object-cover w-full h-full"
                              />
                            </div>
                          </div>

                          {/* Profile Info */}
                          <div className="mt-6">
                            <h2 className="text-xl font-bold text-gray-900">
                              {profile?.name}
                            </h2>
                            <div className="inline-flex items-center px-3 py-1 mt-2 text-sm font-medium text-green-800 capitalize bg-green-100 rounded-full">
                              <BadgeCheck className="w-4 h-4 mr-1" />
                              {profile?.vendorType} Vendor
                            </div>
                          </div>
                          {/* Member Since */}
                          <div className="p-4 mt-6 border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                            <Calendar className="w-5 h-5 mx-auto mb-2 text-green-600" />
                            <div className="text-sm font-medium text-gray-900">
                              Member Since
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(profile?.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Right Content - Profile Details */}
                    <div className="lg:col-span-2">
                      <Card className="border-0 shadow-lg">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center">
                              <User className="w-6 h-6 mr-2 text-gray-700" />
                              <h3 className="text-lg font-semibold text-gray-900">
                                Personal Information
                              </h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Personal Info */}
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Full Name</label>
                              <p className="text-gray-900">{profile?.name || "Not provided"}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Email Address</label>
                              <p className="text-gray-900">{profile?.email || "Not provided"}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Phone Number</label>
                              <p className="text-gray-900">{profile?.phone || "Not provided"}</p>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                              <p className="text-gray-900">
                                {profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString() : "Not provided"}
                              </p>
                            </div>

                            {/* Company Specific Fields */}
                            {profile?.vendorType === "company" && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-500">Contact Person</label>
                                  <p className="text-gray-900">{profile?.contactPerson || "Not provided"}</p>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-500">Google Business Profile</label>
                                  <p className="text-gray-900 truncate">
                                    {profile?.googleBusinessProfileLink ? (
                                      <a href={profile.googleBusinessProfileLink} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
                                        {profile.googleBusinessProfileLink}
                                      </a>
                                    ) : "Not provided"}
                                  </p>
                                </div>
                                
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-sm font-medium text-gray-500">Company Address</label>
                                  <p className="text-gray-900">{profile?.companyAddress || "Not provided"}</p>
                                </div>
                              </>
                            )}

                            {/* Individual Specific Fields */}
                            {profile?.vendorType === "individual" && (
                              <>
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-sm font-medium text-gray-500">Address</label>
                                  <p className="text-gray-900">{profile?.address || "Not provided"}</p>
                                </div>
                                
                                <div className="space-y-1 md:col-span-2">
                                  <label className="text-sm font-medium text-gray-500">Additional Information</label>
                                  <p className="text-gray-900">{profile?.otherInfo || "Not provided"}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div className="transition-all duration-300 ease-in-out">
                  <Card className="border-0 shadow-lg">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <Package className="w-6 h-6 mr-2 text-gray-700" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            Services Offered
                          </h3>
                        </div>
                      </div>

                      {services.length === 0 ? (
                        <div className="py-12 text-center">
                          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h4 className="mb-2 text-lg font-medium text-gray-900">
                            No Services Yet
                          </h4>
                          <p className="mb-6 text-gray-600">
                            You haven't added any services to your profile.
                          </p>
                          <Button variant="primary" className="text-white bg-green-600 border-green-600 hover:bg-green-700">
                            Add Your First Service
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                          {services.map((service, idx) => (
                            <div
                              key={idx}
                              className="overflow-hidden transition-all duration-300 bg-white border border-gray-200 group rounded-2xl"
                            >
                              {/* Service Header */}
                              <div className="relative">
                                {service.package_media && (
                                  <div className="h-48 overflow-hidden">
                                    <img
                                      src={service.package_media}
                                      alt={service.package_name || "Service image"}
                                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </div>
                                )}
                                <div className="absolute top-4 right-4">
                                  <IconButton
                                    onClick={() =>
                                      deleteVendorService(service.vendor_packages_id)
                                    }
                                    variant="lightDanger"
                                    size="sm"
                                    icon={<Trash className="w-4 h-4" />}
                                    className="transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                                  />
                                </div>
                              </div>

                              {/* Service Content */}
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    {service.package_name && (
                                      <h4 className="mb-1 text-xl font-semibold text-gray-900">
                                        {service.package_name}
                                      </h4>
                                    )}
                                    {service.package_id != null && (
                                      <p className="text-sm text-gray-500">
                                        Package ID: {service.package_id}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Sub-packages */}
                                {Array.isArray(service.sub_packages) &&
                                  service.sub_packages.length > 0 && (
                                    <div className="mt-4">
                                      <div className="space-y-3">
                                        {service.sub_packages.map((sub, sIdx) => (
                                          <div
                                            key={sIdx}
                                            className="flex items-start gap-3 p-3 transition-colors duration-200 rounded-lg bg-gray-50 hover:bg-green-50"
                                          >
                                            {sub.sub_package_media && (
                                              <div className="flex-shrink-0 w-16 h-16 overflow-hidden border rounded-lg">
                                                <img
                                                  src={sub.sub_package_media}
                                                  alt={sub.sub_package_name || "Sub-package"}
                                                  className="object-cover w-full h-full"
                                                />
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              {sub.sub_package_name && (
                                                <h6 className="text-sm font-medium text-gray-900">
                                                  {sub.sub_package_name}
                                                </h6>
                                              )}
                                              {sub.sub_package_description && (
                                                <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                                                  {sub.sub_package_description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
    </>
  );
};

export default Profile;