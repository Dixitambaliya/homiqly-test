import React, { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { FiPlus } from "react-icons/fi";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import axios from "axios";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

const Packages = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await axios.get("/api/admin/getpackages");

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

    fetchPackages();
  }, []);

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
          <LoadingSpinner />
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
                  className="border rounded-xl shadow-sm overflow-hidden"
                >
                  <img
                    src={service.service_type_media}
                    alt={service.service_type_name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h4 className="text-lg font-bold mb-2">
                      {service.service_type_name}
                    </h4>
                    <p className="text-sm text-gray-500 mb-2">
                      Service: {service.service_name}
                    </p>
                    {service.packages.map((pkg) => (
                      <div key={pkg.package_id} className="mt-4 border-t pt-4">
                        <img
                          src={pkg.package_media}
                          alt={pkg.title}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                        <h5 className="text-md font-semibold">{pkg.title}</h5>
                        <p className="text-sm text-gray-600 mb-1">
                          {pkg.description}
                        </p>
                        <p className="text-sm text-gray-700">
                          Price: ₹{pkg.price} | Time: {pkg.time_required}
                        </p>

                        {/* Sub-Packages */}
                        {pkg.sub_packages.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-semibold">
                              Sub-packages:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                              {pkg.sub_packages.map((sub) => (
                                <li key={sub.sub_package_id}>
                                  <div className="flex items-start gap-2 mt-1">
                                    <img
                                      src={sub.item_media}
                                      alt={sub.title}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <div>
                                      <p className="font-medium">{sub.title}</p>
                                      <p className="text-xs">
                                        ₹{sub.price} | {sub.time_required}
                                      </p>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Preferences */}
                        {pkg.preferences.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-semibold">
                              Preferences:
                            </p>
                            <ul className="flex flex-wrap gap-2 mt-1">
                              {pkg.preferences.map((pref) => (
                                <li
                                  key={pref.preference_id}
                                  className="text-xs px-2 py-1 bg-gray-200 rounded-full"
                                >
                                  {pref.preference_value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
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
      />
    </div>
  );
};

export default Packages;
