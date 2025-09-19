import React, { useState, useEffect } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button, IconButton } from "../../../shared/components/Button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
} from "../../../shared/components/Form";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";
import { CustomFileInput } from "../../../shared/components/CustomFileInput";
import ItemCard from "../../../shared/components/Card/ItemCard";
import { CollapsibleSectionCard } from "../../../shared/components/Card/CollapsibleSectionCard";

const makeEmptyPreferenceItem = () => ({
  preference_id: undefined,
  preference_value: "",
  preference_price: "",
  is_required: "0",
});
const makeEmptyPreferenceGroup = (title = "") => ({
  title,
  items: [makeEmptyPreferenceItem()],
});

const makeEmptySubPackage = () => ({
  item_name: "",
  description: "",
  item_images: null,
  price: "",
  time_required: "",
  // preferences as array of groups (user-supplied titles)
  preferences: [makeEmptyPreferenceGroup("Default")],
  addons: [
    {
      addon_name: "",
      description: "",
      price: "",
      time_required: "",
    },
  ],
  // <-- consent form now lives per sub-package
  consentForm: [
    {
      question: "",
      is_required: "0",
    },
  ],
});

const makeEmptyPackage = () => ({
  sub_packages: [makeEmptySubPackage()],
  // package-level consent removed (consent per sub-package now)
});

const AddServiceTypeModal = ({ isOpen, onClose, isSubmitting, refresh }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [formData, setFormData] = useState({
    serviceId: "",
    serviceCategoryId: "",
    packageName: "",
    packageMedia_0: null,
    packages: [makeEmptyPackage()],
  });

  const [subPackageImagePreviews, setSubPackageImagePreviews] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [showPackageDetails, setShowPackageDetails] = useState(false);
  const [isPackageLocked, setIsPackageLocked] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/api/service/getcategorywithservices");
        console.log(res.data.services);
        setCategories(res.data.services || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

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
    setSubPackageImagePreviews((prev) => {
      // revoke old blob urls to avoid leaks
      Object.values(prev || {}).forEach((url) => {
        try {
          if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
        } catch (e) {}
      });
      return newPreviews;
    });
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

  // Sub-package handlers
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

  // Preferences: groups stored as array under each sub-package
  const handlePrefGroupTitleChange = (
    pkgIndex,
    subIndex,
    groupIndex,
    value
  ) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const preferences = sub.preferences.map((g, gi) =>
            gi === groupIndex ? { ...g, title: value } : g
          );
          return { ...sub, preferences };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const addPreferenceGroup = (pkgIndex, subIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          return {
            ...sub,
            preferences: [
              ...(sub.preferences || []),
              makeEmptyPreferenceGroup(""),
            ],
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const removePreferenceGroup = (pkgIndex, subIndex, groupIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const filtered = (sub.preferences || []).filter(
            (_, i) => i !== groupIndex
          );
          return {
            ...sub,
            preferences: filtered.length
              ? filtered
              : [makeEmptyPreferenceGroup("Default")],
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const handlePreferenceChange = (
    pkgIndex,
    subIndex,
    groupIndex,
    prefIndex,
    field,
    value
  ) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const preferences = sub.preferences.map((g, gi) => {
            if (gi !== groupIndex) return g;
            const items = g.items.map((it, ii) =>
              ii === prefIndex ? { ...it, [field]: value } : it
            );
            return { ...g, items };
          });
          return { ...sub, preferences };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const addPreferenceItem = (pkgIndex, subIndex, groupIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const preferences = sub.preferences.map((g, gi) =>
            gi === groupIndex
              ? { ...g, items: [...g.items, makeEmptyPreferenceItem()] }
              : g
          );
          return { ...sub, preferences };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const removePreferenceItem = (pkgIndex, subIndex, groupIndex, prefIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const preferences = sub.preferences.map((g, gi) => {
            if (gi !== groupIndex) return g;
            const filtered = g.items.filter((_, i) => i !== prefIndex);
            return {
              ...g,
              items: filtered.length ? filtered : [makeEmptyPreferenceItem()],
            };
          });
          return { ...sub, preferences };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  // Add-ons handlers
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
                  {
                    addon_name: "",
                    description: "",
                    price: "",
                    time_required: "",
                  },
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
              : [
                  {
                    addon_name: "",
                    description: "",
                    price: "",
                    time_required: "",
                  },
                ],
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  // --- New: Consent handlers scoped to a specific sub-package ---
  const handleSubConsentChange = (
    pkgIndex,
    subIndex,
    consentIndex,
    field,
    value
  ) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const consentForm = sub.consentForm.map((c, cIdx) =>
            cIdx === consentIndex ? { ...c, [field]: value } : c
          );
          return { ...sub, consentForm };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const addSubConsentForm = (pkgIndex, subIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          return {
            ...sub,
            consentForm: [
              ...(sub.consentForm || []),
              { question: "", is_required: "0" },
            ],
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const removeSubConsentForm = (pkgIndex, subIndex, consentIndex) => {
    setFormData((prev) => {
      const packages = prev.packages.map((pkg, pIdx) => {
        if (pIdx !== pkgIndex) return pkg;
        const sub_packages = pkg.sub_packages.map((sub, sIdx) => {
          if (sIdx !== subIndex) return sub;
          const filtered = (sub.consentForm || []).filter(
            (_, i) => i !== consentIndex
          );
          return {
            ...sub,
            consentForm: filtered.length
              ? filtered
              : [{ question: "", is_required: "0" }],
          };
        });
        return { ...pkg, sub_packages };
      });
      return { ...prev, packages };
    });
  };

  const handleFileChange = (fileOrEvent) => {
    const file = fileOrEvent?.target?.files
      ? fileOrEvent.target.files[0]
      : fileOrEvent;
    setFormData((prev) => ({ ...prev, packageMedia_0: file || null }));
    if (file) {
      const url = typeof file === "string" ? file : URL.createObjectURL(file);
      setImagePreview(url);
    } else setImagePreview(null);
  };

  const removeMainImage = () => {
    setFormData((prev) => ({ ...prev, packageMedia_0: null }));
    if (imagePreview && typeof imagePreview === "string") {
      try {
        URL.revokeObjectURL(imagePreview);
      } catch (e) {}
    }
    setImagePreview(null);
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
    setSubPackageImagePreviews({});
    setImagePreview(null);
    setShowPackageDetails(false);
  };

  // -------------------------
  // SIMPLE MANUAL VALIDATION
  // -------------------------
  // returns true if valid, otherwise shows toast.error and returns false
  const simpleValidate = () => {
    // 1) Top-level checks
    if (!formData.serviceCategoryId) {
      toast.error("Please select a category.");
      return false;
    }
    if (!formData.serviceId) {
      toast.error("Please select a service.");
      return false;
    }

    // if user chose to show package details, require packageName
    if (showPackageDetails && !formData.packageName?.trim()) {
      toast.error("Please enter a package name.");
      return false;
    }

    // 2) Packages -> sub-packages checks
    for (let p = 0; p < (formData.packages || []).length; p++) {
      const pkg = formData.packages[p] || {};
      const subs = pkg.sub_packages || [];
      for (let s = 0; s < subs.length; s++) {
        const sub = subs[s] || {};

        // item_name required
        if (!sub.item_name || !String(sub.item_name).trim()) {
          toast.error(`Sub-package ${s + 1}: Item Name is required.`);
          return false;
        }

        if (
          !sub.item_images ||
          sub.item_images === null ||
          sub.item_images === undefined
        ) {
          toast.error(`subpackage Image is required`);
          return false;
        }

        // price required and numeric
        if (sub.price === "" || sub.price === null || sub.price === undefined) {
          toast.error(`Sub-package ${s + 1}: Price is required.`);
          return false;
        }
        if (isNaN(Number(sub.price))) {
          toast.error(`Sub-package ${s + 1}: Price must be a number.`);
          return false;
        }

        // Preferences: each preference item should have a value
        const prefs = sub.preferences || [];
        for (let g = 0; g < prefs.length; g++) {
          const group = prefs[g] || {};
          const items = group.items || [];
          if (items.length === 0) {
            // allow empty group but warn
            // you can change this to require at least one item
            continue;
          }
          for (let i = 0; i < items.length; i++) {
            const it = items[i] || {};
            if (!String(it.preference_value || "").trim()) {
              toast.error(
                `Sub-package ${s + 1}, Preference group ${g + 1}, item ${
                  i + 1
                }: Value is required.`
              );
              return false;
            }
            if (
              it.preference_price !== "" &&
              it.preference_price !== null &&
              isNaN(Number(it.preference_price))
            ) {
              toast.error(
                `Sub-package ${s + 1}, Preference group ${g + 1}, item ${
                  i + 1
                }: Price must be a number.`
              );
              return false;
            }
          }
        }

        // Consent: if marked required (is_required === "1"), question must be present
        const consent = sub.consentForm || [];
        for (let c = 0; c < consent.length; c++) {
          const ci = consent[c] || {};
          if (
            String(ci.is_required) === "1" &&
            !String(ci.question || "").trim()
          ) {
            toast.error(
              `Sub-package ${s + 1}, Consent ${
                c + 1
              }: Question is required when marked required.`
            );
            return false;
          }
        }
      }
    }

    // passed all checks
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run the simple validator first
    if (!simpleValidate()) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("serviceId", String(formData.serviceId));
      fd.append("serviceCategoryId", String(formData.serviceCategoryId));

      // If top-level package media provided, include as packageMedia_0
      if (formData.packageMedia_0)
        fd.append("packageMedia_0", formData.packageMedia_0);

      // Build cleaned packages and append item files
      const cleanedPackages = formData.packages.map((pkg, pkgIndex) => {
        const cleanedSub = (pkg.sub_packages || []).map((sub, subIndex) => {
          // append item image file if present
          if (sub.item_images)
            fd.append(`itemMedia_${pkgIndex}_${subIndex}`, sub.item_images);

          // transform preferences array->object keyed by title for backend
          const prefsObj = (sub.preferences || []).reduce((acc, group) => {
            const key =
              group.title && group.title.trim()
                ? group.title.trim()
                : `preferences${Math.random().toString(36).slice(2, 7)}`;
            acc[key] = (group.items || []).map((it) => ({
              preference_id: it.preference_id,
              preference_value: it.preference_value || "",
              preference_price: it.preference_price || "",
              is_required: Number(it.is_required) || 0,
            }));
            return acc;
          }, {});

          // cleaned addons
          const cleanedAddons = (sub.addons || []).map((a) => ({
            addon_name: a.addon_name || "",
            description: a.description || "",
            price: a.price || "",
            time_required: a.time_required || "",
          }));

          // cleaned consent (now per sub-package)
          const cleanedConsent = (sub.consentForm || []).map((c) => ({
            question: c.question || "",
            is_required: Number(c.is_required) || 0,
          }));

          return {
            item_name: sub.item_name || "",
            description: sub.description || "",
            price: sub.price || "",
            time_required: sub.time_required || "",
            addons: cleanedAddons,
            preferences: prefsObj,
            consentForm: cleanedConsent,
          };
        });

        return {
          packageName: pkg.packageName || formData.packageName || "",
          sub_packages: cleanedSub,
        };
      });

      fd.append("packages", JSON.stringify(cleanedPackages));

      const response = await api.post("/api/admin/addpackages", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
      console.error(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex-1 min-h-0 overflow-y-auto pb-8">
          <form onSubmit={handleSubmit}>
            <CollapsibleSectionCard
              defaultOpen={true}
              title="Service Information"
            >
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
                />
                <FormSelect
                  label="Service"
                  name="serviceId"
                  className=""
                  value={formData.serviceId || ""}
                  onChange={(e) => {
                    handleInputChange(e); // keep your old behavior

                    const selectedService = filteredServices.find(
                      (s) => String(s.serviceId) === e.target.value
                    );

                    if (selectedService) {
                      if (selectedService.hasValidPackage) {
                        setShowPackageDetails(true); // force ON
                        setIsPackageLocked(true); // lock checkbox
                      } else {
                        setShowPackageDetails(false); // reset OFF
                        setIsPackageLocked(false); // unlock checkbox
                      }
                    }
                  }}
                  placeholder="Select a service"
                  options={filteredServices
                    .filter((s) => s?.serviceId)
                    .map((service) => ({
                      label: service?.serviceName || "",
                      value: String(service?.serviceId),
                    }))}
                />
              </div>

              <div className="mt-6">
                <FormCheckbox
                  label="You want to add Package?"
                  name="togglePackageFields"
                  checked={showPackageDetails}
                  disabled={isPackageLocked}
                  onChange={(e) => setShowPackageDetails(e.target.checked)}
                />
              </div>

              {showPackageDetails && (
                <>
                  <div className="mt-6">
                    <FormInput
                      label="packageName Type Name"
                      name="packageName"
                      value={formData.packageName}
                      onChange={handleInputChange}
                      placeholder="e.g., Bridal Makeup Package"
                    />
                  </div>
                  <div className="mt-6">
                    <CustomFileInput
                      label="PackageMedia"
                      onChange={handleFileChange}
                      preview={imagePreview}
                      onRemove={removeMainImage}
                    />
                  </div>
                </>
              )}
            </CollapsibleSectionCard>

            <div className="space-y-8 mt-6">
              {formData.packages.map((pkg, pkgIndex) => (
                <React.Fragment key={pkgIndex}>
                  {pkg.sub_packages.map((sub, subIndex) => (
                    <CollapsibleSectionCard
                      key={subIndex}
                      title={`Sub-Package ${subIndex + 1}`}
                      className="mb-6"
                    >
                      <div className="flex justify-end mb-4">
                        {pkg.sub_packages.length > 1 && (
                          <IconButton
                            icon={<FiTrash2 />}
                            variant="lightDanger"
                            onClick={() => removeSubPackage(pkgIndex, subIndex)}
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
                        />

                        <div className="md:col-span-2">
                          <FormTextarea
                            rows={4}
                            label="Description"
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
                                size="sm"
                                onClick={() =>
                                  addPreferenceGroup(pkgIndex, subIndex)
                                }
                              >
                                + Add Group
                              </Button>

                              {/* Add a preference to the first group if exists, otherwise create a group */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const firstGroup = (sub.preferences || [])[0];
                                  if (!firstGroup)
                                    addPreferenceGroup(pkgIndex, subIndex);
                                  else addPreferenceItem(pkgIndex, subIndex, 0);
                                }}
                              >
                                + Add Preference
                              </Button>
                            </div>
                          </div>

                          {(sub.preferences || []).length === 0 && (
                            <p className="text-sm text-gray-500 italic">
                              No preference groups
                            </p>
                          )}

                          {(sub.preferences || []).map((group, groupIndex) => (
                            <div
                              key={`${subIndex}-group-${groupIndex}`}
                              className="mb-4 p-4 border rounded-lg bg-white shadow-sm"
                            >
                              <div className="flex justify-between mb-2 items-center gap-4">
                                <div className="flex-1">
                                  <FormInput
                                    label="Group Title"
                                    value={group.title}
                                    onChange={(e) =>
                                      handlePrefGroupTitleChange(
                                        pkgIndex,
                                        subIndex,
                                        groupIndex,
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() =>
                                      addPreferenceItem(
                                        pkgIndex,
                                        subIndex,
                                        groupIndex
                                      )
                                    }
                                  >
                                    + Add Item
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="error"
                                    onClick={() =>
                                      removePreferenceGroup(
                                        pkgIndex,
                                        subIndex,
                                        groupIndex
                                      )
                                    }
                                  >
                                    Remove Group
                                  </Button>
                                </div>
                              </div>

                              {(group.items || []).length === 0 && (
                                <p className="text-xs text-gray-400 italic mb-2">
                                  No items in this group
                                </p>
                              )}

                              {(group.items || []).map((pref, prefIndex) => (
                                <div key={prefIndex} className="mb-2">
                                  <div className="grid md:grid-cols-3 gap-3 my-2 items-end">
                                    <FormInput
                                      label={`Value ${prefIndex + 1}`}
                                      value={pref.preference_value}
                                      onChange={(e) =>
                                        handlePreferenceChange(
                                          pkgIndex,
                                          subIndex,
                                          groupIndex,
                                          prefIndex,
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
                                        handlePreferenceChange(
                                          pkgIndex,
                                          subIndex,
                                          groupIndex,
                                          prefIndex,
                                          "preference_price",
                                          e.target.value
                                        )
                                      }
                                      className="w-28"
                                    />
                                    <div>
                                      <FormSelect
                                        label="Required?"
                                        name={`pref_is_required_${pkgIndex}_${subIndex}_${groupIndex}_${prefIndex}`}
                                        value={String(pref.is_required ?? 0)}
                                        onChange={(e) =>
                                          handlePreferenceChange(
                                            pkgIndex,
                                            subIndex,
                                            groupIndex,
                                            prefIndex,
                                            "is_required",
                                            e.target.value
                                          )
                                        }
                                        options={[
                                          { value: "0", label: "Optional" },
                                          { value: "1", label: "Required" },
                                        ]}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() =>
                                        removePreferenceItem(
                                          pkgIndex,
                                          subIndex,
                                          groupIndex,
                                          prefIndex
                                        )
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSectionCard>

                      <Button
                        variant="outline"
                        icon={<FiPlus />}
                        className="w-full border-dashed mt-4"
                        onClick={() => addPreferenceGroup(pkgIndex, subIndex)}
                      >
                        Add New Preference Group
                      </Button>

                      {/* Add-ons Section */}
                      <CollapsibleSectionCard title="Add-ons" className="mt-4 ">
                        {sub.addons.map((addon, addonIndex) => (
                          <ItemCard
                            key={addonIndex}
                            title={`Add-on ${addonIndex + 1}`}
                            showRemove={sub.addons.length > 1}
                            onRemove={() =>
                              removeAddon(pkgIndex, subIndex, addonIndex)
                            }
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2  gap-4 ">
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
                              />
                              <FormInput
                                label="Description "
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
                              <FormInput
                                label="Time Required "
                                value={addon.time_required}
                                onChange={(e) =>
                                  handleAddonChange(
                                    pkgIndex,
                                    subIndex,
                                    addonIndex,
                                    "time_required",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </ItemCard>
                        ))}
                        <Button
                          variant="outline"
                          icon={<FiPlus />}
                          className="w-full border-dashed mt-2"
                          onClick={() => addAddon(pkgIndex, subIndex)}
                        >
                          Add Add-on
                        </Button>
                      </CollapsibleSectionCard>

                      {/* Consent Form per sub-package */}
                      <CollapsibleSectionCard
                        title="Consent Form"
                        className="mt-4"
                      >
                        <div className="space-y-4 ">
                          {(sub.consentForm || []).map((consentItem, index) => (
                            <ItemCard
                              key={index}
                              title={`Consent Item ${index + 1}`}
                              showRemove={sub.consentForm.length > 1}
                              onRemove={() =>
                                removeSubConsentForm(pkgIndex, subIndex, index)
                              }
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                  label="Consent Statement"
                                  placeholder="Enter consent statement"
                                  value={consentItem.question}
                                  onChange={(e) =>
                                    handleSubConsentChange(
                                      pkgIndex,
                                      subIndex,
                                      index,
                                      "question",
                                      e.target.value
                                    )
                                  }
                                />
                                <FormSelect
                                  label="Required?"
                                  value={consentItem.is_required}
                                  onChange={(e) =>
                                    handleSubConsentChange(
                                      pkgIndex,
                                      subIndex,
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
                                />
                              </div>
                            </ItemCard>
                          ))}

                          <Button
                            variant="outline"
                            onClick={() =>
                              addSubConsentForm(pkgIndex, subIndex)
                            }
                            icon={<FiPlus />}
                            className="w-full border-dashed"
                          >
                            Add Consent Item
                          </Button>
                        </div>
                      </CollapsibleSectionCard>
                    </CollapsibleSectionCard>
                  ))}

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      icon={<FiPlus />}
                      className="w-full border-dashed"
                      onClick={() => addSubPackage(pkgIndex)}
                    >
                      Add Sub-Package
                    </Button>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* package-level consent removed — consent now per sub-package */}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-3">
            <Button
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
              {loading ? "Submitting..." : "Submit "}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddServiceTypeModal;
