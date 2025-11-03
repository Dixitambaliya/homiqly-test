import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, IconButton } from "../../shared/components/Button";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import api from "../../lib/axiosConfig";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import EditPackageModal from "../components/Modals/EditPackageModal";
import FormSelect from "../../shared/components/Form/FormSelect";
import { FormInput } from "../../shared/components/Form";
import { Plus, Search, Trash, X } from "lucide-react";
import UniversalDeleteModal from "../../shared/components/Modal/UniversalDeleteModal";

/* ---------- small helpers ---------- */
const safeSrc = (src) => (typeof src === "string" ? src.trim() : "");
const fmtTime = (t) => (t ? String(t).trim() : "—");
const fmtPrice = (n) =>
  typeof n === "number" || (!Number.isNaN(Number(n)) && n !== "")
    ? `$${Number(n)}`
    : "—";

/* ---------- presentational components (small/memoized) ---------- */
const PreferencesChips = React.memo(function PreferencesChips({ preferences }) {
  if (!preferences || Object.keys(preferences).length === 0) {
    return <div className="text-xs text-gray-400 italic">No preferences</div>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(preferences).map(([groupKey, group]) => {
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
                        {fmtPrice(p?.preference_price)}
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
});

const AddonsChips = React.memo(function AddonsChips({ addons }) {
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
                {fmtTime(a.time_required)} Min.
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
});

const SubPackageItem = React.memo(function SubPackageItem({ sub }) {
  const buildPreferencesObject = (subObj) => {
    if (
      subObj &&
      typeof subObj.preferences === "object" &&
      !Array.isArray(subObj.preferences)
    )
      return subObj.preferences;
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
      <div className="flex gap-4">
        <div className="w-36 h-24 rounded-md overflow-hidden border bg-gray-100 flex-shrink-0">
          <img
            src={
              safeSrc(sub.item_media) ||
              "https://via.placeholder.com/160?text=Item"
            }
            alt={sub.item_name || "Item"}
            loading="lazy"
            decoding="async"
            width="160"
            height="160"
            className="w-full h-full object-cover rounded-md bg-gray-100"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <p className="text-base font-medium text-gray-900 truncate">
                {sub.item_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Time: {fmtTime(sub.time_required)} Minutes
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

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Preferences
              </div>
              <PreferencesChips preferences={preferencesObj} />
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Add-ons
              </div>
              <AddonsChips addons={sub.addons} />
            </div>
          </div>

          <div className="mt-3">
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
              <div className="text-xs text-gray-400 italic">
                No consent items
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
});

/* Details Modal (same behavior) */
function PackageDetailsModal({ packageId, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [pkgData, setPkgData] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPkgData(null);
      setLoading(false);
      return;
    }

    let canceled = false;

    async function loadDetails() {
      try {
        setLoading(true);
        const resp = await api.get(`/api/admin/getpackagedetails/${packageId}`);
        const data = resp?.data?.package ?? resp?.data ?? null;
        if (!canceled) setPkgData(data);
      } catch (err) {
        console.error("Failed to load package details", err);
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    if (packageId) loadDetails();

    return () => {
      canceled = true;
    };
  }, [isOpen, packageId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-w-4xl w-full max-h-[90vh] overflow-auto bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {pkgData?.packageName ?? `Package #${packageId}`}
          </h3>
          <div className="flex items-center gap-3">
            <IconButton
              icon={<X className="w-4 h-4" />}
              size="sm"
              variant="ghost"
              onClick={onClose}
            ></IconButton>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {Array.isArray(pkgData?.sub_packages) &&
            pkgData.sub_packages.length > 0 ? (
              <ul className="space-y-4">
                {pkgData.sub_packages.map((sub) => (
                  <SubPackageItem
                    key={sub.sub_package_id ?? sub.item_name}
                    sub={sub}
                  />
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No items listed.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Main component ---------------- */

export default function Packages() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackageForEdit, setSelectedPackageForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [search, setSearch] = useState(""); // immediate search, no debounce
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [detailsModalPkgId, setDetailsModalPkgId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null); // { type: 'package', item: {...} }

  // transforms raw list (array of package objects) into grouped services
  const transformListToServices = (list) => {
    const servicesMap = {};
    (Array.isArray(list) ? list : []).forEach((pkg) => {
      const serviceId =
        pkg.service_id ?? pkg.service_type_id ?? `s_${pkg.package_id}`;
      const serviceName =
        pkg.service_name ??
        pkg.service_type_name ??
        pkg.service_filter ??
        `Service ${serviceId}`;
      const serviceCategory = pkg.service_category_name ?? "Other";

      if (!servicesMap[serviceId]) {
        servicesMap[serviceId] = {
          service_id: serviceId,
          service_name: serviceName,
          service_category_name: serviceCategory,
          packages: [],
        };
      }

      servicesMap[serviceId].packages.push({
        package_id: pkg.package_id ?? pkg.packageId ?? pkg.id,
        packageName: pkg.packageName ?? pkg.package_name ?? pkg.name,
        packageMedia:
          pkg.packageMedia ?? pkg.package_media ?? pkg.packageMediaUrl,
        time_required: pkg.time_required ?? pkg.duration,
        price: pkg.price ?? pkg.package_price,
        service_type_name: pkg.service_type_name ?? pkg.service_name,
        service_category_name: serviceCategory,
      });
    });

    return Object.values(servicesMap);
  };

  // fetchPackages: used on mount and as a refresh target
  const fetchPackages = useCallback(async () => {
    let canceled = false;
    try {
      setLoading(true);
      const resp = await api.get("/api/admin/getpackagelist");
      const raw =
        resp?.data?.packages ??
        resp?.data?.result ??
        (Array.isArray(resp?.data) ? resp.data : resp?.data ?? []);
      const list = Array.isArray(raw) ? raw : [];
      const services = transformListToServices(list);
      if (canceled) return;
      setAllServices(services);
      const unique = Object.keys(
        services.reduce((acc, it) => {
          acc[it.service_category_name || "Other"] = true;
          return acc;
        }, {})
      );
      setCategories(unique.map((c) => ({ value: c, label: c })));
    } catch (err) {
      console.error("Error fetching packages list", err);
      setAllServices([]);
      setCategories([]);
    } finally {
      if (!canceled) setLoading(false);
    }

    // no real way to cancel axios request here; the canceled flag prevents state changes
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        const resp = await api.get("/api/admin/getpackagelist");
        if (canceled) return;
        const raw =
          resp?.data?.packages ??
          resp?.data?.result ??
          (Array.isArray(resp?.data) ? resp.data : resp?.data ?? []);
        const list = Array.isArray(raw) ? raw : [];
        const services = transformListToServices(list);
        if (canceled) return;
        setAllServices(services);
        const unique = Object.keys(
          services.reduce((acc, it) => {
            acc[it.service_category_name || "Other"] = true;
            return acc;
          }, {})
        );
        setCategories(unique.map((c) => ({ value: c, label: c })));
      } catch (err) {
        console.error("Error fetching packages list", err);
        setAllServices([]);
        setCategories([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteClick = (type, item) => {
    // Only "package" supported here but kept type for extensibility
    setDeletingItem({ type, item });
    setShowDeleteModal(true);

    setDeleteAction(() => async () => {
      if (!item) return;
      try {
        setDeleting(true);
        // call API depending on type
        if (type === "package") {
          const packageId = item.package_id ?? item.packageId ?? item.id;
          await api.delete(`/api/admin/deletepackage/${packageId}`);
          // refresh packages list after delete
          await fetchPackages();
        } else {
          // future types can be added here
        }
      } catch (err) {
        console.error("Failed to delete:", err);
      } finally {
        setDeleting(false);
        setShowDeleteModal(false);
        setDeleteAction(null);
        setDeletingItem(null);
      }
    });
  };

  const deleteDesc = useMemo(() => {
    if (!deletingItem) return "Are you sure you want to delete this package?";
    const pkg = deletingItem.item || {};
    const name =
      pkg.packageName ?? pkg.package_name ?? `#${pkg.package_id ?? pkg.id}`;
    const id = pkg.package_id ?? pkg.packageId ?? pkg.id;
    return `Are you sure you want to delete "${name}" (Package ID: ${id})? This action cannot be undone.`;
  }, [deletingItem]);

  const openDetails = useCallback((pkgId) => {
    setDetailsModalPkgId(pkgId);
    setIsDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsModalPkgId(null);
    setIsDetailsOpen(false);
  }, []);

  const handleEdit = useCallback((pkg) => {
    setSelectedPackageForEdit(pkg);
    setShowEditModal(true);
  }, []);

  // Search & filter (no debounce — immediate)
  const filteredServices = useMemo(() => {
    const s = (allServices || [])
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
        let matchesPackageName = false;
        if (Array.isArray(service.packages)) {
          matchesPackageName = service.packages.some((pkg) =>
            (pkg.packageName || "").toLowerCase().includes(search.toLowerCase())
          );
        }
        return (
          matchesCategory &&
          (matchesServiceName || matchesPackageName || search === "")
        );
      });

    return s;
  }, [allServices, category, search]);

  const displayPackages = useMemo(() => {
    return filteredServices.reduce((acc, itm) => {
      const k = itm.service_category_name || "Other";
      (acc[k] ||= []).push(itm);
      return acc;
    }, {});
  }, [filteredServices]);

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
            Filter by service name, package name, or category.
          </p>
        </div>
        <div>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
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
          placeholder="Search Service Name or Package Name"
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
                            <div className=" flex flex-wrap gap-2">
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
                              <div
                                key={pkg.package_id}
                                className="rounded-lg border bg-white overflow-hidden"
                              >
                                <div className="flex items-center justify-between p-4">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {pkg.packageName ||
                                          `Package #${pkg.package_id}`}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {pkg.service_type_name &&
                                        pkg.service_type_name !==
                                          pkg.packageName
                                          ? pkg.service_type_name
                                          : pkg.time_required
                                          ? `Time: ${pkg.time_required}`
                                          : ""}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEdit(pkg)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="lightError"
                                      onClick={() =>
                                        handleDeleteClick("package", {
                                          package_id: pkg.package_id,
                                          packageName: pkg.packageName,
                                          id: pkg.package_id,
                                        })
                                      }
                                    >
                                      Delete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="lightPrimary"
                                      onClick={() =>
                                        openDetails(pkg.package_id)
                                      }
                                    >
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </div>
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
          setSelectedPackageForEdit(null);
        }}
        refresh={fetchPackages}
        packageData={selectedPackageForEdit}
      />

      <PackageDetailsModal
        packageId={detailsModalPkgId}
        isOpen={isDetailsOpen}
        onClose={closeDetails}
      />

      <UniversalDeleteModal
        open={showDeleteModal}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeleteAction(null);
            setDeletingItem(null);
          }
        }}
        onDelete={deleteAction}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onError={(err) => {
          console.error("Delete error:", err);
        }}
        title="Delete Package"
        desc={deleteDesc}
      />
    </div>
  );
}
