import React, { useState, useEffect } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button, IconButton } from "../../../shared/components/Button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "../../../shared/components/Form";
import {
  FiPlus,
  FiTrash2,
  FiPackage,
  FiSettings,
  FiFolder,
} from "react-icons/fi";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";
import { TabButton } from "../../../shared/components/Button/TabButton";
import { SectionCard } from "../../../shared/components/Card/SectionCard";
import { CustomFileInput } from "../../../shared/components/CustomFileInput";
import { ItemCard } from "../../../shared/components/Card/ItemCard";

const TABS = [
  { id: "basic", label: "Basic Info", icon: FiSettings },
  { id: "packages", label: "Packages", icon: FiPackage },
  { id: "consentForm", label: "Consent Form", icon: FiFolder },
];

// Updated: makeEmptySubPackage uses preferencesGroups keyed object
const makeEmptySubPackage = () => ({
  item_name: "",
  description: "",
  item_images: null,
  price: "",
  time_required: "",
  preferencesGroups: {
    preferences0: [
      {
        preference_value: "",
        preference_price: "",
        is_required: "0",
      },
    ],
  },
  addons: [
    {
      addon_name: "",
      description: "",
      price: "",
    },
  ],
});

const makeEmptyPackage = () => ({
  sub_packages: [makeEmptySubPackage()],
  consentForm: [
    {
      question: "",
      is_required: "",
    },
  ],
});

const AddServiceTypeModal = ({ isOpen, onClose, isSubmitting, refresh }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [categories, setCategories] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [formData, setFormData] = useState({
    serviceId: "",
    serviceCategoryId: "",
    packageName: "", // NEW - text input in Basic tab
    packageMedia_0: null, // NEW - file for main package media
    packages: [makeEmptyPackage()],
  });

  // Image previews keyed by `${pkgIndex}_${subIndex}`
  const [subPackageImagePreviews, setSubPackageImagePreviews] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const handleFileChange = (fileOrEvent) => {
    // If CustomFileInput provides an event, support both signatures:
    const file = fileOrEvent?.target?.files
      ? fileOrEvent.target.files[0]
      : fileOrEvent;

    setFormData((prev) => ({ ...prev, packageMedia_0: file || null }));

    if (file) {
      // create preview URL (remember to revoke if you create multiple - simple approach here)
      const url = typeof file === "string" ? file : URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const removeMainImage = () => {
    setFormData((prev) => ({ ...prev, packageMedia_0: null }));
    if (imagePreview && typeof imagePreview === "string") {
      // revoke only if it was a blob URL created above (safe to call)
      try {
        URL.revokeObjectURL(imagePreview);
      } catch (e) {}
    }
    setImagePreview(null);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/api/service/getadminservices");
        setCategories(res.data.services || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Helpers
  const rebuildPreviewsFromPackages = (packages) => {
    const newPreviews = {};
    packages.forEach((pkg, pIdx) => {
      (pkg.sub_packages || []).forEach((sub, sIdx) => {
        const key = `${pIdx}_${sIdx}`;
        if (sub && sub.item_images) {
          if (typeof sub.item_images === "string")
            newPreviews[key] = sub.item_images;
          else newPreviews[key] = URL.createObjectURL(sub.item_images);
        }
      });
    });
    setSubPackageImagePreviews(newPreviews);
  };

  // Basic Handlers
  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      serviceCategoryId: selectedId,
      serviceId: "",
    }));
    const selectedCategory = categories.find(
      (cat) => String(cat?.serviceCategoryId) === String(selectedId)
    );
    setFilteredServices(selectedCategory?.services || []);
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Sub-package handlers (use indices)
  const handleSubPackageChange = (pkgIndex, subIndex, field, value) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) =>
          sIdx === subIndex ? { ...sub, [field]: value } : sub
        );
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const handleSubPackageFileChange = (pkgIndex, subIndex, file) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) =>
          sIdx === subIndex ? { ...sub, item_images: file } : sub
        );
        return { ...pkg, sub_packages };
      });
      rebuildPreviewsFromPackages(packages);
      return { ...prev, packages };
    });
  };

  const removeSubPackageImage = (pkgIndex, subIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) =>
          sIdx === subIndex ? { ...sub, item_images: null } : sub
        );
        return { ...pkg, sub_packages };
      });
      rebuildPreviewsFromPackages(packages);
      return { ...prev, packages };
    });
  };

  const addSubPackage = (pkgIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) =>
        pIdx !== pkgIndex
          ? pkg
          : {
              ...pkg,
              sub_packages: [...pkg.sub_packages, makeEmptySubPackage()],
            }
      );
      rebuildPreviewsFromPackages(packages);
      return { ...prev, packages };
    });
  };

  const removeSubPackage = (pkgIndex, subIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const filtered = pkg.sub_packages.filter((_, i) => i !== subIndex);
        return {
          ...pkg,
          sub_packages: filtered.length ? filtered : [makeEmptySubPackage()],
        };
      });
      rebuildPreviewsFromPackages(packages);
      return { ...prev, packages };
    });
  };

  const handlePreferenceChange = (
    pkgIndex,
    subIndex,
    groupKey,
    prefIndex,
    field,
    value
  ) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const preferencesGroups = {
            ...sub.preferencesGroups,
            [groupKey]: sub.preferencesGroups[groupKey].map((pref, pfIdx) =>
              pfIdx === prefIndex ? { ...pref, [field]: value } : pref
            ),
          };
          return { ...sub, preferencesGroups };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  // Add preference item to an existing group
  const addPreference = (pkgIndex, subIndex, groupKey) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) =>
          sIdx === subIndex
            ? {
                ...sub,
                preferencesGroups: {
                  ...sub.preferencesGroups,
                  [groupKey]: [
                    ...sub.preferencesGroups[groupKey],
                    {
                      preference_value: "",
                      preference_price: "",
                      is_required: "0",
                    },
                  ],
                },
              }
            : sub
        );
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  // Remove preference item from a group
  const removePreference = (pkgIndex, subIndex, groupKey, prefIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const filtered = sub.preferencesGroups[groupKey].filter(
            (_, i) => i !== prefIndex
          );
          return {
            ...sub,
            preferencesGroups: {
              ...sub.preferencesGroups,
              [groupKey]: filtered.length
                ? filtered
                : [
                    {
                      preference_value: "",
                      preference_price: "",
                      is_required: "0",
                    },
                  ],
            },
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  // Add a new preference group
  const addPreferenceGroup = (pkgIndex, subIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;

          // Find max preferences key index
          const existingKeys = Object.keys(sub.preferencesGroups);
          let maxIndex = -1;
          existingKeys.forEach((key) => {
            const match = key.match(/^preferences(\d+)$/);
            if (match) {
              const idx = parseInt(match[1], 10);
              if (idx > maxIndex) maxIndex = idx;
            }
          });

          const newKey = `preferences${maxIndex + 1}`;

          return {
            ...sub,
            preferencesGroups: {
              ...sub.preferencesGroups,
              [newKey]: [
                {
                  preference_value: "",
                  preference_price: "",
                  is_required: "0",
                },
              ],
            },
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const removePreferenceGroup = (pkgIndex, subIndex, groupKey) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const { [groupKey]: removedGroup, ...restGroups } =
            sub.preferencesGroups;
          const newGroups = { ...restGroups };

          // Ensure at least one empty group remains
          if (Object.keys(newGroups).length === 0) {
            newGroups.preferences0 = [
              { preference_value: "", preference_price: "", is_required: "0" },
            ];
          }

          return { ...sub, preferencesGroups: newGroups };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };
  // Add-ons handlers (index-based)
  const handleAddonChange = (pkgIndex, subIndex, addonIndex, field, value) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const addons = sub.addons.map((addon, aIdx) =>
            aIdx === addonIndex ? { ...addon, [field]: value } : addon
          );
          return { ...sub, addons };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const addAddon = (pkgIndex, subIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) =>
          sIdx === subIndex
            ? {
                ...sub,
                addons: [
                  ...sub.addons,
                  { addon_name: "", description: "", price: "" },
                ],
              }
            : sub
        );
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const removeAddon = (pkgIndex, subIndex, addonIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const filtered = sub.addons.filter((_, i) => i !== addonIndex);
          return {
            ...sub,
            addons: filtered.length
              ? filtered
              : [{ addon_name: "", description: "", price: "" }],
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  // ConsentForm handlers (index-based)
  const handleConsentFormChange = (pkgIndex, consentIndex, field, value) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const consentForm = pkg.consentForm.map((c, cIdx) =>
          cIdx === consentIndex ? { ...c, [field]: value } : c
        );
        return { ...pkg, consentForm };
      });
      return { ...prev, packages };
    });
  };

  const addConsentForm = (pkgIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) =>
        pIdx !== pkgIndex
          ? pkg
          : {
              ...pkg,
              consentForm: [
                ...pkg.consentForm,
                { question: "", is_required: "" },
              ],
            }
      );
      return { ...prev, packages };
    });
  };

  const removeConsentForm = (pkgIndex, consentIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const filtered = pkg.consentForm.filter((_, i) => i !== consentIndex);
        return {
          ...pkg,
          consentForm: filtered.length
            ? filtered
            : [{ question: "", is_required: "" }],
        };
      });
      return { ...prev, packages };
    });
  };

  // Validation functions
  const validateBasicInfo = () => {
    if (!formData.serviceCategoryId) {
      toast.error("Please select a category");
      return false;
    }
    if (!formData.serviceId) {
      toast.error("Please select a service");
      return false;
    }
    return true;
  };

  const validatePackages = () => {
    // minimal validation: ensure each sub-package has a non-empty item_name
    for (let pkgIndex = 0; pkgIndex < formData.packages.length; pkgIndex++) {
      const pkg = formData.packages[pkgIndex];
      for (let s = 0; s < pkg.sub_packages.length; s++) {
        if (
          !pkg.sub_packages[s].item_name ||
          !pkg.sub_packages[s].item_name.trim()
        ) {
          return false;
        }
      }
    }
    return true;
  };

  const validateConsentForm = () => {
    return true;
  };

  const isCurrentTabValid = () => {
    switch (activeTab) {
      case "basic":
        return validateBasicInfo();
      case "packages":
        return validatePackages();
      case "consentForm":
        return validateConsentForm();
      default:
        return true;
    }
  };

  const canProceedToNext = () => {
    switch (activeTab) {
      case "basic":
        return formData.serviceCategoryId && formData.serviceId;
      case "packages":
        return validatePackages();
      case "consentForm":
        return validateConsentForm();
      default:
        return true;
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateBasicInfo()) return;

    if (!validatePackages()) {
      // Find first missing item_name for error message
      let msg = "Please fill required fields in packages (e.g. item names).";
      outer: for (
        let pkgIndex = 0;
        pkgIndex < formData.packages.length;
        pkgIndex++
      ) {
        const pkg = formData.packages[pkgIndex];
        for (let s = 0; s < pkg.sub_packages.length; s++) {
          if (
            !pkg.sub_packages[s].item_name ||
            !pkg.sub_packages[s].item_name.trim()
          ) {
            msg = `Item name required for package ${
              pkgIndex + 1
            }, sub-package ${s + 1}`;
            break outer;
          }
        }
      }
      toast.error(msg);
      return;
    }

    if (!validateConsentForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // append top-level scalar fields (service ids) as before
      if (formData.serviceId !== undefined) {
        formDataToSend.append("serviceId", String(formData.serviceId));
      }
      if (formData.serviceCategoryId !== undefined) {
        formDataToSend.append(
          "serviceCategoryId",
          String(formData.serviceCategoryId)
        );
      }

      // NOTE: Removed top-level packageName and packageMedia_0 appends here.
      // We will move them into each package below (files appended using package-indexed keys).

      const cleanedPackages = (formData.packages || []).map((pkg, pkgIndex) => {
        // allow per-package fields; keep packageMedia variable if pkg has it
        const {
          sub_packages = [],
          packageMedia, // if the package itself holds a file
          consentForm = [],
          ...rest
        } = pkg;

        // If this package has a packageMedia file (pkg.packageMedia), append it with indexed key
        if (packageMedia) {
          formDataToSend.append(`packageMedia_${pkgIndex}`, packageMedia);
        } else if (pkgIndex === 0 && formData.packageMedia_0) {
          // If user previously used top-level packageMedia_0, move that file into package 0
          formDataToSend.append(
            `packageMedia_${pkgIndex}`,
            formData.packageMedia_0
          );
        }

        // Clean & transform each sub-package
        const cleanedSubPackages = (sub_packages || []).map((sub, subIndex) => {
          const {
            item_images,
            preferencesGroups = {}, // source data
            addons = [],
            ...subRest
          } = sub;

          // Append item-level media file
          if (item_images) {
            formDataToSend.append(
              `itemMedia_${pkgIndex}_${subIndex}`,
              item_images
            );
          }

          // Flatten preferences groups into subpackage
          const flattenedPrefs = Object.entries(preferencesGroups || {}).reduce(
            (acc, [groupKey, prefs]) => {
              acc[groupKey] = (prefs || []).map((pref) => ({
                preference_value: pref.preference_value || "",
                preference_price: pref.preference_price || "",
                is_required: pref.is_required || "0",
              }));
              return acc;
            },
            {}
          );

          // Clean addons
          const cleanedAddons = (addons || []).map((addon) => ({
            addon_name: addon.addon_name || "",
            description: addon.description || "",
            price: addon.price || "",
          }));

          // Return cleaned sub-package with flattened preferences
          return {
            ...subRest,
            addons: cleanedAddons,
            ...flattenedPrefs, // directly spread preferences0, preferences1, etc.
          };
        });

        // Determine packageName to include inside this package object
        // Prefer pkg.packageName (if you later allow per-package name), otherwise fallback to top-level formData.packageName
        const packageNameValue = rest.packageName ?? formData.packageName ?? "";

        return {
          ...rest,
          packageName: packageNameValue,
          sub_packages: cleanedSubPackages,
          consentForm,
        };
      });

      // append packages JSON (packages now contain packageName per package)
      formDataToSend.append("packages", JSON.stringify(cleanedPackages));

      // POST
      const response = await api.post(
        "/api/admin/addpackages",
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      toast.success(
        response.data.message || "Service type submitted successfully"
      );
      resetForm();
      onClose();
      refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit service type"
      );
      console.error(
        "Error submitting service type:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceId: "",
      serviceCategoryId: "",
      packageName: "",
      packageMedia_0: null,
      packages: [makeEmptyPackage()],
    });
    setFilteredServices([]);
    setActiveTab(TABS[0].id);
    setSubPackageImagePreviews({});
  };

  const handleNext = () => {
    if (isCurrentTabValid()) {
      const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
      if (currentIndex < TABS.length - 1)
        setActiveTab(TABS[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1].id);
  };

  // Render
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Add New Service Type"
      size="xl"
      className="!max-w-5xl"
    >
      <div className="flex flex-col h-[80vh]">
        <div className="flex gap-2 p-6 pb-2 border-b border-gray-100">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
            {activeTab === "basic" && (
              <div className="space-y-6">
                <SectionCard title="Service Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormSelect
                      label="Category"
                      name="serviceCategoryId"
                      value={formData.serviceCategoryId || ""}
                      onChange={handleCategoryChange}
                      placeholder="Select a category"
                      options={categories.map((cat) => ({
                        label: cat.categoryName || "",
                        value: String(cat.serviceCategoryId),
                      }))}
                      required
                    />
                    <FormSelect
                      label="Service"
                      name="serviceId"
                      value={formData.serviceId || ""}
                      onChange={handleInputChange}
                      placeholder="Select a service"
                      options={filteredServices
                        .filter((s) => s?.serviceId)
                        .map((service) => ({
                          label: service?.serviceName || "",
                          value: String(service?.serviceId),
                        }))}
                      required
                    />
                  </div>
                  <div className="mt-6">
                    <FormInput
                      label="packageName Type Name"
                      name="packageName"
                      value={formData.packageName}
                      onChange={handleInputChange}
                      placeholder="e.g., Bridal Makeup Package"
                      required
                    />
                  </div>
                  <div className="mt-6">
                    <CustomFileInput
                      label="PackageMedia"
                      onChange={handleFileChange}
                      preview={imagePreview}
                      onRemove={removeMainImage}
                      required
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === "packages" && (
              <div className="space-y-10">
                {formData.packages.map((pkg, pkgIndex) => (
                  <React.Fragment key={pkgIndex}>
                    {pkg.sub_packages.map((sub, subIndex) => (
                      <SectionCard
                        key={subIndex}
                        title={`Sub-Package ${subIndex + 1}`}
                        className="mb-6"
                      >
                        <div className="flex justify-end mb-4">
                          {pkg.sub_packages.length > 1 && (
                            <IconButton
                              icon={<FiTrash2 />}
                              variant="lightDanger"
                              onClick={() =>
                                removeSubPackage(pkgIndex, subIndex)
                              }
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <FormInput
                            label="Item Name"
                            value={sub.item_name}
                            onChange={(e) =>
                              handleSubPackageChange(
                                pkgIndex,
                                subIndex,
                                "item_name",
                                e.target.value
                              )
                            }
                            required
                          />
                          <FormInput
                            label="Price"
                            type="number"
                            value={sub.price}
                            onChange={(e) =>
                              handleSubPackageChange(
                                pkgIndex,
                                subIndex,
                                "price",
                                e.target.value
                              )
                            }
                            required
                          />
                          <FormInput
                            label="Time Required"
                            value={sub.time_required}
                            onChange={(e) =>
                              handleSubPackageChange(
                                pkgIndex,
                                subIndex,
                                "time_required",
                                e.target.value
                              )
                            }
                            required
                          />
                          <div className="md:col-span-2">
                            <FormTextarea
                              rows={4}
                              label="Description (Optional)"
                              value={sub.description}
                              onChange={(e) =>
                                handleSubPackageChange(
                                  pkgIndex,
                                  subIndex,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <CustomFileInput
                            label="Image"
                            onChange={(e) =>
                              handleSubPackageFileChange(
                                pkgIndex,
                                subIndex,
                                e.target.files[0]
                              )
                            }
                            preview={
                              subPackageImagePreviews[`${pkgIndex}_${subIndex}`]
                            }
                            onRemove={() =>
                              removeSubPackageImage(pkgIndex, subIndex)
                            }
                          />
                        </div>

                        {/* Render Preference Groups */}
                        {Object.entries(sub.preferencesGroups).map(
                          ([groupKey, prefs]) => (
                            <SectionCard
                              key={groupKey}
                              title={
                                <div className="flex justify-between items-center">
                                  <span>{`Preference Group ${groupKey}`}</span>
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    variant="lightDanger"
                                    size="sm"
                                    onClick={() =>
                                      removePreferenceGroup(
                                        pkgIndex,
                                        subIndex,
                                        groupKey
                                      )
                                    }
                                    aria-label={`Delete preference group ${groupKey}`}
                                  />
                                </div>
                              }
                              className="mb-4"
                            >
                              {prefs.map((pref, prefIndex) => (
                                <ItemCard
                                  key={prefIndex}
                                  title={`Preference ${prefIndex + 1}`}
                                  showRemove={prefs.length > 1}
                                  onRemove={() =>
                                    removePreference(
                                      pkgIndex,
                                      subIndex,
                                      groupKey,
                                      prefIndex
                                    )
                                  }
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput
                                      label="Preference Name"
                                      placeholder="e.g., Private Room"
                                      value={pref.preference_value}
                                      onChange={(e) =>
                                        handlePreferenceChange(
                                          pkgIndex,
                                          subIndex,
                                          groupKey,
                                          prefIndex,
                                          "preference_value",
                                          e.target.value
                                        )
                                      }
                                      required
                                    />
                                    <FormInput
                                      label="Additional Price (Optional)"
                                      placeholder="0"
                                      type="number"
                                      value={pref.preference_price}
                                      onChange={(e) =>
                                        handlePreferenceChange(
                                          pkgIndex,
                                          subIndex,
                                          groupKey,
                                          prefIndex,
                                          "preference_price",
                                          e.target.value
                                        )
                                      }
                                    />
                                    <FormSelect
                                      label="Required?"
                                      value={pref.is_required}
                                      onChange={(e) =>
                                        handlePreferenceChange(
                                          pkgIndex,
                                          subIndex,
                                          groupKey,
                                          prefIndex,
                                          "is_required",
                                          e.target.value
                                        )
                                      }
                                      options={[
                                        { label: "Optional", value: "0" },
                                        { label: "Required", value: "1" },
                                      ]}
                                      placeholder="Select option"
                                    />
                                  </div>
                                </ItemCard>
                              ))}
                              {/* Button to add preference item to this group */}
                              <Button
                                variant="outline"
                                icon={<FiPlus />}
                                className="w-full border-dashed mt-2"
                                onClick={() =>
                                  addPreference(pkgIndex, subIndex, groupKey)
                                }
                                type="button"
                              >
                                Add Preference (to {groupKey})
                              </Button>
                            </SectionCard>
                          )
                        )}

                        {/* Button to add a new preference group */}
                        <Button
                          variant="outline"
                          icon={<FiPlus />}
                          className="w-full border-dashed mt-4"
                          onClick={() => addPreferenceGroup(pkgIndex, subIndex)}
                          type="button"
                        >
                          Add New Preference Group
                        </Button>

                        {/* Add-ons Section */}
                        <SectionCard title="Add-ons" className="mt-4">
                          {sub.addons.map((addon, addonIndex) => (
                            <ItemCard
                              key={addonIndex}
                              title={`Add-on ${addonIndex + 1}`}
                              showRemove={sub.addons.length > 1}
                              onRemove={() =>
                                removeAddon(pkgIndex, subIndex, addonIndex)
                              }
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormInput
                                  label="Add-on Name"
                                  value={addon.addon_name}
                                  onChange={(e) =>
                                    handleAddonChange(
                                      pkgIndex,
                                      subIndex,
                                      addonIndex,
                                      "addon_name",
                                      e.target.value
                                    )
                                  }
                                  required
                                />
                                <FormInput
                                  label="Price"
                                  type="number"
                                  value={addon.price}
                                  onChange={(e) =>
                                    handleAddonChange(
                                      pkgIndex,
                                      subIndex,
                                      addonIndex,
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  required
                                />
                                <div className="md:col-span-2 lg:col-span-1">
                                  <FormInput
                                    label="Description (Optional)"
                                    value={addon.description}
                                    onChange={(e) =>
                                      handleAddonChange(
                                        pkgIndex,
                                        subIndex,
                                        addonIndex,
                                        "description",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </ItemCard>
                          ))}
                          <Button
                            variant="outline"
                            icon={<FiPlus />}
                            className="w-full border-dashed mt-2"
                            onClick={() => addAddon(pkgIndex, subIndex)}
                            type="button"
                          >
                            Add Add-on
                          </Button>
                        </SectionCard>
                      </SectionCard>
                    ))}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        icon={<FiPlus />}
                        className="w-full border-dashed"
                        onClick={() => addSubPackage(pkgIndex)}
                        type="button"
                      >
                        Add Sub-Package
                      </Button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}

            {activeTab === "consentForm" && (
              <div className="space-y-6">
                {formData.packages.map((pkg, pkgIndex) => (
                  <SectionCard
                    key={pkgIndex}
                    title={`Package ${pkgIndex + 1} — Consent Form Items`}
                  >
                    <div className="space-y-4">
                      {pkg.consentForm.map((consentItem, index) => (
                        <ItemCard
                          key={index}
                          title={`Consent Item ${index + 1}`}
                          showRemove={pkg.consentForm.length > 1}
                          onRemove={() => removeConsentForm(pkgIndex, index)}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                              label="Consent Statement"
                              placeholder="Enter consent statement"
                              value={consentItem.question}
                              onChange={(e) =>
                                handleConsentFormChange(
                                  pkgIndex,
                                  index,
                                  "question",
                                  e.target.value
                                )
                              }
                              required
                            />
                            <FormSelect
                              label="Required?"
                              value={consentItem.is_required}
                              onChange={(e) =>
                                handleConsentFormChange(
                                  pkgIndex,
                                  index,
                                  "is_required",
                                  e.target.value
                                )
                              }
                              options={[
                                { label: "Required", value: "1" },
                                { label: "Optional", value: "0" },
                              ]}
                              placeholder="Select option"
                              required
                            />
                          </div>
                        </ItemCard>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addConsentForm(pkgIndex)}
                        icon={<FiPlus />}
                        className="w-full border-dashed"
                      >
                        Add Consent Item
                      </Button>
                    </div>
                  </SectionCard>
                ))}
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-2">
            {activeTab !== TABS[0].id && (
              <Button type="button" variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
            {activeTab !== TABS[TABS.length - 1].id && (
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                disabled={!canProceedToNext()}
              >
                Next
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || isSubmitting}
              isLoading={loading || isSubmitting}
              onClick={handleSubmit}
            >
              {loading ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddServiceTypeModal;
