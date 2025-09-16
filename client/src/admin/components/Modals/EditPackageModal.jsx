import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import {
  FormInput,
  FormTextarea,
  FormFileInput,
} from "../../../shared/components/Form";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";

/*
  EditPackageModal (updated)
  - sub_packages now contain preferences & addons (editable per sub-package)
  - consentForm is package-level and editable here
  - file uploads & previews per sub-package retained
*/

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const EditPackageModal = ({ isOpen, onClose, packageData, refresh }) => {
  // Basic package-level fields (best-effort mapping)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeRequired, setTimeRequired] = useState("");
  const [subPackages, setSubPackages] = useState([]);
  const [consentForm, setConsentForm] = useState([]);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);

  // compute total price from sub-packages
  const totalPrice = subPackages.reduce(
    (sum, s) => sum + safeNumber(s.price),
    0
  );

  // initialize state when packageData changes
  useEffect(() => {
    if (!packageData) return;

    // package-level mapping — some responses may use different keys; pick safe options
    setTitle(packageData.package_name || packageData.service_type_name || "");
    setDescription(packageData.description || "");
    setTimeRequired(packageData.total_time || packageData.time_required || "");

    // Ensure deep copy so editing doesn't mutate prop directly
    const subs = Array.isArray(packageData.sub_packages)
      ? packageData.sub_packages.map((s) => ({
          // keep known fields and fallback defaults
          sub_package_id: s.sub_package_id ?? null,
          item_name: s.item_name ?? "",
          description: s.description ?? "",
          price: s.price ?? "",
          time_required: s.time_required ?? "",
          item_media: s.item_media ?? "",
          // preferences & addons are arrays inside each sub-package now
          preferences: Array.isArray(s.preferences)
            ? s.preferences.map((p) => ({
                preference_id: p.preference_id ?? null,
                preference_value: p.preference_value ?? "",
                preference_price: p.preference_price ?? 0,
              }))
            : [],
          addons: Array.isArray(s.addons)
            ? s.addons.map((a) => ({
                addon_id: a.addon_id ?? null,
                addon_name: a.addon_name ?? "",
                description: a.description ?? "",
                price: a.price ?? 0,
                time_required: a.time_required ?? "",
                addon_media: a.addon_media ?? null,
              }))
            : [],
        }))
      : [];

    setSubPackages(subs);

    // consentForm at package-level (array of { consent_id, question })
    setConsentForm(
      Array.isArray(packageData.consentForm)
        ? packageData.consentForm.map((c) => ({
            consent_id: c.consent_id ?? null,
            question: c.question ?? "",
          }))
        : []
    );

    // reset files/previews (we only track newly selected files)
    setFiles({});
    setPreviews({});
  }, [packageData]);

  /* -------------------------
     File handling per sub-package (keeps naming pattern itemMedia_0_<index>)
     ------------------------- */
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

  /* -------------------------
     Sub-package CRUD + nested preferences/addons
     ------------------------- */

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
        preferences: [],
        addons: [],
      },
    ]);
  };

  const removeSubPackage = (index) => {
    setSubPackages((prev) => prev.filter((_, i) => i !== index));
    removePreview(index);
  };

  // Preferences inside a sub-package
  const addPreferenceToSub = (subIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].preferences = cp[subIndex].preferences || [];
      cp[subIndex].preferences.push({
        preference_id: null,
        preference_value: "",
        preference_price: 0,
      });
      return cp;
    });
  };

  const updatePreference = (subIndex, prefIndex, field, value) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].preferences = cp[subIndex].preferences || [];
      cp[subIndex].preferences[prefIndex] = {
        ...cp[subIndex].preferences[prefIndex],
        [field]: value,
      };
      return cp;
    });
  };

  const removePreferenceFromSub = (subIndex, prefIndex) => {
    setSubPackages((prev) => {
      const cp = [...prev];
      cp[subIndex].preferences =
        cp[subIndex].preferences?.filter((_, i) => i !== prefIndex) || [];
      return cp;
    });
  };

  // Add-ons inside a sub-package
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

  /* -------------------------
     Consent form (package-level)
     ------------------------- */
  const addConsent = () => {
    setConsentForm((prev) => [...prev, { consent_id: null, question: "" }]);
  };

  const updateConsent = (index, value) => {
    setConsentForm((prev) => {
      const cp = [...prev];
      cp[index].question = value;
      return cp;
    });
  };

  const removeConsent = (index) => {
    setConsentForm((prev) => prev.filter((_, i) => i !== index));
  };

  /* -------------------------
     Submit - build payload consistent with API
     ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData();

      // Build packages array (API expects packages as an array)
      const packagesPayload = [
        {
          package_id: packageData.package_id ?? null,
          // We keep package-level fields minimal — the server likely prioritizes sub_packages

          sub_packages: subPackages.map((s) => ({
            sub_package_id: s.sub_package_id ?? null,
            item_name: s.item_name,
            description: s.description,
            price: Number(s.price) || 0,
            time_required: s.time_required,
            // nested lists
            preferences: (s.preferences || []).map((p) => ({
              preference_id: p.preference_id ?? null,
              preference_value: p.preference_value,
              preference_price: Number(p.preference_price) || 0,
            })),
            addons: (s.addons || []).map((a) => ({
              addon_id: a.addon_id ?? null,
              addon_name: a.addon_name,
              description: a.description,
              price: Number(a.price) || 0,
              time_required: a.time_required || "",
            })),
          })),
          consentForm: (consentForm || []).map((c) => ({
            consent_id: c.consent_id ?? null,
            question: c.question,
          })),
        },
      ];

      form.append("packages", JSON.stringify(packagesPayload));

      // Attach sub-package images (by the same key pattern you used earlier)
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Package">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[80vh] overflow-auto pr-2"
      >
        {/* Top meta */}

        {/* Sub-packages list */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold">Sub-Packages</h4>
            <Button type="button" size="sm" onClick={addSubPackage}>
              + Add Sub-package
            </Button>
          </div>

          {subPackages.map((sub, sIndex) => (
            <div key={sIndex} className="mb-4 p-3 border rounded bg-gray-50">
              <div className="grid md:grid-cols-2 gap-3">
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
                <FormInput
                  label="Time Required"
                  value={sub.time_required ?? ""}
                  onChange={(e) =>
                    handleSubChange(sIndex, "time_required", e.target.value)
                  }
                />
                <div />
              </div>

              <FormTextarea
                label="Description"
                value={sub.description || ""}
                onChange={(e) =>
                  handleSubChange(sIndex, "description", e.target.value)
                }
              />

              <FormFileInput
                label="Upload Media"
                name={`itemMedia_0_${sIndex}`}
                onChange={(e) => handleFileChange(e, sIndex)}
              />

              {/* preview (newly uploaded) or show existing URL */}
              <div className="mt-2 flex items-center gap-3">
                {previews[`itemMedia_0_${sIndex}`] ? (
                  <div className="relative w-fit">
                    <img
                      src={previews[`itemMedia_0_${sIndex}`]}
                      alt="preview"
                      className="h-20 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removePreview(sIndex)}
                      className="text-xs text-red-500 absolute -top-1 -right-1 bg-white px-2 rounded-full shadow"
                    >
                      ×
                    </button>
                  </div>
                ) : sub.item_media ? (
                  <div className="relative w-fit">
                    <img
                      src={sub.item_media}
                      alt="existing"
                      className="h-20 rounded"
                    />
                  </div>
                ) : null}
              </div>

              {/* Preferences for this sub-package */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-sm font-semibold">Preferences</h5>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addPreferenceToSub(sIndex)}
                  >
                    + Add Preference
                  </Button>
                </div>

                {(sub.preferences || []).length > 0 ? (
                  (sub.preferences || []).map((pref, pIndex) => (
                    <div key={pIndex} className="flex gap-2 items-end mb-2">
                      <FormInput
                        label={`Preference ${pIndex + 1}`}
                        value={pref.preference_value}
                        onChange={(e) =>
                          updatePreference(
                            sIndex,
                            pIndex,
                            "preference_value",
                            e.target.value
                          )
                        }
                      />
                      <FormInput
                        label="Price"
                        type="number"
                        value={pref.preference_price ?? ""}
                        onChange={(e) =>
                          updatePreference(
                            sIndex,
                            pIndex,
                            "preference_price",
                            e.target.value
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removePreferenceFromSub(sIndex, pIndex)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No preferences
                  </div>
                )}
              </div>

              {/* Add-ons for this sub-package */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-sm font-semibold">Add-ons</h5>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addAddonToSub(sIndex)}
                  >
                    + Add Add-on
                  </Button>
                </div>

                {(sub.addons || []).length > 0 ? (
                  (sub.addons || []).map((addon, aIndex) => (
                    <div
                      key={aIndex}
                      className="mb-2 p-2 border rounded bg-white"
                    >
                      <div className="grid md:grid-cols-2 gap-2">
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
                        <FormInput
                          label="Time Required"
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
                        <div />
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
                      />
                      <div className="flex justify-end pt-2">
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
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">No add-ons</div>
                )}
              </div>

              <div className="flex justify-end pt-2">
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
        </div>

        {/* Consent Form (package-level) */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold">Consent Form</h4>
            <Button type="button" size="sm" onClick={addConsent}>
              + Add Question
            </Button>
          </div>

          {consentForm.length > 0 ? (
            consentForm.map((c, idx) => (
              <div key={idx} className="mb-2 flex gap-2 items-center">
                <FormInput
                  label={`Question ${idx + 1}`}
                  value={c.question}
                  onChange={(e) => updateConsent(idx, e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeConsent(idx)}
                >
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              No consent questions
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPackageModal;
