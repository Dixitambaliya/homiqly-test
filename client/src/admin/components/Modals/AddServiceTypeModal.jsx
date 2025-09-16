import React, { useState, useEffect } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button, IconButton } from "../../../shared/components/Button";
import { FormInput, FormSelect } from "../../../shared/components/Form";
import {
  FiPlus,
  FiTrash2,
  FiPackage,
  FiStar,
  FiSettings,
  FiGift,
  FiX,
  FiImage,
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
  { id: "addons", label: "Add-ons", icon: FiGift },
  { id: "preferences", label: "Preferences", icon: FiStar },
  { id: "consentForm", label: "Consent Form", icon: FiFolder },
];

const AddServiceTypeModal = ({ isOpen, onClose, isSubmitting, refresh }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);

  // Place consentForm inside packages (no root-level consentForm)
  const [formData, setFormData] = useState({
    serviceId: "",
    serviceCategoryId: "",
    serviceTypeName: "",
    serviceTypeMedia: null,
    packages: [
      {
        sub_packages: [
          {
            item_name: "",
            description: "",
            item_images: null,
            price: "",
            time_required: "",
          },
        ],
        addons: [
          {
            addon_name: "",
            description: "",
            price: "",
          },
        ],
        consentForm: [{ text: "", is_required: "" }],
      },
    ],
    preferences: [{ preference_value: "", preference_price: "" }],
  });

  // Image previews
  const [imagePreview, setImagePreview] = useState(null);
  const [subPackageImagePreviews, setSubPackageImagePreviews] = useState({});

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

  const handleCategoryChange = (e) => {
    const selectedId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      serviceCategoryId: selectedId,
      serviceId: "",
      subCategory: "",
    }));
    const selectedCategory = categories.find(
      (cat) => String(cat?.serviceCategoryId) === String(selectedId)
    );
    setFilteredServices(selectedCategory?.services || []);
    setFilteredSubCategories(selectedCategory?.subCategories || []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        serviceTypeMedia: file,
      }));
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeMainImage = () => {
    setFormData((prev) => ({
      ...prev,
      serviceTypeMedia: null,
    }));
    setImagePreview(null);
  };

  // Sub-packages
  const handleSubPackageChange = (pkgIndex, subIndex, field, value) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages[subIndex][field] = value;
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const handleSubPackageFileChange = (pkgIndex, subIndex, file) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages[subIndex].item_images = file;
    setFormData((prev) => ({ ...prev, packages: updated }));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSubPackageImagePreviews((prev) => ({
          ...prev,
          [`${pkgIndex}_${subIndex}`]: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSubPackageImage = (pkgIndex, subIndex) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages[subIndex].item_images = null;
    setFormData((prev) => ({ ...prev, packages: updated }));
    setSubPackageImagePreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[`${pkgIndex}_${subIndex}`];
      return newPreviews;
    });
  };

  const addSubPackage = (pkgIndex) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages.push({
      item_name: "",
      description: "",
      item_images: null,
      price: "",
      time_required: "",
    });
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const removeSubPackage = (pkgIndex, subIndex) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages.splice(subIndex, 1);
    setFormData((prev) => ({ ...prev, packages: updated }));
    setSubPackageImagePreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[`${pkgIndex}_${subIndex}`];
      return newPreviews;
    });
  };

  // Add-ons
  const handleAddonChange = (pkgIndex, addonIndex, field, value) => {
    const updated = [...formData.packages];
    updated[pkgIndex].addons[addonIndex][field] = value;
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const addAddon = (pkgIndex) => {
    const updated = [...formData.packages];
    updated[pkgIndex].addons.push({
      addon_name: "",
      description: "",
      price: "",
    });
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const removeAddon = (pkgIndex, addonIndex) => {
    const updated = [...formData.packages];
    updated[pkgIndex].addons.splice(addonIndex, 1);
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  // --- Consent form handlers (package-scoped) ---
  const handleConsentFormChange = (pkgIndex, index, field, value) => {
    const updatedPackages = [...formData.packages];
    // ensure array exists
    if (!Array.isArray(updatedPackages[pkgIndex].consentForm)) {
      updatedPackages[pkgIndex].consentForm = [{ text: "", is_required: "" }];
    }
    updatedPackages[pkgIndex].consentForm[index][field] = value;
    setFormData((prev) => ({ ...prev, packages: updatedPackages }));
  };

  const addConsentForm = (pkgIndex) => {
    const updatedPackages = [...formData.packages];
    if (!Array.isArray(updatedPackages[pkgIndex].consentForm)) {
      updatedPackages[pkgIndex].consentForm = [];
    }
    updatedPackages[pkgIndex].consentForm.push({ text: "", is_required: "" });
    setFormData((prev) => ({ ...prev, packages: updatedPackages }));
  };

  const removeConsentForm = (pkgIndex, index) => {
    const updatedPackages = [...formData.packages];
    if (!Array.isArray(updatedPackages[pkgIndex].consentForm)) return;
    updatedPackages[pkgIndex].consentForm.splice(index, 1);
    setFormData((prev) => ({ ...prev, packages: updatedPackages }));
  };

  // Preferences
  const handlePreferenceChange = (index, field, value) => {
    const updated = [...formData.preferences];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, preferences: updated }));
  };

  const addPreference = () => {
    setFormData((prev) => ({
      ...prev,
      preferences: [
        ...prev.preferences,
        { preference_value: "", preference_price: "" },
      ],
    }));
  };

  const removePreference = (index) => {
    setFormData((prev) => ({
      ...prev,
      preferences: prev.preferences.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const validateBasicInfo = () => {
    if (!formData.serviceCategoryId) {
      toast.error("Please select a category");
      return false;
    }
    if (!formData.serviceId) {
      toast.error("Please select a service");
      return false;
    }
    if (!formData.serviceTypeName.trim()) {
      toast.error("Please enter service type name");
      return false;
    }
    if (!formData.serviceTypeMedia) {
      toast.error("Please upload service type image");
      return false;
    }
    return true;
  };

  const validatePackages = () => {
    for (let pkgIndex = 0; pkgIndex < formData.packages.length; pkgIndex++) {
      const pkg = formData.packages[pkgIndex];
      for (let subIndex = 0; subIndex < pkg.sub_packages.length; subIndex++) {
        const sub = pkg.sub_packages[subIndex];
        if (!sub.item_name.trim()) {
          toast.error(`Please enter item name for sub-package ${subIndex + 1}`);
          return false;
        }
        if (!sub.price || parseFloat(sub.price) <= 0) {
          toast.error(
            `Please enter valid price for sub-package ${subIndex + 1}`
          );
          return false;
        }
        if (!sub.time_required.trim()) {
          toast.error(
            `Please enter time required for sub-package ${subIndex + 1}`
          );
          return false;
        }
      }
    }
    return true;
  };

  const validateAddons = () => {
    for (let pkgIndex = 0; pkgIndex < formData.packages.length; pkgIndex++) {
      const pkg = formData.packages[pkgIndex];
      for (let addonIndex = 0; addonIndex < pkg.addons.length; addonIndex++) {
        const addon = pkg.addons[addonIndex];
        if (!addon.addon_name.trim()) {
          toast.error(`Please enter add-on name for add-on ${addonIndex + 1}`);
          return false;
        }
        if (!addon.price || parseFloat(addon.price) <= 0) {
          toast.error(`Please enter valid price for add-on ${addonIndex + 1}`);
          return false;
        }
      }
    }
    return true;
  };

  const validatePreferences = () => {
    for (let index = 0; index < formData.preferences.length; index++) {
      const pref = formData.preferences[index];
      if (!pref.preference_value.trim()) {
        toast.error(`Please enter preference name for preference ${index + 1}`);
        return false;
      }
    }
    return true;
  };

  // Validate consent forms across all packages
  const validateConsentForm = () => {
    for (let pkgIndex = 0; pkgIndex < formData.packages.length; pkgIndex++) {
      const pkg = formData.packages[pkgIndex];
      const consentArr = pkg.consentForm || [];
      for (let index = 0; index < consentArr.length; index++) {
        const consent = consentArr[index];
        if (!consent.text || !consent.text.trim()) {
          toast.error(
            `Consent statement required for package ${pkgIndex + 1}, item ${
              index + 1
            }`
          );
          return false;
        }
        if (consent.is_required === "" || consent.is_required == null) {
          toast.error(
            `Please select required/optional for consent item ${
              index + 1
            } in package ${pkgIndex + 1}`
          );
          return false;
        }
      }
    }
    return true;
  };

  // Extended tab validation
  const isCurrentTabValid = () => {
    switch (activeTab) {
      case "basic":
        return validateBasicInfo();
      case "packages":
        return validatePackages();
      case "addons":
        return validateAddons();
      case "preferences":
        return validatePreferences();
      case "consentForm":
        return validateConsentForm();
      default:
        return false;
    }
  };

  // Extended "canProceedToNext" for Next button
  const canProceedToNext = () => {
    switch (activeTab) {
      case "basic":
        return (
          formData.serviceCategoryId &&
          formData.serviceId &&
          formData.serviceTypeName.trim() &&
          formData.serviceTypeMedia
        );
      case "packages":
        return formData.packages.every((pkg) =>
          pkg.sub_packages.every(
            (sub) =>
              sub.item_name.trim() &&
              sub.price &&
              parseFloat(sub.price) > 0 &&
              sub.time_required.trim()
          )
        );
      case "addons":
        return formData.packages.every((pkg) =>
          pkg.addons.every(
            (addon) =>
              addon.addon_name.trim() &&
              addon.price &&
              parseFloat(addon.price) > 0
          )
        );
      case "preferences":
        return formData.preferences.every((pref) =>
          pref.preference_value.trim()
        );
      case "consentForm":
        return formData.packages.every((pkg) =>
          (pkg.consentForm || []).every(
            (item) => item.text.trim() && item.is_required !== ""
          )
        );
      default:
        return false;
    }
  };

  // Main submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !validateBasicInfo() ||
      !validatePackages() ||
      !validateAddons() ||
      !validatePreferences() ||
      !validateConsentForm()
    ) {
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("serviceId", formData.serviceId);
      formDataToSend.append("serviceCategoryId", formData.serviceCategoryId);
      formDataToSend.append("serviceTypeName", formData.serviceTypeName);
      if (formData.serviceTypeMedia) {
        formDataToSend.append("serviceTypeMedia", formData.serviceTypeMedia);
      }

      // Prepare packages (sub_packages Add-ons logic stays same)
      const cleanedPackages = formData.packages.map((pkg, pkgIndex) => {
        const {
          sub_packages,
          packageMedia,
          addons = [],
          consentForm = [],
          ...rest
        } = pkg;

        if (packageMedia) {
          formDataToSend.append(`packageMedia_${pkgIndex}`, packageMedia);
        }

        const cleanedSubPackages = (sub_packages || []).map((sub, subIndex) => {
          const { item_images, ...subRest } = sub;
          if (item_images) {
            formDataToSend.append(
              `itemMedia_${pkgIndex}_${subIndex}`,
              item_images
            );
          }
          return subRest;
        });

        const cleanedAddons = (addons || []).map((a) => ({
          addon_name: a.addon_name || "",
          description: a.description || "",
          price: a.price || "",
        }));

        // consentForm (kept as-is: array of {text,is_required})
        return {
          ...rest,
          sub_packages: cleanedSubPackages,
          addons: cleanedAddons,
          consentForm: consentForm || [],
        };
      });

      formDataToSend.append("packages", JSON.stringify(cleanedPackages));
      formDataToSend.append(
        "preferences",
        JSON.stringify(formData.preferences)
      );
      // consentForm already included in packages, no top-level consentForm to append

      const response = await api.post(
        "/api/admin/addpackages",
        formDataToSend,
        { headers: { "Content-Type": "multipart/form-data" } }
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

  // Reset all states
  const resetForm = () => {
    setFormData({
      serviceId: "",
      serviceCategoryId: "",
      subCategory: "",
      serviceTypeName: "",
      serviceTypeMedia: null,
      packages: [
        {
          sub_packages: [
            {
              item_name: "",
              description: "",
              item_images: null,
              price: "",
              time_required: "",
            },
          ],
          addons: [
            {
              addon_name: "",
              description: "",
              price: "",
            },
          ],
          consentForm: [{ text: "", is_required: "" }],
        },
      ],
      preferences: [{ preference_value: "", preference_price: "" }],
    });
    setFilteredServices([]);
    setActiveTab(TABS[0].id);
    setImagePreview(null);
    setSubPackageImagePreviews({});
  };

  // Tab navigation logic with consentForm included
  const handleNext = () => {
    if (isCurrentTabValid()) {
      const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
      if (currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1].id);
      }
    }
  };

  const handlePrevious = () => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
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
        {/* Tab Navigation */}
        <div className="flex gap-2 p-6 pb-2 border-b border-gray-100">
          {TABS.map((tab) => (
            <TabButton
              className=""
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
        {/* Content Area */}
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
                      label="Service Type Name"
                      name="serviceTypeName"
                      value={formData.serviceTypeName}
                      onChange={handleInputChange}
                      placeholder="e.g., Bridal Makeup Package"
                      required
                    />
                  </div>
                  <div className="mt-6">
                    <CustomFileInput
                      label="Service Type Image"
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
              <div className="space-y-6">
                {formData.packages.map((pkg, pkgIndex) => (
                  <div key={pkgIndex} className="space-y-6">
                    <SectionCard
                      title={`Package ${pkgIndex + 1} — Sub-Packages`}
                    >
                      <div className="space-y-4">
                        {pkg.sub_packages.map((sub, subIndex) => (
                          <ItemCard
                            key={subIndex}
                            title={`Sub-Package ${subIndex + 1}`}
                            showRemove={pkg.sub_packages.length > 1}
                            onRemove={() =>
                              removeSubPackage(pkgIndex, subIndex)
                            }
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                <FormInput
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
                                  subPackageImagePreviews[
                                    `${pkgIndex}_${subIndex}`
                                  ]
                                }
                                onRemove={() =>
                                  removeSubPackageImage(pkgIndex, subIndex)
                                }
                              />
                            </div>
                          </ItemCard>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addSubPackage(pkgIndex)}
                          icon={<FiPlus />}
                          className="w-full border-dashed"
                        >
                          Add Sub-Package
                        </Button>
                      </div>
                    </SectionCard>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "addons" && (
              <div className="space-y-6">
                {formData.packages.map((pkg, pkgIndex) => (
                  <div key={pkgIndex} className="space-y-6">
                    <SectionCard title={`Package ${pkgIndex + 1} — Add-ons`}>
                      <div className="space-y-4">
                        {pkg.addons.map((addon, addonIndex) => (
                          <ItemCard
                            key={addonIndex}
                            title={`Add-on ${addonIndex + 1}`}
                            showRemove={pkg.addons.length > 1}
                            onRemove={() => removeAddon(pkgIndex, addonIndex)}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <FormInput
                                label="Add-on Name"
                                value={addon.addon_name}
                                onChange={(e) =>
                                  handleAddonChange(
                                    pkgIndex,
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
                          type="button"
                          variant="outline"
                          onClick={() => addAddon(pkgIndex)}
                          icon={<FiPlus />}
                          className="w-full border-dashed"
                        >
                          Add Add-on
                        </Button>
                      </div>
                    </SectionCard>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <SectionCard title="Service Preferences">
                  <div className="space-y-4">
                    {formData.preferences.map((pref, index) => (
                      <ItemCard
                        key={index}
                        title={`Preference ${index + 1}`}
                        showRemove={formData.preferences.length > 1}
                        onRemove={() => removePreference(index)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormInput
                            label="Preference Name"
                            placeholder="e.g., Private Room"
                            value={pref.preference_value}
                            onChange={(e) =>
                              handlePreferenceChange(
                                index,
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
                                index,
                                "preference_price",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </ItemCard>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addPreference}
                      icon={<FiPlus />}
                      className="w-full border-dashed"
                    >
                      Add Preference
                    </Button>
                  </div>
                </SectionCard>
              </div>
            )}
            {activeTab === "consentForm" && (
              <div className="space-y-6">
                {/* Show consent forms grouped by package */}
                {formData.packages.map((pkg, pkgIndex) => (
                  <SectionCard
                    key={pkgIndex}
                    title={`Package ${pkgIndex + 1} — Consent Items`}
                  >
                    <div className="space-y-4">
                      {(pkg.consentForm || []).map((consentItem, index) => (
                        <ItemCard
                          key={index}
                          title={`Consent Item ${index + 1}`}
                          showRemove={(pkg.consentForm || []).length > 1}
                          onRemove={() => removeConsentForm(pkgIndex, index)}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                              label="Consent Statement"
                              placeholder="Enter consent statement"
                              value={consentItem.text}
                              onChange={(e) =>
                                handleConsentFormChange(
                                  pkgIndex,
                                  index,
                                  "text",
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
                                { label: "Required", value: "true" },
                                { label: "Optional", value: "false" },
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

        {/* Footer Actions */}
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
