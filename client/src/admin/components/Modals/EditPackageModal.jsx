import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import {
  FormInput,
  FormTextarea,
  FormFileInput,
  FormSelect, // <-- added import
} from "../../../shared/components/Form";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const EditPackageModal = ({ isOpen, onClose, packageData, refresh }) => {
  // Package-level fields
  const [packageName, setPackageName] = useState("");
  const [packageMediaExisting, setPackageMediaExisting] = useState(null);

  // subPackages: each sub.package has preferences as an OBJECT: { "0": [..], "1":[..] }
  const [subPackages, setSubPackages] = useState([]);
  const [consentForm, setConsentForm] = useState([]);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);

  // helper: normalize incoming preferences into object shape { "0": [...], "1": [...] }
  const normalizePreferencesFromServer = (s) => {
    if (!s) return {};

    if (typeof s.preferences === "object" && !Array.isArray(s.preferences)) {
      return s.preferences;
    }

    if (Array.isArray(s.preferences)) {
      return { 0: s.preferences };
    }

    const keys = Object.keys(s).filter((k) => /^preferences\d+$/.test(k));
    if (keys.length) {
      return keys.reduce((acc, k) => {
        const idx = k.replace(/^preferences/, "");
        acc[idx] = s[k] || [];
        return acc;
      }, {});
    }

    return {};
  };

  useEffect(() => {
    if (!packageData) return;

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

          const normalizedPrefsObj = Object.entries(prefsObj || {}).reduce(
            (acc, [k, arr]) => {
              acc[k] = (arr || []).map((p) => ({
                preference_id: p.preference_id ?? null,
                preference_value: p.preference_value ?? "",
                preference_price: p.preference_price ?? 0,
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
            preferences: normalizedPrefsObj,
            addons: Array.isArray(s.addons)
              ? s.addons.map((a) => ({
                  addon_id: a.addon_id ?? null,
                  addon_name: a.addon_name ?? "",
                  description: a.description ?? "",
                  price: a.price ?? 0,
                  addon_media: a.addon_media ?? null,
                }))
              : [],
          };
        })
      : [];

    setSubPackages(subs);

    setConsentForm(
      Array.isArray(packageData.consentForm)
        ? packageData.consentForm.map((c) => ({
            consent_id: c.consent_id ?? null,
            question: c.question ?? "",
            is_required: c.is_required ?? c.isRequired ?? 0, // keep existing value
          }))
        : []
    );

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
      },
    ]);
  };

  const removeSubPackage = (index) => {
    setSubPackages((prev) => prev.filter((_, i) => i !== index));
    removePreview(index);
  };

  // Preferences operations
  const addPreferenceGroupToSub = (subIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      const prefs = { ...(cp[subIndex].preferences || {}) };
      const keys = Object.keys(prefs)
        .map((k) => (k == null ? -1 : Number(k)))
        .filter((n) => !Number.isNaN(n));
      const next = keys.length ? Math.max(...keys) + 1 : 0;
      prefs[String(next)] = [
        { preference_id: null, preference_value: "", preference_price: 0 },
      ];
      cp[subIndex] = { ...cp[subIndex], preferences: prefs };
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
        { preference_id: null, preference_value: "", preference_price: 0 },
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
      prefs[groupKey][prefIndex] = {
        ...prefs[groupKey][prefIndex],
        [field]: value,
      };
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

  // Add-on operations
  const addAddonToSub = (subIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].addons = cp[subIndex].addons || [];
      cp[subIndex].addons.push({
        addon_id: null,
        addon_name: "",
        description: "",
        price: 0,
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
        [field]: value,
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

  // Consent form operations
  const addConsent = () => {
    setConsentForm((prev) => [
      ...prev,
      { consent_id: null, question: "", is_required: 0 }, // default optional (0)
    ]);
  };

  // updated to allow updating question (default) or any field (e.g., 'is_required')
  const updateConsent = (index, value, field = "question") => {
    setConsentForm((prev) => {
      const cp = [...prev];
      // ensure object exists
      cp[index] = cp[index] || { consent_id: null, question: "", is_required: 0 };
      const val = field === "is_required" ? Number(value) : value;
      cp[index] = { ...cp[index], [field]: val };
      return cp;
    });
  };

  const removeConsent = (index) => {
    setConsentForm((prev) => prev.filter((_, i) => i !== index));
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
          sub_packages: subPackages.map((s) => {
            const prefsObj = s.preferences || {}; // grouped object

            const flattenedPrefsKeys = Object.entries(prefsObj).reduce(
              (acc, [groupKey, arr]) => {
                acc[`preferences${groupKey}`] = (arr || []).map((p) => ({
                  preference_id: p.preference_id ?? null,
                  preference_value: p.preference_value,
                  preference_price: Number(p.preference_price) || 0,
                }));
                return acc;
              },
              {}
            );

            return {
              sub_package_id: s.sub_package_id ?? null,
              item_name: s.item_name,
              description: s.description,
              price: Number(s.price) || 0,
              time_required: s.time_required,
              ...flattenedPrefsKeys,
              addons: (s.addons || []).map((a) => ({
                addon_id: a.addon_id ?? null,
                addon_name: a.addon_name,
                description: a.description,
                price: Number(a.price) || 0,
              })),
            };
          }),
          consentForm: (consentForm || []).map((c) => ({
            consent_id: c.consent_id ?? null,
            question: c.question,
            is_required: c.is_required ?? 0, // keeps numeric 0/1
          })),
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
        {/* Package Details Section */}
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4  pb-1 text-gray-800">
            Package Details
          </h3>

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
        </section>

        {/* Sub-Packages Section */}
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4  pb-1">
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
            <div
              key={sIndex}
              className="mb-6 p-5 border border-gray-300 rounded-xl bg-gray-50 shadow-sm"
            >
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

              <FormFileInput
                label="Upload Media"
                name={`itemMedia_0_${sIndex}`}
                onChange={(e) => handleFileChange(e, sIndex)}
                className="mt-4"
              />

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

              {/* Preferences Section */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-md">
                    Preferences (grouped)
                  </h4>
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
                      onClick={() =>
                        addPreferenceItemToGroup(
                          sIndex,
                          Object.keys(sub.preferences || {})[0] ?? "0"
                        )
                      }
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
                  ([groupKey, prefs]) => (
                    <div
                      key={groupKey}
                      className="mb-4 p-4 border rounded-lg bg-white shadow-sm"
                    >
                      <div className="flex justify-between mb-2 items-center">
                        <span className="font-medium text-sm">
                          Group {groupKey}
                        </span>
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
                        <>
                          <div
                            key={pIndex}
                            className="grid md:grid-cols-2 gap-3 my-2"
                          >
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
                        </>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Add-ons Section */}
              <div className="mt-6">
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
                          updateAddon(sIndex, aIndex, "price", e.target.value)
                        }
                      />
                    </div>
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
                      className="mt-3"
                    />
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
          ))}
        </section>

        {/* Consent Form */}
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4  pb-1">
            <h3 className="text-lg font-semibold text-gray-800">
              Consent Form
            </h3>
            <Button type="button" size="sm" onClick={addConsent}>
              + Add Question
            </Button>
          </div>

          {consentForm.length === 0 && (
            <p className="text-gray-500 italic mb-4">No consent questions</p>
          )}

          {consentForm.map((c, idx) => (
            <div key={idx} className="mb-3 flex gap-3 items-end flex-wrap">
              <FormInput
                label={`Question ${idx + 1}`}
                value={c.question}
                onChange={(e) => updateConsent(idx, e.target.value)} // updates question
                className="flex-1 min-w-[200px]"
              />

              {/* NEW: is_required select (0 = Optional, 1 = Required) */}
              <div className="w-48">
                <FormSelect
                  label="Required?"
                  name={`consent_is_required_${idx}`}
                  value={String(c.is_required ?? 0)}
                  onChange={(e) =>
                    updateConsent(idx, Number(e.target.value), "is_required")
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
                onClick={() => removeConsent(idx)}
              >
                Remove
              </Button>
            </div>
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
