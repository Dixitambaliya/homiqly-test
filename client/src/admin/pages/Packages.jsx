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

/* Presentational subcomponents from OLD UI */

function PreferencesChips({ preferences }) {
  if (!Array.isArray(preferences) || preferences.length === 0) {
    return <div className="text-xs text-gray-400 italic">No preferences</div>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {preferences.map((p) => (
        <div
          key={p.preference_id}
          className="px-3 py-1 bg-gray-50 border rounded-full text-xs text-gray-800"
          title={`${p.preference_value} — ${fmtPrice(p.preference_price)}`}
        >
          {p.preference_value} • {fmtPrice(p.preference_price)}
        </div>
      ))}
    </div>
  );
}

function AddonsChips({ addons }) {
  if (!Array.isArray(addons) || addons.length === 0) {
    return <div className="text-xs text-gray-400 italic">No add-ons</div>;
  }
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {addons.slice(0, 3).map((a) => (
        <div
          key={a.addon_id}
          className="px-3 py-1 bg-yellow-50 border rounded-full text-xs"
          title={`${a.addon_name} — ${fmtPrice(a.price)}`}
        >
          {a.addon_name} • {fmtPrice(a.price)} • {a.description}
        </div>
      ))}
    </div>
  );
}

function SubPackageItem({ sub }) {
  return (
    <li className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="grid grid-cols-12 gap-4 items-start">
        <div className="col-span-2">
          <img
            src={
              safeSrc(sub.item_media) ||
              "https://via.placeholder.com/80?text=Item"
            }
            alt={sub.item_name || "Item"}
            className="w-full h-full object-cover rounded-md border"
          />
        </div>
        <div className="col-span-7">
          <div className="flex justify-between items-start">
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
          <div className="mt-3 space-y-2">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Preferences
              </div>
              <PreferencesChips preferences={sub.preferences} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Add-ons
              </div>
              <AddonsChips addons={sub.addons} />
            </div>
          </div>
        </div>
        <div className="col-span-3 text-right">
          {/* Placeholder for per-item actions */}
        </div>
      </div>
    </li>
  );
}

function PackageCard({ pkg, onEdit, onDelete, expanded, onToggle }) {
  return (
    <div className="rounded-lg border bg-gray-50 overflow-hidden">
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
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {pkg.service_type_name || `Package #${pkg.package_id}`}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {pkg.time_required ? `Time: ${pkg.time_required}` : ""}
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
            ? "pb-6 pt-4 max-h-[900px] opacity-100"
            : "pt-0 pb-0 max-h-0 opacity-0"
        }`}
        aria-hidden={!expanded}
      >
        <div className="space-y-6 max-h-[420px] overflow-auto pr-2">
          {/* Sub-packages */}
          {Array.isArray(pkg.sub_packages) && pkg.sub_packages.length > 0 ? (
            <ul className="space-y-4">
              {pkg.sub_packages.map((sub) => (
                <SubPackageItem key={sub.sub_package_id} sub={sub} />
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 italic">No items listed.</div>
          )}
          {/* Consent Form */}
          {Array.isArray(pkg.consentForm) && pkg.consentForm.length > 0 && (
            <div>
              <h6 className="text-sm font-semibold text-gray-700 mb-2">
                Consent Form
              </h6>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {pkg.consentForm.map((c) => (
                  <li key={c.consent_id}>{c.question}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Main component (your CURRENT UI CODE) */

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

  const filteredServices = allServices.filter((service) => {
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
