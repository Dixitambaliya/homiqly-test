import React, { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import EditPackageModal from "../components/Modals/EditPackageModal";
import LoadingSlider from "../../shared/components/LoadingSpinner";

const safeSrc = (src) => (typeof src === "string" ? src.trim() : "");
const fmtTime = (t) => (t ? String(t).trim() : "—");
const fmtPrice = (n) => (typeof n === "number" ? `$${n}` : "—");

const Packages = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // NEW: track expanded package IDs (object for O(1) checks)
  const [expanded, setExpanded] = useState({});

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/getpackages");

      const rawData = Array.isArray(response.data)
        ? response.data
        : response.data?.result || [];

      const grouped = rawData.reduce((acc, item) => {
        const category = item.service_category_name || "Other";
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
      fetchPackages();
    } catch (error) {
      console.error("Error deleting package:", error);
    }
  };

  // NEW: toggle expand/collapse state for a given package id
  const toggleExpand = (packageId) => {
    setExpanded((prev) => ({
      ...prev,
      [packageId]: !prev[packageId],
    }));
  };

  // NEW: convenience to check expanded
  const isExpanded = (packageId) => !!expanded[packageId];

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <LoadingSlider />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            All Packages
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            This panel lists all service types and their packages with full
            details.
          </p>
        </div>
        <div>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            icon={<FiPlus className="mr-2" />}
          >
            Add Service Type
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {Object.entries(groupedPackages).map(([categoryName, services]) => (
          <section key={categoryName}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-sky-700">
                {categoryName}
              </h3>
              <span className="text-sm text-gray-500">
                {services.length} service{services.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-6">
              {services.map((service) => (
                <div
                  key={service.service_type_id}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Header: image + service info */}
                  <div className="flex items-start gap-4 p-5">
                    {service.service_type_media && (
                      <img
                        src={
                          safeSrc(service.service_type_media) ||
                          "https://via.placeholder.com/120?text=Service"
                        }
                        alt={service.service_type_name || "Service"}
                        className="w-28 h-28 object-cover rounded-lg border"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-gray-900">
                        {service.service_type_name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {service.service_name || "—"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <span className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                          {service.packages?.length || 0} packages
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 p-5">
                    {/* Packages list as vertical full-detail cards */}
                    <div className="space-y-5">
                      {Array.isArray(service.packages) &&
                      service.packages.length > 0 ? (
                        service.packages.map((pkg) => {
                          const expandedState = isExpanded(pkg.package_id);
                          return (
                            <div
                              key={pkg.package_id}
                              className="bg-gray-50 rounded-xl p-0 border overflow-hidden"
                            >
                              {/* Compact header row with expand/collapse */}
                              <div className="flex items-center justify-between gap-4 p-4">
                                <div className="flex items-center gap-4 min-w-0">
                                  <img
                                    src={
                                      safeSrc(pkg.package_media) ||
                                      "https://via.placeholder.com/120?text=Pkg"
                                    }
                                    alt={pkg.title || "Package"}
                                    className="w-24 h-20 object-cover rounded-md border flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <h5 className="text-lg font-bold text-gray-900">
                                      {pkg.title}
                                    </h5>
                                    <p className="text-sm text-gray-700 mt-1">
                                      {pkg.description || "No description"}
                                    </p>
                                    <div className="mt-2 text-sm text-gray-600">
                                      Time: {fmtTime(pkg.time_required)} ·{" "}
                                      <span className="font-semibold text-sky-700">
                                        {fmtPrice(pkg.price)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Expand/Collapse button */}
                                  <button
                                    onClick={() => toggleExpand(pkg.package_id)}
                                    aria-expanded={expandedState}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm hover:shadow-sm"
                                  >
                                    {expandedState ? (
                                      <>
                                        <FiChevronUp />
                                        <span>Collapse</span>
                                      </>
                                    ) : (
                                      <>
                                        <FiChevronDown />
                                        <span>Expand</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Edit / Delete remain visible */}
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
                                    variant="error"
                                    color="red"
                                    onClick={() =>
                                      handleDeletePackage(pkg.package_id)
                                    }
                                    icon={<FiTrash2 />}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>

                              {/* Expandable details */}
                              <div
                                className={`px-4 pb-4 transition-[max-height,opacity] duration-300 ease-in-out ${
                                  expandedState
                                    ? "pt-2 max-h-[2000px] opacity-100"
                                    : "pt-0 max-h-0 opacity-0"
                                } overflow-hidden`}
                                aria-hidden={!expandedState}
                              >
                                {/* Divider */}
                                <div className="border-t border-gray-200 my-3" />

                                {/* Sub-packages / Items */}
                                <div className="mt-1">
                                  <h6 className="text-sm font-semibold text-gray-800 mb-2">
                                    Items included
                                  </h6>
                                  {Array.isArray(pkg.sub_packages) &&
                                  pkg.sub_packages.length > 0 ? (
                                    <ul className="space-y-2">
                                      {pkg.sub_packages.map((sub) => (
                                        <li
                                          key={sub.sub_package_id}
                                          className="flex items-start gap-3 bg-white rounded p-3 border"
                                        >
                                          <img
                                            src={
                                              safeSrc(sub.item_media) ||
                                              "https://via.placeholder.com/80?text=Item"
                                            }
                                            alt={sub.item_name || "Item"}
                                            className="w-14 h-14 object-cover rounded border flex-shrink-0"
                                          />
                                          <div>
                                            <div className="flex items-center justify-between gap-3">
                                              <p className="text-sm font-medium text-gray-900">
                                                {sub.item_name}
                                              </p>
                                              <div className="text-sm text-sky-700 font-medium">
                                                {fmtPrice(sub.price)}
                                              </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Time: {fmtTime(sub.time_required)}
                                            </p>
                                            {sub.description && (
                                              <p className="text-sm text-gray-600 mt-1">
                                                {sub.description}
                                              </p>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      No items listed.
                                    </p>
                                  )}
                                </div>

                                {/* Preferences */}
                                <div className="mt-4">
                                  <h6 className="text-sm font-semibold text-gray-800 mb-2">
                                    Preferences
                                  </h6>
                                  {Array.isArray(pkg.preferences) &&
                                  pkg.preferences.length > 0 ? (
                                    <div className="space-y-2">
                                      {pkg.preferences.map((pref) => (
                                        <div
                                          key={pref.preference_id}
                                          className="flex items-center justify-between p-3 bg-white border rounded"
                                        >
                                          <div className="text-sm text-gray-800">
                                            {pref.preference_value}
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            {pref.preference_price
                                              ? fmtPrice(pref.preference_price)
                                              : "—"}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      No preferences.
                                    </p>
                                  )}
                                </div>

                                {/* Add-ons */}
                                <div className="mt-4">
                                  <h6 className="text-sm font-semibold text-gray-800 mb-2">
                                    Add-ons
                                  </h6>
                                  {Array.isArray(pkg.addons) &&
                                  pkg.addons.length > 0 ? (
                                    <div className="space-y-2">
                                      {pkg.addons.map((addon) => (
                                        <div
                                          key={addon.addon_id}
                                          className="flex items-start justify-between gap-3 p-3 bg-white border rounded"
                                        >
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">
                                              {addon.addon_name}
                                            </div>
                                            {addon.description && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {addon.description}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-sm font-semibold text-sky-700">
                                            {fmtPrice(addon.price)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      No add-ons.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-gray-500">
                          No packages available for this service.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

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
