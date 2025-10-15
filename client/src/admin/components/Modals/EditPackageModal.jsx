import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import {
  FormInput,
  FormTextarea,
  FormFileInput,
  FormSelect,
} from "../../../shared/components/Form";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";
import { CollapsibleSectionCard } from "../../../shared/components/Card/CollapsibleSectionCard";

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const EditPackageModal = ({ isOpen, onClose, packageData, refresh }) => {
  // Package-level fields
  const [packageName, setPackageName] = useState("");
  const [packageMediaExisting, setPackageMediaExisting] = useState(null);
  const [subPackages, setSubPackages] = useState([]);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false); // submit loading
  const [detailsLoading, setDetailsLoading] = useState(false); // details fetch loading

  /**
   * normalizePreferencesFromServer
   * - Accepts various incoming shapes and returns normalized:
   *   { "<Group Title>": { is_required: 0|1, items: [ { preference_id, preference_value, preference_price }, ... ] }, ... }
   */
  const normalizePreferencesFromServer = (s) => {
    if (!s) return {};

    // Case 1: server already returns preferences as object keyed by title
    if (s.preferences && typeof s.preferences === "object") {
      const prefs = s.preferences;
      const isNewShape = Object.values(prefs).some(
        (v) =>
          v &&
          typeof v === "object" &&
          !Array.isArray(v) &&
          ("items" in v || "is_required" in v)
      );
      if (isNewShape) {
        return Object.entries(prefs).reduce((acc, [k, v]) => {
          const groupObj = v || {};
          const items = Array.isArray(groupObj.items)
            ? groupObj.items
            : Array.isArray(v)
            ? v
            : [];
          acc[k] = {
            is_required: Number(groupObj.is_required ?? 0) || 0,
            items: (items || []).map((p) => ({
              preference_id: p.preference_id ?? null,
              preference_value: p.preference_value ?? p.value ?? "",
              preference_price:
                p.preference_price ??
                p.price ??
                safeNumber(p.preferencePrice) ??
                0,
            })),
          };
          return acc;
        }, {});
      }

      // Otherwise assume old shape: keys -> arrays of items
      return Object.entries(prefs).reduce((acc, [k, arr]) => {
        acc[k] = {
          is_required: 0,
          items: (arr || []).map((p) => ({
            preference_id: p.preference_id ?? null,
            preference_value: p.preference_value ?? p.value ?? "",
            preference_price:
              p.preference_price ??
              p.price ??
              safeNumber(p.preferencePrice) ??
              0,
          })),
        };
        return acc;
      }, {});
    }

    // Case 2: server returns preferences as an array => place under Default group
    if (Array.isArray(s.preferences)) {
      return {
        Default: {
          is_required: 0,
          items: (s.preferences || []).map((p) => ({
            preference_id: p.preference_id ?? null,
            preference_value: p.preference_value ?? p.value ?? "",
            preference_price:
              p.preference_price ??
              p.price ??
              safeNumber(p.preferencePrice) ??
              0,
          })),
        },
      };
    }

    // Case 3: older flattened keys like preferences0, preferences1 => map them to Group N
    const keys = Object.keys(s).filter((k) => /^preferences\d+$/.test(k));
    if (keys.length) {
      return keys.reduce((acc, k, i) => {
        const arr = s[k] || [];
        acc[`Group ${i + 1}`] = {
          is_required: 0,
          items: (arr || []).map((p) => ({
            preference_id: p.preference_id ?? null,
            preference_value: p.preference_value ?? p.value ?? "",
            preference_price:
              p.preference_price ??
              p.price ??
              safeNumber(p.preferencePrice) ??
              0,
          })),
        };
        return acc;
      }, {});
    }

    return {};
  };

  // Helper to normalize a single sub package from server shape to UI shape
  const normalizeSubFromServer = (s) => {
    const prefsObj = normalizePreferencesFromServer(s);

    return {
      sub_package_id: s.sub_package_id ?? null,
      item_name: s.item_name ?? "",
      description: s.description ?? "",
      price: s.price ?? "",
      time_required: s.time_required ?? "",
      item_media: s.item_media ?? s.itemMedia ?? "",
      preferences: prefsObj,
      addons: Array.isArray(s.addons)
        ? s.addons.map((a) => ({
            addon_id: a.addon_id ?? null,
            addon_name: a.addon_name ?? "",
            description: a.description ?? "",
            price: a.price ?? 0,
            time_required: a.time_required ?? "",
            addon_media: a.addon_media ?? a.addonMedia ?? null,
          }))
        : [],
      consentForm: Array.isArray(s.consentForm)
        ? s.consentForm.map((c) => ({
            consent_id: c.consent_id ?? null,
            question: c.question ?? "",
            is_required: c.is_required ?? c.isRequired ?? 0,
          }))
        : [],
    };
  };

  // When packageData changes: initialize the form. If packageData doesn't have sub_packages, fetch details.
  useEffect(() => {
    if (!packageData) {
      setPackageName("");
      setPackageMediaExisting(null);
      setSubPackages([]);
      setFiles({});
      setPreviews({});
      setDetailsLoading(false);
      return;
    }

    // If packageData already contains heavy details, use them
    const hasSubs =
      Array.isArray(packageData.sub_packages) &&
      packageData.sub_packages.length > 0;

    setPackageName(
      packageData.packageName ??
        packageData.package_name ??
        packageData.service_type_name ??
        ""
    );

    setPackageMediaExisting(
      packageData.packageMedia ??
        packageData.package_media ??
        packageData.package_image ??
        packageData.packageImage ??
        null
    );

    // reset local file uploads / previews on open
    setFiles({});
    setPreviews({});

    if (hasSubs) {
      // Normalize server-provided sub_packages
      const subs = (packageData.sub_packages || []).map((s) =>
        normalizeSubFromServer(s)
      );
      setSubPackages(subs);
      setDetailsLoading(false);
      return;
    }

    // If no sub_packages in the passed packageData, fetch details by package_id
    const pid =
      packageData.package_id ?? packageData.packageId ?? packageData.id;
    if (!pid) {
      setSubPackages([]);
      return;
    }

    let cancelled = false;

    async function fetchDetails() {
      try {
        setDetailsLoading(true);
        const resp = await api.get(`/api/admin/getpackagedetails/${pid}`);
        const pkgPayload = resp?.data?.package ?? resp?.data ?? null;
        if (!pkgPayload) {
          if (!cancelled) {
            toast.error("Failed to load package details.");
            setSubPackages([]);
            setDetailsLoading(false);
          }
          return;
        }

        // update package-level fields from details if available
        if (!cancelled) {
          setPackageName(
            pkgPayload.packageName ??
              pkgPayload.package_name ??
              packageData.packageName ??
              packageData.package_name ??
              ""
          );
          setPackageMediaExisting(
            pkgPayload.packageMedia ??
              pkgPayload.package_media ??
              packageData.packageMedia ??
              packageData.package_media ??
              packageData.package_image ??
              null
          );

          const subsRaw = Array.isArray(pkgPayload.sub_packages)
            ? pkgPayload.sub_packages
            : pkgPayload.subPackages ?? [];

          const normalizedSubs = subsRaw.map((s) => normalizeSubFromServer(s));
          setSubPackages(normalizedSubs);
        }
      } catch (err) {
        console.error("Error fetching package details:", err);
        if (!cancelled) toast.error("Failed to fetch package details.");
        if (!cancelled) setSubPackages([]);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [packageData]);

  // Package media change
  const handlePackageMediaChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = `packageMedia_0`;
    setFiles((prev) => ({ ...prev, [key]: file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews((p) => ({ ...p, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removePackageMediaPreview = () => {
    const key = `packageMedia_0`;
    setFiles((prev) => {
      const cp = { ...prev };
      delete cp[key];
      return cp;
    });
    setPreviews((prev) => {
      const cp = { ...prev };
      delete cp[key];
      return cp;
    });
    setPackageMediaExisting(null);
  };

  // Sub-package file handlers
  const handleFileChange = (e, subIndex) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = `itemMedia_0_${subIndex}`;

    setFiles((prev) => ({ ...prev, [key]: file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews((p) => ({ ...p, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removePreview = (subIndex) => {
    const key = `itemMedia_0_${subIndex}`;
    setFiles((prev) => {
      const cp = { ...prev };
      delete cp[key];
      return cp;
    });
    setPreviews((prev) => {
      const cp = { ...prev };
      delete cp[key];
      return cp;
    });
  };

  const handleSubChange = (index, field, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[index] = { ...cp[index], [field]: value };
      return cp;
    });
  };

  const addSubPackage = () => {
    setSubPackages((prev) => [
      ...prev,
      {
        sub_package_id: null,
        item_name: "",
        description: "",
        price: "",
        time_required: "",
        item_media: "",
        preferences: {},
        addons: [],
        consentForm: [],
      },
    ]);
  };

  const removeSubPackage = (index) => {
    setSubPackages((prev) => prev.filter((_, i) => i !== index));
    removePreview(index);
  };

  // Preferences operations (preferences object keyed by title; each value is { is_required, items })
  const addPreferenceGroupToSub = (subIndex, title = "Default") => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const current = cp[subIndex] || {};
      const prefs = { ...(current.preferences || {}) };

      // choose a unique title if not provided
      let base = title;
      let candidate = base;
      let i = 1;
      while (prefs.hasOwnProperty(candidate)) {
        candidate = `${base} ${i++}`;
      }

      prefs[candidate] = {
        is_required: 0,
        items: [
          {
            preference_id: null,
            preference_value: "",
            preference_price: 0,
          },
        ],
      };
      cp[subIndex] = { ...current, preferences: prefs };
      return cp;
    });
  };

  const renamePreferenceGroup = (subIndex, oldKey, newTitle) => {
    const targetRaw = newTitle ?? "";
    const targetTrimmed = targetRaw;

    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      if (!prefs.hasOwnProperty(oldKey)) return cp;

      const newPrefs = {};
      const otherKeys = Object.keys(prefs).filter((k) => k !== oldKey);

      let targetKey = targetTrimmed;
      if (!targetKey) {
        targetKey = oldKey;
      } else {
        if (otherKeys.includes(targetKey) && targetKey !== oldKey) {
          let count = 1;
          while (otherKeys.includes(`${targetKey} ${count}`)) count++;
          targetKey = `${targetKey} ${count}`;
        }
      }

      Object.keys(prefs).forEach((k) => {
        if (k === oldKey) {
          newPrefs[targetKey] = prefs[oldKey];
        } else {
          newPrefs[k] = prefs[k];
        }
      });

      cp[subIndex] = { ...cp[subIndex], preferences: newPrefs };
      return cp;
    });
  };

  const removePreferenceGroupFromSub = (subIndex, groupKey) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      delete prefs[groupKey];
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  const addPreferenceItemToGroup = (subIndex, groupKey) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      prefs[groupKey] = prefs[groupKey] || { is_required: 0, items: [] };
      prefs[groupKey].items = prefs[groupKey].items || [];
      prefs[groupKey].items.push({
        preference_id: null,
        preference_value: "",
        preference_price: 0,
      });
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  const updatePreference = (subIndex, groupKey, prefIndex, field, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      prefs[groupKey] = prefs[groupKey] || { is_required: 0, items: [] };
      prefs[groupKey].items = prefs[groupKey].items || [];
      const cur = prefs[groupKey].items[prefIndex] || {};
      let newVal = value;
      if (field === "preference_price") {
        newVal = value === "" ? "" : Number(value);
      }
      prefs[groupKey].items[prefIndex] = { ...cur, [field]: newVal };
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  const removePreferenceFromGroup = (subIndex, groupKey, prefIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      prefs[groupKey] = prefs[groupKey] || { is_required: 0, items: [] };
      prefs[groupKey].items = (prefs[groupKey].items || []).filter(
        (_, i) => i !== prefIndex
      );
      if (!prefs[groupKey].items || prefs[groupKey].items.length === 0) {
        delete prefs[groupKey];
      }
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  // Set group-level is_required
  const setPreferenceGroupIsRequired = (subIndex, groupKey, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      prefs[groupKey] = prefs[groupKey] || { is_required: 0, items: [] };
      prefs[groupKey].is_required = Number(value) || 0;
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  // Add-on operations (includes time_required)
  const addAddonToSub = (subIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].addons = cp[subIndex].addons || [];
      cp[subIndex].addons.push({
        addon_id: null,
        addon_name: "",
        description: "",
        price: 0,
        time_required: "",
      });
      return cp;
    });
  };

  const updateAddon = (subIndex, addonIndex, field, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].addons = cp[subIndex].addons || [];
      cp[subIndex].addons[addonIndex] = {
        ...cp[subIndex].addons[addonIndex],
        [field]:
          field === "price" ? (value === "" ? "" : Number(value)) : value,
      };
      return cp;
    });
  };

  const removeAddonFromSub = (subIndex, addonIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].addons =
        cp[subIndex].addons?.filter((_, i) => i !== addonIndex) || [];
      return cp;
    });
  };

  // Consent per sub-package operations
  const addConsentToSub = (subIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].consentForm = cp[subIndex].consentForm || [];
      cp[subIndex].consentForm.push({
        consent_id: null,
        question: "",
        is_required: 0,
      });
      return cp;
    });
  };

  const updateSubConsent = (subIndex, consentIndex, field, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].consentForm = cp[subIndex].consentForm || [];
      const cur = cp[subIndex].consentForm[consentIndex] || {};
      cp[subIndex].consentForm[consentIndex] = {
        ...cur,
        [field]: field === "is_required" ? Number(value) : value,
      };
      return cp;
    });
  };

  const removeSubConsent = (subIndex, consentIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].consentForm = (cp[subIndex].consentForm || []).filter(
        (_, i) => i !== consentIndex
      );
      return cp;
    });
  };

  // -------------------------
  // SIMPLE MANUAL VALIDATION
  // -------------------------
  const simpleValidate = () => {
    if (!Array.isArray(subPackages) || subPackages.length === 0) {
      toast.error("At least one sub-package is required.");
      return false;
    }

    for (let s = 0; s < subPackages.length; s++) {
      const sub = subPackages[s] || {};

      if (!sub.item_name || !String(sub.item_name).trim()) {
        toast.error(`Sub-package ${s + 1}: Item Name is required.`);
        return false;
      }

      if (sub.price === "" || sub.price === null || sub.price === undefined) {
        toast.error(`Sub-package ${s + 1}: Price is required.`);
        return false;
      }
      if (isNaN(Number(sub.price))) {
        toast.error(`Sub-package ${s + 1}: Price must be a number.`);
        return false;
      }

      const prefsObj = sub.preferences || {};
      const groupKeys = Object.keys(prefsObj);
      for (let g = 0; g < groupKeys.length; g++) {
        const key = groupKeys[g];
        const group = prefsObj[key] || { is_required: 0, items: [] };
        const items = group.items || [];

        if (Number(group.is_required) === 1 && items.length === 0) {
          toast.error(
            `Sub-package ${
              s + 1
            }, Preference group "${key}": At least one item is required.`
          );
          return false;
        }

        for (let i = 0; i < items.length; i++) {
          const it = items[i] || {};
          if (!String(it.preference_value || "").trim()) {
            toast.error(
              `Sub-package ${s + 1}, Preference group "${key}", item ${
                i + 1
              }: Value is required.`
            );
            return false;
          }
          if (
            it.preference_price !== "" &&
            it.preference_price !== null &&
            it.preference_price !== undefined &&
            isNaN(Number(it.preference_price))
          ) {
            toast.error(
              `Sub-package ${s + 1}, Preference group "${key}", item ${
                i + 1
              }: Price must be a number.`
            );
            return false;
          }
        }
      }

      const addons = sub.addons || [];
      for (let a = 0; a < addons.length; a++) {
        const ad = addons[a] || {};
        if (
          ad.price !== "" &&
          ad.price !== null &&
          ad.price !== undefined &&
          isNaN(Number(ad.price))
        ) {
          toast.error(
            `Sub-package ${s + 1}, Add-on ${a + 1}: Price must be a number.`
          );
          return false;
        }
      }

      const consent = sub.consentForm || [];
      for (let c = 0; c < consent.length; c++) {
        const ci = consent[c] || {};
        if (Number(ci.is_required) === 1 && !String(ci.question || "").trim()) {
          toast.error(
            `Sub-package ${s + 1}, Consent ${
              c + 1
            }: Question is required when marked required.`
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!simpleValidate()) return;

    setLoading(true);

    try {
      const form = new FormData();

      const packagesPayload = [
        {
          package_id: packageData.package_id ?? null,
          packageName: packageName,
          packageMedia: packageMediaExisting ?? null,
          sub_packages: subPackages.map((s, sIndex) => {
            const prefsObj = s.preferences || {};

            const cleanedAddons = (s.addons || []).map((a) => ({
              addon_id: a.addon_id ?? null,
              addon_name: a.addon_name,
              description: a.description,
              price: Number(a.price) || 0,
              time_required: a.time_required ?? "",
            }));

            const cleanedConsent = (s.consentForm || []).map((c) => ({
              consent_id: c.consent_id ?? null,
              question: c.question ?? "",
              is_required: Number(c.is_required) || 0,
            }));

            const cleanedPrefsObj = Object.entries(prefsObj || {}).reduce(
              (acc, [groupTitle, group]) => {
                acc[groupTitle] = {
                  is_required: Number(group?.is_required) || 0,
                  items: (group?.items || []).map((it) => ({
                    preference_id: it.preference_id ?? null,
                    preference_value: it.preference_value ?? "",
                    preference_price:
                      it.preference_price !== "" && it.preference_price != null
                        ? String(it.preference_price)
                        : "0",
                  })),
                };
                return acc;
              },
              {}
            );

            return {
              sub_package_id: s.sub_package_id ?? null,
              item_name: s.item_name,
              description: s.description,
              price: Number(s.price) || 0,
              time_required: s.time_required ?? "",
              preferences: cleanedPrefsObj,
              addons: cleanedAddons,
              consentForm: cleanedConsent,
            };
          }),
        },
      ];

      form.append("packages", JSON.stringify(packagesPayload));

      Object.entries(files).forEach(([key, file]) => {
        form.append(key, file);
      });

      await api.put("/api/admin/editpackage", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Package updated successfully");
      onClose();
      refresh();
    } catch (err) {
      console.error("Error updating package:", err);
      toast.error("Failed to update package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Package"
      className="p-6"
      size="xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-8 max-h-[80vh] overflow-y-auto pr-4"
      >
        {/* show loader for details */}
        {detailsLoading && (
          <div className="py-6 flex justify-center">
            <div className="text-sm text-gray-600">
              Loading package details...
            </div>
          </div>
        )}

        {/* Package Details Section (collapsible) */}
        <CollapsibleSectionCard title="Package Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormInput
              label="Package Name"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Package Media
              </label>
              <FormFileInput
                name="packageMedia_0"
                onChange={handlePackageMediaChange}
              />
              <div className="flex items-center mt-2 space-x-3">
                {previews["packageMedia_0"] ? (
                  <div className="relative w-24 h-20 rounded overflow-hidden shadow-sm border border-gray-200">
                    <img
                      src={previews["packageMedia_0"]}
                      alt="preview"
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={removePackageMediaPreview}
                      className="absolute top-1 right-1 text-white bg-red-600 rounded-full px-2 hover:bg-red-700 transition"
                    >
                      ×
                    </button>
                  </div>
                ) : packageMediaExisting ? (
                  <div className="relative w-24 h-20 rounded overflow-hidden shadow-sm border border-gray-200">
                    <img
                      src={packageMediaExisting}
                      alt="existing package media"
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => setPackageMediaExisting(null)}
                      className="absolute top-1 right-1 text-white bg-red-600 rounded-full px-2 hover:bg-red-700 transition"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No package media
                  </p>
                )}
              </div>
            </div>
          </div>
        </CollapsibleSectionCard>

        {/* Sub-Packages Section */}
        <section className="bg-white">
          <div className="flex justify-between items-center mb-4 pb-1">
            <h3 className="text-lg font-semibold text-gray-800">
              Sub-Packages
            </h3>
            <Button
              type="button"
              size="sm"
              onClick={addSubPackage}
              className="bg-green-50 text-green-700"
            >
              + Add Sub-package
            </Button>
          </div>

          {subPackages.length === 0 && (
            <p className="text-gray-500 italic mb-4">
              No sub-packages available.
            </p>
          )}

          {subPackages.map((sub, sIndex) => (
            <CollapsibleSectionCard
              key={sIndex}
              title={`Sub-Package ${sIndex + 1} — ${
                sub.item_name || "Untitled"
              }`}
              defaultOpen={false}
              className="mb-6"
            >
              <div className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput
                    label="Item Name"
                    value={sub.item_name || ""}
                    onChange={(e) =>
                      handleSubChange(sIndex, "item_name", e.target.value)
                    }
                    required
                  />
                  <FormInput
                    label="Price"
                    type="number"
                    value={sub.price ?? ""}
                    onChange={(e) =>
                      handleSubChange(sIndex, "price", e.target.value)
                    }
                    required
                  />
                </div>

                <FormTextarea
                  label="Description"
                  value={sub.description || ""}
                  onChange={(e) =>
                    handleSubChange(sIndex, "description", e.target.value)
                  }
                  className="mt-4"
                />

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormFileInput
                    label="Upload Media"
                    name={`itemMedia_0_${sIndex}`}
                    onChange={(e) => handleFileChange(e, sIndex)}
                  />
                  <FormInput
                    label="Time Required (in minutes only)"
                    value={sub.time_required ?? ""}
                    type="number"
                    onChange={(e) =>
                      handleSubChange(sIndex, "time_required", e.target.value)
                    }
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {previews[`itemMedia_0_${sIndex}`] ? (
                    <div className="relative w-24 h-20 rounded overflow-hidden border border-gray-300 shadow-sm">
                      <img
                        src={previews[`itemMedia_0_${sIndex}`]}
                        alt="preview"
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removePreview(sIndex)}
                        className="absolute top-1 right-1 text-white bg-red-600 rounded-full px-2 hover:bg-red-700 transition"
                      >
                        ×
                      </button>
                    </div>
                  ) : sub.item_media ? (
                    <div className="w-24 h-20 rounded overflow-hidden border border-gray-300 shadow-sm">
                      <img
                        src={sub.item_media}
                        alt="existing"
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : null}
                </div>

                {/* Preferences Section (collapsible per sub) */}
                <CollapsibleSectionCard
                  title="Preferences (grouped)"
                  defaultOpen={false}
                  className="mt-6"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addPreferenceGroupToSub(sIndex)}
                        >
                          + Add Group
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const firstKey = Object.keys(
                              sub.preferences || {}
                            )[0];
                            if (!firstKey) addPreferenceGroupToSub(sIndex);
                            else addPreferenceItemToGroup(sIndex, firstKey);
                          }}
                        >
                          + Add Preference
                        </Button>
                      </div>
                    </div>

                    {Object.keys(sub.preferences || {}).length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        No preference groups
                      </p>
                    )}

                    {Object.entries(sub.preferences || {}).map(
                      ([groupKey, group], groupIdx) => {
                        const prefs = group?.items || [];
                        const groupIsRequired = Number(group?.is_required ?? 0);
                        return (
                          <div
                            key={`${sIndex}-group-${groupIdx}`}
                            className="mb-4 p-4 border rounded-lg bg-white shadow-sm"
                          >
                            <div className="flex justify-between mb-2 items-center gap-4">
                              <div className="flex-1">
                                <FormInput
                                  label="Group Title"
                                  value={groupKey}
                                  onChange={(e) =>
                                    renamePreferenceGroup(
                                      sIndex,
                                      groupKey,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <div className="flex gap-2 items-end">
                                <div className="w-36">
                                  <FormSelect
                                    label="Required?"
                                    value={String(groupIsRequired ?? "0")}
                                    onChange={(e) =>
                                      setPreferenceGroupIsRequired(
                                        sIndex,
                                        groupKey,
                                        e.target.value
                                      )
                                    }
                                    options={[
                                      { value: "0", label: "Optional (0)" },
                                      { value: "1", label: "Required (1)" },
                                    ]}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() =>
                                      addPreferenceItemToGroup(sIndex, groupKey)
                                    }
                                  >
                                    + Add Item
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="error"
                                    onClick={() =>
                                      removePreferenceGroupFromSub(
                                        sIndex,
                                        groupKey
                                      )
                                    }
                                  >
                                    Remove Group
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {prefs.length === 0 && (
                              <p className="text-xs text-gray-400 italic mb-2">
                                No items in this group
                              </p>
                            )}

                            {prefs.map((pref, pIndex) => (
                              <div key={pIndex} className="mb-2">
                                <div className="grid md:grid-cols-2 gap-3 my-2 items-end">
                                  <FormInput
                                    label={`Value ${pIndex + 1}`}
                                    value={pref.preference_value}
                                    onChange={(e) =>
                                      updatePreference(
                                        sIndex,
                                        groupKey,
                                        pIndex,
                                        "preference_value",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 min-w-[120px]"
                                  />
                                  <FormInput
                                    label="Price"
                                    type="number"
                                    value={pref.preference_price ?? ""}
                                    onChange={(e) =>
                                      updatePreference(
                                        sIndex,
                                        groupKey,
                                        pIndex,
                                        "preference_price",
                                        e.target.value
                                      )
                                    }
                                    className="w-28"
                                  />
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    className=""
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() =>
                                      removePreferenceFromGroup(
                                        sIndex,
                                        groupKey,
                                        pIndex
                                      )
                                    }
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    )}
                  </div>
                </CollapsibleSectionCard>

                {/* Add-ons Section (collapsible per sub) */}
                <CollapsibleSectionCard
                  title="Add-ons"
                  defaultOpen={false}
                  className="mt-6"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-md">Add-ons</h4>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addAddonToSub(sIndex)}
                      >
                        + Add Add-on
                      </Button>
                    </div>

                    {(sub.addons || []).length === 0 && (
                      <p className="text-sm text-gray-500 italic">No add-ons</p>
                    )}

                    {(sub.addons || []).map((addon, aIndex) => (
                      <div
                        key={aIndex}
                        className="mb-3 p-4 border rounded-lg bg-white shadow-sm"
                      >
                        <div className="grid md:grid-cols-2 gap-3">
                          <FormInput
                            label="Add-on Name"
                            value={addon.addon_name}
                            onChange={(e) =>
                              updateAddon(
                                sIndex,
                                aIndex,
                                "addon_name",
                                e.target.value
                              )
                            }
                          />
                          <FormInput
                            label="Price"
                            type="number"
                            value={addon.price ?? ""}
                            onChange={(e) =>
                              updateAddon(
                                sIndex,
                                aIndex,
                                "price",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 mt-3">
                          <FormTextarea
                            label="Description"
                            value={addon.description ?? ""}
                            onChange={(e) =>
                              updateAddon(
                                sIndex,
                                aIndex,
                                "description",
                                e.target.value
                              )
                            }
                          />
                          <FormInput
                            type="number"
                            label="Time Required (in minutes only)"
                            value={addon.time_required ?? ""}
                            onChange={(e) =>
                              updateAddon(
                                sIndex,
                                aIndex,
                                "time_required",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeAddonFromSub(sIndex, aIndex)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSectionCard>

                {/* Consent Form per sub-package (collapsible) */}
                <CollapsibleSectionCard
                  title="Consent Form (this sub-package)"
                  defaultOpen={false}
                  className="mt-6"
                >
                  <div>
                    {(sub.consentForm || []).length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        No consent items
                      </p>
                    )}

                    {(sub.consentForm || []).map((c, idx) => (
                      <div
                        key={idx}
                        className="mb-3 flex gap-3 items-end flex-wrap"
                      >
                        <FormInput
                          label={`Question ${idx + 1}`}
                          value={c.question}
                          onChange={(e) =>
                            updateSubConsent(
                              sIndex,
                              idx,
                              "question",
                              e.target.value
                            )
                          }
                          className="flex-1 min-w-[200px]"
                        />
                        <div className="w-48">
                          <FormSelect
                            label="Required?"
                            name={`consent_is_required_${sIndex}_${idx}`}
                            value={String(c.is_required ?? 0)}
                            onChange={(e) =>
                              updateSubConsent(
                                sIndex,
                                idx,
                                "is_required",
                                Number(e.target.value)
                              )
                            }
                            options={[
                              { value: "0", label: "Optional (0)" },
                              { value: "1", label: "Required (1)" },
                            ]}
                          />
                        </div>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => removeSubConsent(sIndex, idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}

                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addConsentToSub(sIndex)}
                      >
                        + Add Consent Item
                      </Button>
                    </div>
                  </div>
                </CollapsibleSectionCard>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeSubPackage(sIndex)}
                  >
                    Remove Sub-package
                  </Button>
                </div>
              </div>
            </CollapsibleSectionCard>
          ))}
        </section>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || detailsLoading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPackageModal;
