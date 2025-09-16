import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { Button } from "../../shared/components/Button";
import { toast } from "react-toastify";
import ApplyServiceModal from "../components/Modals/ApplyServiceModal";

const Services = () => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [requestingPackages, setRequestingPackages] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.get("/api/admin/getpackages");
        const rawData = Array.isArray(response.data)
          ? response.data
          : response.data?.result || [];

        const grouped = rawData.reduce((acc, item) => {
          const category = item.service_category_name;
          if (!acc[category]) acc[category] = [];
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

  const categoryList = ["All Categories", ...Object.keys(groupedPackages)];

  const handleRequestService = async (packageId) => {
    const token = localStorage.getItem("vendorToken");
    if (!token) {
      toast.error("User not authenticated.");
      return;
    }

    setRequestingPackages((prev) => ({ ...prev, [packageId]: true }));

    try {
      const response = await api.post(
        "/api/vendor/applyservice",
        { packageIds: [packageId] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Service request submitted successfully!");
    } catch (error) {
      console.error("Request failed:", error);
      toast.error("Failed to request service.");
    } finally {
      setRequestingPackages((prev) => ({ ...prev, [packageId]: false }));
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Apply for Services</h2>

        {/* Dropdown */}
        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => {
              setSelectedPackage(null);
              setShowModal(true);
            }}
          >
            Request New Services
          </Button>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-60 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryList.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        Object.entries(groupedPackages)
          .filter(
            ([category]) =>
              selectedCategory === "All Categories" ||
              category === selectedCategory
          )
          .map(([categoryName, services]) => (
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
                    {service.service_type_media && (
                      <img
                        src={service.service_type_media}
                        alt={service.service_type_name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {service.service_type_name}
                      </h3>
                      <h4>
                        Service:
                        <span className="font-semibold text-gray-800">
                          {service.service_name}
                        </span>
                      </h4>
                      <p>
                        service filter :{" "}
                        <span className="font-semibold text-gray-800">
                          {service.service_filter}
                        </span>
                      </p>

                      {service.packages.map((pkg) => (
                        <div
                          key={pkg.package_id}
                          className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-xl"
                        >
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
                                        ${sub.price} | {sub.time_required}
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Preferences */}
                          {/* {pkg.preferences?.length > 0 && (
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
                          {pkg.addons?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                Addons :
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pkg.addons.map((pref, index) => (
                                  <div
                                    key={index}
                                    className="bg-white shadow-md rounded-lg border p-4 flex flex-col"
                                  >
                                    <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                      {pref.addon_name}
                                    </h4>
                                    <p className="text-xs text-gray-600 mb-2">
                                      {pref.description}
                                    </p>
                                    <span className="text-sm font-medium text-blue-600">
                                      ${pref.price}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )} */}

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={requestingPackages[pkg.package_id]}
                              onClick={() => {
                                setSelectedPackage({
                                  ...pkg,
                                  service_id: service.service_id,
                                  service_category_id:
                                    service.service_category_id,
                                });
                                setShowModal(true);
                              }}
                            >
                              {requestingPackages[pkg.package_id]
                                ? "Requesting..."
                                : "Request for Service"}
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

      <ApplyServiceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialPackage={selectedPackage}
      />
    </div>
  );
};

export default Services;
