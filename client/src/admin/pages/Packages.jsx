import React, { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import EditPackageModal from "../components/Modals/EditPackageModal";
import LoadingSlider from "../../shared/components/LoadingSpinner";

const Packages = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchPackages = async () => {
    try {
      const response = await api.get("/api/admin/getpackages");

      console.log("Raw API response:", response.data); // 👈 check what you get

      // Ensure you're accessing the correct array
      const rawData = Array.isArray(response.data)
        ? response.data
        : response.data?.result || []; // adjust this based on structure

      const grouped = rawData.reduce((acc, item) => {
        const category = item.service_category_name;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});

      setGroupedPackages(grouped);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPackages();
  }, []);

  const handleDeletePackage = async (packageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this package?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/deletepackage/${packageId}`);
      fetchPackages(); // refresh after deletion
    } catch (error) {
      console.error("Error deleting package:", error);
    }
  };

  if (loading)
    return (
      <>
        <LoadingSlider />
      </>
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Packages</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          variant="primary"
          icon={<FiPlus className="mr-2" />}
        >
          Add Service Type
        </Button>
      </div>

      {loading ? (
        <div>
          <LoadingSlider />
        </div>
      ) : (
        Object.entries(groupedPackages).map(([categoryName, services]) => (
          <div key={categoryName} className="mb-10">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">
              {categoryName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.service_type_id}
                  className="rounded-2xl shadow-md bg-white overflow-hidden transition-all hover:shadow-lg border border-gray-100"
                >
                  <img
                    src={service.service_type_media}
                    alt={service.service_type_name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-5">
                    <h4 className="text-xl font-semibold text-gray-800">
                      {service.service_type_name}
                    </h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Service: {service.service_name}
                    </p>

                    {service.packages.map((pkg) => (
                      <div
                        key={pkg.package_id}
                        className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-xl"
                      >
                        <img
                          src={pkg.package_media}
                          alt={pkg.title}
                          className="w-full h-36 object-cover rounded-md mb-3"
                        />
                        <div className="flex justify-between items-center mb-1">
                          <h5 className="text-md font-bold text-gray-800">
                            {pkg.title}
                          </h5>
                          <p className="text-sm font-medium text-blue-700">
                            ₹{pkg.price}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {pkg.description}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Time: {pkg.time_required}
                        </p>

                        {/* Sub-Packages */}
                        {pkg.sub_packages?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold mb-1 text-gray-700">
                              Sub-packages:
                            </p>
                            <ul className="space-y-2">
                              {pkg.sub_packages.map((sub) => (
                                <li
                                  key={sub.sub_package_id}
                                  className="flex gap-3"
                                >
                                  <img
                                    src={sub.item_media}
                                    alt={sub.title}
                                    className="w-12 h-12 object-cover rounded-lg border"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      {sub.item_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ₹{sub.price} | {sub.time_required}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Preferences */}
                        {pkg.preferences?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700">
                              Preferences:
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {pkg.preferences.map((pref) => (
                                <span
                                  key={pref.preference_id}
                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                                >
                                  {pref.preference_value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Edit Button */}
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPackage(pkg);
                              setShowEditModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            color="red"
                            onClick={() => handleDeletePackage(pkg.package_id)}
                            icon={<FiTrash2 />}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <AddServiceTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        refresh={fetchPackages}
      />

      <EditPackageModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPackage(null);
        }}
        refresh={fetchPackages}
        packageData={selectedPackage}
      />
    </div>
  );
};

export default Packages;
