import React, { useState, useEffect } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button, IconButton } from "../../../shared/components/Button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormFileInput,
} from "../../../shared/components/Form";
import { FiPlus, FiTrash2 } from "react-icons/fi";
// import api from "../../lib/axiosConfig";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";

const AddServiceTypeModal = ({ isOpen, onClose, isSubmitting, refresh }) => {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    serviceId: "",
    serviceCategoryId: "",
    serviceTypeName: "",
    serviceTypeMedia: null,
    packages: [
      {
        package_name: "",
        description: "",
        total_price: "",
        total_time: "",
        sub_packages: [
          {
            item_name: "",
            description: "",
            item_images: null,
            price: "",
            time_required: "",
          },
        ],
      },
    ],
    preferences: [{ preference_value: "" }],
  });

  const [categories, setCategories] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/api/service/getadminservices");
        // console.log("Fetched Categories:", res.data.services);
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
      serviceId: "", // reset service
    }));

    const selectedCategory = categories.find(
      (cat) =>
        String(cat?.services?.[0]?.serviceCategoryId) === String(selectedId)
    );

    setFilteredServices(selectedCategory?.services || []);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      serviceTypeMedia: e.target.files[0],
    }));
  };

  const handlePackageChange = (index, field, value) => {
    const updated = [...formData.packages];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const handleSubPackageChange = (pkgIndex, subIndex, field, value) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages[subIndex][field] = value;
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const handleSubPackageFileChange = (pkgIndex, subIndex, file) => {
    const updated = [...formData.packages];
    updated[pkgIndex].sub_packages[subIndex].item_images = file;
    setFormData((prev) => ({ ...prev, packages: updated }));
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
  };

  const addPackage = () => {
    setFormData((prev) => ({
      ...prev,
      packages: [
        ...prev.packages,
        {
          package_name: "",
          description: "",
          total_price: "",
          total_time: "",
          sub_packages: [
            {
              item_name: "",
              description: "",
              item_images: null,
              price: "",
              time_required: "",
            },
          ],
        },
      ],
    }));
  };

  const removePackage = (index) => {
    if (formData.packages.length > 1) {
      const updated = [...formData.packages];
      updated.splice(index, 1);
      setFormData((prev) => ({
        ...prev,
        packages: updated,
      }));
    }
  };

  const handlePackageFileChange = (index, file) => {
    const updated = [...formData.packages];
    updated[index].packageMedia = file;
    setFormData((prev) => ({ ...prev, packages: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // ⏳ Start loading

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("serviceId", formData.serviceId);
      formDataToSend.append("serviceCategoryId", formData.serviceCategoryId);
      formDataToSend.append("serviceTypeName", formData.serviceTypeName);

      if (formData.serviceTypeMedia) {
        formDataToSend.append("serviceTypeMedia", formData.serviceTypeMedia);
      }

      // Deep clone packages and remove images
      const cleanedPackages = formData.packages.map((pkg, pkgIndex) => {
        const { sub_packages, packageMedia, ...rest } = pkg;

        // Append package media
        if (pkg.packageMedia) {
          formDataToSend.append(`packageMedia_${pkgIndex}`, pkg.packageMedia);
        }

        // Handle sub-packages
        const cleanedSubPackages = sub_packages.map((sub, subIndex) => {
          const { item_images, ...subRest } = sub;

          if (item_images) {
            formDataToSend.append(`itemMedia_${subIndex}`, item_images);
          }

          return subRest; // exclude image
        });

        return {
          ...rest,
          sub_packages: cleanedSubPackages,
        };
      });

      // Append cleaned packages JSON
      formDataToSend.append("packages", JSON.stringify(cleanedPackages));

      formDataToSend.append(
        "preferences",
        JSON.stringify(formData.preferences)
      );

      const response = await api.post(
        "/api/admin/addpackages",
        formDataToSend,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("Success:", response.data);
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
      setLoading(false); // ✅ Done
    }
  };

  const resetForm = () => {
    setFormData({
      serviceId: "",
      serviceCategoryId: "",
      serviceTypeName: "",
      serviceTypeMedia: null,
      packages: [
        {
          package_name: "",
          description: "",
          total_price: "",
          total_time: "",
          sub_packages: [
            {
              item_name: "",
              description: "",
              // item_images: null,
              price: "",
              time_required: "",
            },
          ],
        },
      ],
      preferences: [{ preference_value: "" }],
    });
    setFilteredServices([]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Add New Service Type"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormSelect
            label="Category"
            name="serviceCategoryId"
            value={formData.serviceCategoryId || ""}
            onChange={handleCategoryChange}
            placeholder="Select a category"
            options={categories
              .filter((cat) => cat?.services?.length > 0) // ensure category has services
              .map((cat) => ({
                label: cat.categoryName || "",
                value: String(cat.services[0].serviceCategoryId), // 💡 take from first service
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
                label: service?.title || "",
                value: String(service?.serviceId),
              }))}
            required
          />

          <FormInput
            label="Service Type Name"
            name="serviceTypeName"
            value={formData.serviceTypeName}
            onChange={handleInputChange}
            placeholder="e.g., Bridal Makeup Package"
            required
          />

          <FormFileInput
            label="Service Type Image"
            name="serviceTypeMedia"
            accept="image/*"
            onChange={handleFileChange}
            required
            showPreview
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Packages*
            </label>
            <div className="space-y-4">
              {formData.packages.map((pkg, pkgIndex) => (
                <div
                  key={pkgIndex}
                  className="p-3 border border-gray-200 rounded-md bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium">
                      Package {pkgIndex + 1}
                    </h5>
                    {formData.packages.length > 1 && (
                      <IconButton
                        variant="lightDanger"
                        icon={<FiTrash2 />}
                        onClick={() => removePackage(pkgIndex)}
                      ></IconButton>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput
                      label="Package Name"
                      value={pkg.package_name}
                      onChange={(e) =>
                        handlePackageChange(
                          pkgIndex,
                          "package_name",
                          e.target.value
                        )
                      }
                      required
                    />
                    <FormInput
                      label="Description"
                      value={pkg.description}
                      onChange={(e) =>
                        handlePackageChange(
                          pkgIndex,
                          "description",
                          e.target.value
                        )
                      }
                    />
                    <FormInput
                      label="Price ($)"
                      type="number"
                      value={pkg.total_price}
                      onChange={(e) =>
                        handlePackageChange(
                          pkgIndex,
                          "total_price",
                          e.target.value
                        )
                      }
                      required
                    />
                    <FormInput
                      label="Time Required"
                      value={pkg.total_time}
                      onChange={(e) =>
                        handlePackageChange(
                          pkgIndex,
                          "total_time",
                          e.target.value
                        )
                      }
                      required
                    />
                    <FormFileInput
                      label="Package Image"
                      accept="image/*"
                      onChange={(e) =>
                        handlePackageFileChange(pkgIndex, e.target.files[0])
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <h6 className="text-sm font-semibold mb-2">Sub-Packages</h6>
                    {pkg.sub_packages.map((sub, subIndex) => (
                      <div
                        key={subIndex}
                        className="mb-3 p-2 border rounded bg-white"
                      >
                        <div className="flex justify-between items-center">
                          <h6 className="text-xs font-medium">
                            Sub-Package {subIndex + 1}
                          </h6>
                          {pkg.sub_packages.length > 1 && (
                            <IconButton
                              variant="lightDanger"
                              icon={<FiTrash2 />}
                              onClick={() =>
                                removeSubPackage(pkgIndex, subIndex)
                              }
                            ></IconButton>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <FormInput
                            label="item_name"
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
                          />
                          <FormFileInput
                            label="Image"
                            accept="image/*"
                            onChange={(e) =>
                              handleSubPackageFileChange(
                                pkgIndex,
                                subIndex,
                                e.target.files[0]
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSubPackage(pkgIndex)}
                      icon={<FiPlus className="mr-1" />}
                    >
                      Add Sub-Package
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPackage}
                icon={<FiPlus className="mr-1" />}
              >
                Add Another Package
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferences
            </label>
            <div className="space-y-3">
              {formData.preferences.map((pref, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <FormInput
                    placeholder="Enter preference (e.g., Private Room)"
                    value={pref.preference_value}
                    onChange={(e) => {
                      const updated = [...formData.preferences];
                      updated[index].preference_value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        preferences: updated,
                      }));
                    }}
                    required
                  />
                  {formData.preferences.length > 1 && (
                    <IconButton
                      variant="lightDanger"
                      icon={<FiTrash2 />}
                      type="button"
                      onClick={() => {
                        const updated = formData.preferences.filter(
                          (_, i) => i !== index
                        );
                        setFormData((prev) => ({
                          ...prev,
                          preferences: updated,
                        }));
                      }}
                    ></IconButton>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    preferences: [
                      ...prev.preferences,
                      { preference_value: "" },
                    ],
                  }))
                }
                icon={<FiPlus className="mr-1" />}
              >
                Add Preference
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
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
          >
            {loading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddServiceTypeModal;
