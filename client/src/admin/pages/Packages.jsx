import React, { useEffect, useState } from "react";
import { Button } from "../../shared/components/Button";
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import EditPackageModal from "../components/Modals/EditPackageModal";
import FormSelect from "../../shared/components/Form/FormSelect"; // assume correct import
import { FormInput } from "../../shared/components/Form";
import { Search } from "lucide-react";

const safeSrc = (src) => (typeof src === "string" ? src.trim() : "");
const fmtTime = (t) => (t ? String(t).trim() : "—");
const fmtPrice = (n) =>
  typeof n === "number" || (!Number.isNaN(Number(n)) && n !== "")
    ? `$${Number(n)}`
    : "—";

// Improved Packages page (UI focused)
export default function Packages() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupedPackages, setGroupedPackages] = useState({});
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expanded, setExpanded] = useState({}); // per-package expansion
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/getpackages");
      const rawData = Array.isArray(response.data)
        ? response.data
        : response.data?.result || [];
      setAllServices(rawData);

      const uniqueCategories = Object.keys(
        rawData.reduce((acc, item) => {
          const cat = item.service_category_name || "Other";
          acc[cat] = true;
          return acc;
        }, {})
      );
      setCategories(uniqueCategories.map((c) => ({ value: c, label: c })));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching packages:", err);
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
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (packageId) => {
    setExpanded((s) => ({ ...s, [packageId]: !s[packageId] }));
  };

  // Filtering
  const filteredServices = allServices.filter((service) => {
    const matchesCategory =
      category === "" || service.service_category_name === category;
    const serviceName = (service.service_name || "").toLowerCase();
    const matchesServiceName =
      search === "" || serviceName.includes(search.toLowerCase());

    let matchesItemName = false;
    if (Array.isArray(service.packages)) {
      matchesItemName = service.packages.some(
        (pkg) =>
          Array.isArray(pkg.sub_packages) &&
          pkg.sub_packages.some((sub) =>
            (sub.item_name || "").toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    const matchesSearch =
      search === "" || matchesServiceName || matchesItemName;
    return matchesCategory && matchesSearch;
  });

  const displayPackages = filteredServices.reduce((acc, item) => {
    const key = item.service_category_name || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
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
            Filter by service name, item name or category.
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-8">
        <FormInput
          className="w-full sm:w-2/3"
          type="text"
          icon={<Search />}
          placeholder="Search Service Name or Item Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="w-full sm:w-1/3">
          <FormSelect
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[{ value: "", label: "All Categories" }, ...categories]}
            placeholder="Select Category"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-10">
        {Object.entries(displayPackages).map(([categoryName, services]) => (
          <section key={categoryName}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-sky-700">
                {categoryName}
              </h3>
              <span className="text-sm text-gray-500">
                {services.length} service{services.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-6">
              {services.map((service) => (
                <div
                  key={service.service_id ?? service.service_name}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex gap-4 items-center">
                      {/* Left: image */}
                      <div className="flex-shrink-0">
                        {service.service_image && (
                          <img
                            src={
                              safeSrc(service.service_image) ||
                              (Array.isArray(service.packages) &&
                                service.packages[0]?.service_type_media) ||
                              "https://via.placeholder.com/120?text=Service"
                            }
                            alt={service.service_name || "Service"}
                            className="w-28 h-28 object-cover rounded-lg border"
                          />
                        )}
                      </div>

                      {/* Middle: basic info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="truncate">
                            <h4 className="text-xl font-semibold text-gray-900 truncate">
                              {service.service_name || "—"}
                            </h4>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                                {service.packages?.length || 0} package
                                {service.packages?.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Quick stats column */}
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {service.service_filter}
                            </div>
                          </div>
                        </div>

                        {/* Packages list (compact headers) */}
                        <div className="mt-6 space-y-4">
                          {Array.isArray(service.packages) &&
                          service.packages.length > 0 ? (
                            service.packages.map((pkg) => {
                              const expandedState = !!expanded[pkg.package_id];
                              return (
                                <div
                                  key={pkg.package_id}
                                  className="rounded-lg border bg-gray-50 overflow-hidden"
                                >
                                  {/* Header */}
                                  <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                      <button
                                        onClick={() =>
                                          toggleExpand(pkg.package_id)
                                        }
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

                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                          {pkg.service_type_name ||
                                            `Package #${pkg.package_id}`}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {pkg.time_required
                                            ? `Time: ${pkg.time_required}`
                                            : ""}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
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
                                        onClick={() =>
                                          handleDeletePackage(pkg.package_id)
                                        }
                                        icon={<FiTrash2 />}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Details panel: make it capped height with its own scrollbar so it doesn't push page */}
                                  <div
                                    className={`px-4 transition-all duration-300 ease-in-out ${
                                      expandedState
                                        ? "pb-6 pt-4 max-h-[900px] opacity-100"
                                        : "pt-0 pb-0 max-h-0 opacity-0"
                                    }`}
                                    aria-hidden={!expandedState}
                                  >
                                    <div className="space-y-6 max-h-[420px] overflow-auto pr-2">
                                      {/* Sub-packages grid */}
                                      {Array.isArray(pkg.sub_packages) &&
                                      pkg.sub_packages.length > 0 ? (
                                        <ul className="space-y-4">
                                          {pkg.sub_packages.map((sub) => (
                                            <li
                                              key={sub.sub_package_id}
                                              className="bg-white rounded-lg border p-4 shadow-sm"
                                            >
                                              <div className="grid grid-cols-12 gap-4 items-start">
                                                <div className="col-span-2">
                                                  <img
                                                    src={
                                                      safeSrc(sub.item_media) ||
                                                      "https://via.placeholder.com/80?text=Item"
                                                    }
                                                    alt={
                                                      sub.item_name || "Item"
                                                    }
                                                    className="w-20 h-20 object-cover rounded-md border"
                                                  />
                                                </div>

                                                <div className="col-span-7">
                                                  <div className="flex justify-between items-start">
                                                    <div className="min-w-0">
                                                      <p className="text-base font-medium text-gray-900 truncate">
                                                        {sub.item_name}
                                                      </p>
                                                      <p className="text-xs text-gray-500 mt-1">
                                                        Time:{" "}
                                                        {fmtTime(
                                                          sub.time_required
                                                        )}
                                                      </p>
                                                    </div>

                                                    <div className="ml-4 text-right">
                                                      <p className="text-sm font-semibold text-sky-700">
                                                        {fmtPrice(sub.price)}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  {sub.description && (
                                                    <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">
                                                      {sub.description}
                                                    </p>
                                                  )}

                                                  {/* Preferences + Addons shown as horizontal chips to reduce height */}
                                                  <div className="mt-3 flex flex-wrap gap-2">
                                                    {Array.isArray(
                                                      sub.preferences
                                                    ) &&
                                                    sub.preferences.length >
                                                      0 ? (
                                                      sub.preferences.map(
                                                        (pref) => (
                                                          <div
                                                            key={
                                                              pref.preference_id
                                                            }
                                                            className="px-3 py-1 bg-gray-50 border rounded-full text-xs text-gray-800"
                                                          >
                                                            {
                                                              pref.preference_value
                                                            }{" "}
                                                            •{" "}
                                                            {fmtPrice(
                                                              pref.preference_price
                                                            )}
                                                          </div>
                                                        )
                                                      )
                                                    ) : (
                                                      <div className="text-xs text-gray-400 italic">
                                                        No preferences
                                                      </div>
                                                    )}

                                                    {Array.isArray(
                                                      sub.addons
                                                    ) &&
                                                      sub.addons.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                          {sub.addons
                                                            .slice(0, 3)
                                                            .map((addon) => (
                                                              <div
                                                                key={
                                                                  addon.addon_id
                                                                }
                                                                className="px-3 py-1 bg-gray-50 border rounded-full text-xs"
                                                              >
                                                                {
                                                                  addon.addon_name
                                                                }{" "}
                                                                •{" "}
                                                                {fmtPrice(
                                                                  addon.price
                                                                )}
                                                              </div>
                                                            ))}
                                                          {sub.addons.length >
                                                            3 && (
                                                            <div className="px-3 py-1 bg-gray-50 border rounded-full text-xs">
                                                              +
                                                              {sub.addons
                                                                .length -
                                                                3}{" "}
                                                              more
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}
                                                  </div>
                                                </div>

                                                <div className="col-span-3 text-right">
                                                  {/* actions for item if needed */}
                                                </div>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="text-sm text-gray-500 italic">
                                          No items listed.
                                        </div>
                                      )}

                                      {/* Consent form compact */}
                                      {Array.isArray(pkg.consentForm) &&
                                        pkg.consentForm.length > 0 && (
                                          <div>
                                            <h6 className="text-sm font-semibold text-gray-700 mb-2">
                                              Consent Form
                                            </h6>
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                              {pkg.consentForm.map((c) => (
                                                <li key={c.consent_id}>
                                                  {c.question}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
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
}
