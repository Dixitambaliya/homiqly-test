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
  const [loading, setLoading] = useState(false);

  // helper: normalize incoming preferences into object shape keyed by title or preferences keys
  const normalizePreferencesFromServer = (s) => {
    if (!s) return {};

    // If server already returns `preferences` as object keyed by title => use it
    if (
      s.preferences &&
      typeof s.preferences === "object" &&
      !Array.isArray(s.preferences)
    ) {
      return s.preferences;
    }

    // If server returns an array under preferences => put under default title
    if (Array.isArray(s.preferences)) {
      return { Default: s.preferences };
    }

    // If server returns keys like preferences0, preferences1 -> map them to numeric keys
    const keys = Object.keys(s).filter((k) => /^preferences\d+$/.test(k));
    if (keys.length) {
      return keys.reduce((acc, k, i) => {
        const arr = s[k] || [];
        acc[`Group ${i + 1}`] = arr;
        return acc;
      }, {});
    }

    return {};
  };

  useEffect(() => {
    if (!packageData) {
      setPackageName("");
      setPackageMediaExisting(null);
      setSubPackages([]);
      setFiles({});
      setPreviews({});
      return;
    }

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

    const subs = Array.isArray(packageData.sub_packages)
      ? packageData.sub_packages.map((s) => {
          const prefsObj = normalizePreferencesFromServer(s);

          // normalize each pref item
          const normalizedPrefsObj = Object.entries(prefsObj || {}).reduce(
            (acc, [k, arr]) => {
              acc[k] = (arr || []).map((p) => ({
                preference_id: p.preference_id ?? null,
                preference_value: p.preference_value ?? p.value ?? "",
                preference_price:
                  p.preference_price ??
                  p.price ??
                  safeNumber(p.preferencePrice) ??
                  0,
                is_required:
                  p.is_required ??
                  p.isRequired ??
                  p.preference_is_required ??
                  0,
              }));
              return acc;
            },
            {}
          );

          return {
            sub_package_id: s.sub_package_id ?? null,
            item_name: s.item_name ?? "",
            description: s.description ?? "",
            price: s.price ?? "",
            time_required: s.time_required ?? "",
            item_media: s.item_media ?? "",
            preferences: normalizedPrefsObj, // object keyed by title
            addons: Array.isArray(s.addons)
              ? s.addons.map((a) => ({
                  addon_id: a.addon_id ?? null,
                  addon_name: a.addon_name ?? "",
                  description: a.description ?? "",
                  price: a.price ?? 0,
                  time_required: a.time_required ?? "", // new field
                  addon_media: a.addon_media ?? null,
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
        })
      : [];

    setSubPackages(subs);
    setFiles({});
    setPreviews({});
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

  // Preferences operations (preferences object keyed by title)
  const addPreferenceGroupToSub = (subIndex, title = null) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const current = cp[subIndex] || {};
      const prefs = { ...(current.preferences || {}) };

      // choose a unique title if not provided
      let base = title && title.trim() ? title.trim() : "New Group";
      let candidate = base;
      let i = 1;
      while (prefs.hasOwnProperty(candidate)) {
        candidate = `${base} ${i++}`;
      }

      prefs[candidate] = [
        {
          preference_id: null,
          preference_value: "",
          preference_price: 0,
          is_required: 0,
        },
      ];
      cp[subIndex] = { ...current, preferences: prefs };
      return cp;
    });
  };

  // rename a preference group (change object key) - preserves order
  const renamePreferenceGroup = (subIndex, oldKey, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    const trimmed = newTitle.trim();

    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      if (!prefs.hasOwnProperty(oldKey)) return cp;
      if (trimmed === oldKey) return cp;

      // Build a new object preserving original key order, but swap the key when we hit oldKey
      const newPrefs = {};
      Object.keys(prefs).forEach((k) => {
        if (k === oldKey) {
          // avoid collision: if trimmed already exists and is different, append numeric suffix
          let targetKey = trimmed;
          if (prefs.hasOwnProperty(targetKey) && targetKey !== oldKey) {
            let count = 1;
            while (prefs.hasOwnProperty(`${targetKey} ${count}`)) count++;
            targetKey = `${targetKey} ${count}`;
          }
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
      prefs[groupKey] = prefs[groupKey] || [];
      prefs[groupKey] = [
        ...prefs[groupKey],
        {
          preference_id: null,
          preference_value: "",
          preference_price: 0,
          is_required: 0,
        },
      ];
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  const updatePreference = (subIndex, groupKey, prefIndex, field, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      prefs[groupKey] = prefs[groupKey] || [];
      const cur = prefs[groupKey][prefIndex] || {};
      let newVal = value;
      if (field === "preference_price") {
        newVal = value === "" ? "" : Number(value);
      }
      if (field === "is_required") {
        newVal = Number(value) || 0;
      }
      prefs[groupKey][prefIndex] = { ...cur, [field]: newVal };
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
      return cp;
    });
  };

  const removePreferenceFromGroup = (subIndex, groupKey, prefIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      prefs[groupKey] = (prefs[groupKey] || []).filter(
        (_, i) => i !== prefIndex
      );
      if (!prefs[groupKey] || prefs[groupKey].length === 0) {
        delete prefs[groupKey];
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData();

      // Build packages array (single package edited)
      const packagesPayload = [
        {
          package_id: packageData.package_id ?? null,
          packageName: packageName,
          packageMedia: packageMediaExisting ?? null,
          sub_packages: subPackages.map((s, sIndex) => {
            // preferences: keep object keyed by title (as server expects)
            const prefsObj = s.preferences || {};

            // cleaned addons include time_required
            const cleanedAddons = (s.addons || []).map((a) => ({
              addon_id: a.addon_id ?? null,
              addon_name: a.addon_name,
              description: a.description,
              price: Number(a.price) || 0,
              time_required: a.time_required ?? "",
            }));

            // cleaned consent per sub
            const cleanedConsent = (s.consentForm || []).map((c) => ({
              consent_id: c.consent_id ?? null,
              question: c.question ?? "",
              is_required: Number(c.is_required) || 0,
            }));

            return {
              sub_package_id: s.sub_package_id ?? null,
              item_name: s.item_name,
              description: s.description,
              price: Number(s.price) || 0,
              time_required: s.time_required ?? "",
              // include preferences object keyed by title
              preferences: prefsObj,
              addons: cleanedAddons,
              consentForm: cleanedConsent,
            };
          }),
        },
      ];

      form.append("packages", JSON.stringify(packagesPayload));

      // append files
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
        {/* Package Details Section (collapsible) */}
        <CollapsibleSectionCard title="Package Details" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormInput
              label="Package Name"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
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
                    label="Time Required (e.g. 60 mins)"
                    value={sub.time_required ?? ""}
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
                        {/* add a preference to the first group if exists, otherwise create a group */}
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
                      ([groupKey, prefs], groupIdx) => (
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
                                  removePreferenceGroupFromSub(sIndex, groupKey)
                                }
                              >
                                Remove Group
                              </Button>
                            </div>
                          </div>

                          {(prefs || []).length === 0 && (
                            <p className="text-xs text-gray-400 italic mb-2">
                              No items in this group
                            </p>
                          )}

                          {(prefs || []).map((pref, pIndex) => (
                            <div key={pIndex} className="mb-2">
                              <div className="grid md:grid-cols-3 gap-3 my-2 items-end">
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
                                <div>
                                  <FormSelect
                                    label="Required?"
                                    name={`pref_is_required_${sIndex}_${groupKey}_${pIndex}`}
                                    value={String(pref.is_required ?? 0)}
                                    onChange={(e) =>
                                      updatePreference(
                                        sIndex,
                                        groupKey,
                                        pIndex,
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
                      )
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
                            label="Time Required (e.g. 20 minutes)"
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
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPackageModal;
