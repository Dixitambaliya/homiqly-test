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

/* Presentational subcomponents */

function PreferencesChips({ preferences }) {
  if (!preferences || Object.keys(preferences).length === 0) {
    return <div className="text-xs text-gray-400 italic">No preferences</div>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(preferences).map(([groupKey, group]) => {
        // assume group is { is_required: 0|1, items: [ { preference_value, preference_price, ... } ] }
        const isRequired = Number(group?.is_required) === 1;
        const items = Array.isArray(group?.items) ? group.items : [];

        return (
          <div
            key={groupKey}
            className="border rounded-lg p-3 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">
                {groupKey}
              </div>

              <span
                className={
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                  (isRequired
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200")
                }
              >
                {isRequired ? "Required" : "Optional"}
              </span>
            </div>

            <ul className="space-y-1">
              {items.length ? (
                items.map((p, idx) => (
                  <li
                    key={`${groupKey}-${p?.preference_id ?? idx}`}
                    className="flex items-center justify-between text-sm text-gray-800"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <span className="truncate">{p?.preference_value}</span>
                    </span>

                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-gray-500">
                        {typeof fmtPrice === "function"
                          ? fmtPrice(p?.preference_price)
                          : p?.preference_price}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-xs text-gray-400 italic">No options</li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AddonsChips({ addons }) {
  if (!Array.isArray(addons) || addons.length === 0) {
    return <div className="text-xs text-gray-400 italic">No add-ons</div>;
  }

  return (
    <ul className="space-y-2">
      {addons.map((a) => (
        <li
          key={a.addon_id ?? `${a.addon_name}-${a.price}`}
          className="flex items-start justify-between gap-3 p-3 bg-white border rounded-lg shadow-sm"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {a.addon_name}
                </div>
                {a.description && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {a.description}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 ml-2 justify-end">
            <span className="inline-flex justify-end px-2 py-0.5 rounded-md text-xs font-semibold border bg-white">
              {fmtPrice(a.price)}
            </span>
            {a.time_required && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {fmtTime(a.time_required)}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SubPackageItem({ sub }) {
  // If API already returns `preferences` as an object, use it directly
  const buildPreferencesObject = (subObj) => {
    if (
      subObj &&
      typeof subObj.preferences === "object" &&
      !Array.isArray(subObj.preferences)
    ) {
      return subObj.preferences;
    }

    // otherwise collect preference keys like preferences0, preferences1
    const prefKeys = Object.keys(subObj || {}).filter((k) =>
      /^preferences\d+$/.test(k)
    );
    if (prefKeys.length === 0) return {};

    return prefKeys.reduce((acc, k) => {
      const idx = k.replace(/^preferences/, "");
      acc[idx] = subObj[k] || [];
      return acc;
    }, {});
  };

  const preferencesObj = buildPreferencesObject(sub);

  return (
    <li className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex flex-row gap-4 ">
        <div className="">
          <div className="w-full h-24 rounded-md overflow-hidden border bg-gray-100">
            <img
              src={
                safeSrc(sub.item_media) ||
                "https://via.placeholder.com/160?text=Item"
              }
              alt={sub.item_name || "Item"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <p className="text-base font-medium text-gray-900 truncate">
                {sub.item_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Time: {fmtTime(sub.time_required)}
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
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Preferences
          </div>
          <PreferencesChips preferences={preferencesObj} />
        </div>

        <div className="md:col-span-1">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Add-ons
          </div>
          <AddonsChips addons={sub.addons} />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Consent
          </div>
          {Array.isArray(sub.consentForm) && sub.consentForm.length > 0 ? (
            <div className="space-y-2">
              {sub.consentForm.map((c, i) => {
                const isReq = Number(c.is_required) === 1;
                return (
                  <div
                    key={c.consent_id ?? i}
                    className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded-md border border-gray-100"
                  >
                    <div className="text-sm text-gray-700 truncate">
                      {c.question}
                    </div>
                    <div>
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                          (isReq
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200")
                        }
                      >
                        {isReq ? "Required" : "Optional"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">No consent items</div>
          )}
        </div>
      </div>
    </li>
  );
}

function PackageCard({ pkg, onEdit, onDelete, expanded, onToggle }) {
  const pkgThumb = safeSrc(pkg.packageMedia) || null;

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => onToggle(pkg.package_id)}
            aria-expanded={!!expanded}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm hover:shadow-sm"
          >
            {expanded ? (
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

          <div className="flex items-center gap-4 min-w-0">
            {pkgThumb && (
              <div className="w-14 h-14 flex-shrink-0 rounded-md overflow-hidden border bg-gray-100">
                <img
                  src={pkgThumb || "https://via.placeholder.com/56?text=Pkg"}
                  alt={
                    pkg.packageName ||
                    pkg.service_type_name ||
                    `Package ${pkg.package_id}`
                  }
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {pkg.packageName ||
                  pkg.service_type_name ||
                  `Package #${pkg.package_id}`}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {pkg.service_type_name &&
                pkg.service_type_name !== pkg.packageName
                  ? pkg.service_type_name
                  : pkg.time_required
                  ? `Time: ${pkg.time_required}`
                  : ""}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(pkg)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="error"
            onClick={() => onDelete(pkg.package_id)}
            icon={<FiTrash2 />}
          >
            Delete
          </Button>
        </div>
      </div>

      <div
        className={`px-4 transition-all duration-300 ease-in-out ${
          expanded
            ? "pb-6 pt-4 max-h-[1100px] opacity-100"
            : "pt-0 pb-0 max-h-0 opacity-0"
        }`}
        aria-hidden={!expanded}
      >
        <div className="space-y-6 max-h-[560px] overflow-auto pr-2 min-h-0">
          {Array.isArray(pkg.sub_packages) && pkg.sub_packages.length > 0 ? (
            <ul className="space-y-4">
              {pkg.sub_packages.map((sub) => (
                <SubPackageItem
                  key={
                    sub.sub_package_id ?? `${pkg.package_id}-${sub.item_name}`
                  }
                  sub={sub}
                />
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 italic">No items listed.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Main component */

export default function Packages() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/getpackages");
      const raw = Array.isArray(response.data)
        ? response.data
        : response.data?.result || [];
      setAllServices(raw);
      const unique = Object.keys(
        raw.reduce((acc, it) => {
          acc[it.service_category_name || "Other"] = true;
          return acc;
        }, {})
      );
      setCategories(unique.map((c) => ({ value: c, label: c })));
    } catch (err) {
      console.error("Error fetching packages", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePackage(packageId) {
    if (!window.confirm("Are you sure you want to delete this package?"))
      return;
    try {
      await api.delete(`/api/admin/deletepackage/${packageId}`);
      await fetchPackages();
    } catch (err) {
      console.error(err);
    }
  }

  function toggleExpand(pkgId) {
    setExpanded((s) => ({ ...s, [pkgId]: !s[pkgId] }));
  }
  function handleEdit(pkg) {
    setSelectedPackage(pkg);
    setShowEditModal(true);
  }

  // only include services that actually have packages (hide empty)
  const filteredServices = allServices
    .filter(
      (service) =>
        Array.isArray(service.packages) && service.packages.length > 0
    )
    .filter((service) => {
      const matchesCategory =
        category === "" || service.service_category_name === category;
      const sname = (service.service_name || "").toLowerCase();
      const matchesServiceName =
        search === "" || sname.includes(search.toLowerCase());
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
      return (
        matchesCategory &&
        (matchesServiceName || matchesItemName || search === "")
      );
    });

  const displayPackages = filteredServices.reduce((acc, itm) => {
    const k = itm.service_category_name || "Other";
    (acc[k] ||= []).push(itm);
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

      <div className="space-y-10">
        {Object.entries(displayPackages).map(([catName, services]) => (
          <section key={catName}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-sky-700">{catName}</h3>
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
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {service.service_filter}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          {Array.isArray(service.packages) &&
                          service.packages.length > 0 ? (
                            service.packages.map((pkg) => (
                              <PackageCard
                                key={pkg.package_id}
                                pkg={pkg}
                                expanded={!!expanded[pkg.package_id]}
                                onToggle={toggleExpand}
                                onEdit={handleEdit}
                                onDelete={handleDeletePackage}
                              />
                            ))
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
