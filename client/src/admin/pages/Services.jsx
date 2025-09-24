import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import { FiPlus, FiTrash2, FiRefreshCw, FiX } from "react-icons/fi";
import { FaPen } from "react-icons/fa6";
import CreatableSelect from "react-select/creatable";
import Select from "react-select";

import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { Button, IconButton } from "../../shared/components/Button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "../../shared/components/Form";
import { ServiceFilterModal } from "../components/Modals/ServiceFilterModal";
import { CustomFileInput } from "../../shared/components/CustomFileInput";

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]); // API categories contain subCategoryTypes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modal state
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [serviceFilters, setServiceFilters] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterMode, setFilterMode] = useState("add"); // or 'edit'

  // selection for edit
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // service form state
  const [serviceFormData, setServiceFormData] = useState({
    serviceName: "",
    categoryName: "",
    serviceDescription: "",
    serviceImage: null,
    serviceFilter: "", // 👈 add this
  });

  // category form state now includes subCategories (array of strings)
  const [categoryFormData, setCategoryFormData] = useState({
    categoryName: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // services
      const servicesResponse = await api.get("/api/service/getadminservices");
      setServices(servicesResponse.data.services || []);

      // categories (includes subCategoryTypes)
      const categoriesResponse = await api.get(
        "/api/service/getservicecategories"
      );
      setCategories(categoriesResponse.data.categories || []);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching services data:", err);
      setError("Failed to load services");
      setLoading(false);
    }
  };

  // Fetch filters
  const fetchServiceFilters = async () => {
    try {
      const res = await api.get("/api/service/getservicefilter"); // your endpoint
      setServiceFilters(res.data || []);
    } catch (err) {
      toast.error("Failed to load service filters");
    }
  };
  useEffect(() => {
    fetchServiceFilters();
  }, []);

  // Build react-select options for subcategories from existing categories (unique)
  const buildSubCategoryOptions = () => {
    const names = [];
    (categories || []).forEach((cat) => {
      if (Array.isArray(cat.subCategoryTypes)) {
        cat.subCategoryTypes.forEach((s) => {
          // depending on API shape: s may be { subCategory } or string -- handle both
          const name = s && (s.subCategory || s.subCategory || s);
          if (name && !names.includes(name)) names.push(name);
        });
      }
    });
    return names.map((n) => ({ value: n, label: n }));
  };

  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setServiceFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleServiceImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setServiceFormData((prev) => ({ ...prev, serviceImage: file }));

      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCategoryFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (
      !serviceFormData.serviceName ||
      !serviceFormData.categoryName ||
      !serviceFormData.serviceImage
    ) {
      toast.error("Please fill all required fields and upload an image");
      return;
    }

    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("serviceName", serviceFormData.serviceName);
      formDataToSend.append("categoryName", serviceFormData.categoryName);
      formDataToSend.append(
        "serviceFilter",
        serviceFormData.serviceFilter || ""
      );
      formDataToSend.append(
        "serviceDescription",
        serviceFormData.serviceDescription || ""
      );
      formDataToSend.append("serviceImage", serviceFormData.serviceImage);

      const response = await api.post(
        "/api/service/addservice",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 201) {
        toast.success("Service added successfully");
        setShowAddServiceModal(false);
        resetServiceForm();
        fetchData();
      }
    } catch (err) {
      console.error("Error adding service:", err);
      toast.error(err.response?.data?.message || "Failed to add service");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = async (e) => {
    e.preventDefault();
    if (!serviceFormData.serviceName || !serviceFormData.categoryName) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("serviceId", selectedService.serviceId);
      formDataToSend.append("serviceName", serviceFormData.serviceName);
      formDataToSend.append("categoryName", serviceFormData.categoryName);
      formDataToSend.append(
        "serviceFilter",
        serviceFormData.serviceFilter || ""
      );
      formDataToSend.append(
        "serviceDescription",
        serviceFormData.serviceDescription || ""
      );

      if (serviceFormData.serviceImage) {
        formDataToSend.append("serviceImage", serviceFormData.serviceImage);
      }

      const response = await api.put(
        "/api/service/editService",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        toast.success("Service updated successfully");
        setShowEditServiceModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error updating service:", err);
      toast.error(err.response?.data?.message || "Failed to update service");
    } finally {
      setSubmitting(false);
    }
  };

  // Add category with subCategories array (strings)
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.categoryName) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        categoryName: categoryFormData.categoryName,
        subCategories: categoryFormData.subCategories || [],
      };
      const response = await api.post("/api/service/addcategory", payload);

      if (response.status === 201 || response.status === 200) {
        toast.success("Category added successfully");
        setShowAddCategoryModal(false);
        setCategoryFormData({ categoryName: "", subCategories: [] });
        fetchData();
      }
    } catch (err) {
      console.error("Error adding category:", err);
      toast.error(err.response?.data?.message || "Failed to add category");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit category: include subCategories if backend supports them
  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.categoryName) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        serviceCategoryId: selectedCategory.serviceCategoryId,
        newCategoryName: categoryFormData.categoryName,
        // include subCategories (array of strings). If backend doesn't accept it, remove this.
        subCategories: categoryFormData.subCategories || [],
      };

      const response = await api.put("/api/service/editcategory", payload);

      if (response.status === 200) {
        toast.success("Category updated successfully");
        setShowEditCategoryModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error updating category:", err);
      toast.error(err.response?.data?.message || "Failed to update category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      const response = await api.delete("/api/service/deleteservice", {
        data: { serviceId },
      });
      if (response.status === 200) {
        toast.success("Service deleted successfully");
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting service:", err);
      toast.error(err.response?.data?.message || "Failed to delete service");
    }
  };

  const handleDeleteCategory = async (serviceCategoryId) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? This will also delete all services in this category."
      )
    )
      return;

    try {
      const response = await api.delete("/api/service/deletecategory", {
        data: { serviceCategoryId },
      });
      if (response.status === 200) {
        toast.success("Category deleted successfully");
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error(err.response?.data?.message || "Failed to delete category");
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      serviceName: "",
      categoryName: "",
      serviceDescription: "",
      serviceImage: null,
      serviceFilter: "",
    });
    setImagePreview(null);
  };

  const getSubCategoryOptions = (categoryName) => {
    const category = categories.find(
      (cat) => cat.serviceCategory === categoryName
    );
    if (!category || !Array.isArray(category.subCategoryTypes)) return [];
    return category.subCategoryTypes.map((s) => {
      const label = s.subCategory || s;
      return { value: label, label: label };
    });
  };

  const getServiceFilterOptions = () => {
    return serviceFilters.map((filter) => ({
      value: filter.serviceFilter,
      label: filter.serviceFilter,
    }));
  };

  // prepare and open edit forms
  const editService = (service) => {
    console.log("service", service);
    setSelectedService(service);
    setServiceFormData({
      serviceName: service.serviceName,
      categoryName: service.categoryName,
      serviceDescription: service.description || "",
      serviceImage: null,
      serviceFilter: service.serviceFilter || service.subCategory || "",

      subCategory: service.subCategory || "",
    });
    setImagePreview(service.serviceImage || null);
    setShowEditServiceModal(true);
  };

  const editCategory = (category) => {
    // category from API likely has fields:
    // serviceCategoryId, serviceCategory (name), subCategoryTypes: [{ subcategoryId, subCategory }]
    const name = category.serviceCategory || category.categoryName || "";
    const subTypes = Array.isArray(category.subCategoryTypes)
      ? category.subCategoryTypes.map((s) =>
          s.subCategory ? s.subCategory : s
        )
      : [];

    setSelectedCategory({
      serviceCategoryId: category.serviceCategoryId,
    });

    setCategoryFormData({
      categoryName: name,
      subCategories: subTypes,
    });

    setShowEditCategoryModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // react-select options from existing subcategories
  const subOptions = buildSubCategoryOptions();

  // react-select value for adding/editing
  const categorySelectValue = (categoryFormData.subCategories || []).map(
    (s) => ({ value: s, label: s })
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Service Management</h2>
        <div className="flex space-x-2">
          <Button
            variant="lightWarning"
            onClick={() => {
              setSelectedFilter(null);
              setFilterMode("add");
              setShowFilterModal(true);
            }}
          >
            {" "}
            <FiPlus className="mr-2" />
            Add Service Filter
          </Button>
          <Button
            variant="lightPrimary"
            onClick={() => setShowAddServiceModal(true)}
          >
            <FiPlus className="mr-2" />
            Add Service
          </Button>
          <Button
            variant="lightSecondary"
            onClick={() => setShowAddCategoryModal(true)}
          >
            <FiPlus className="mr-2" />
            Add Category
          </Button>
          <Button variant="lightInherit" onClick={fetchData}>
            <FiRefreshCw className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Service Categories
        </h3>

        {categories.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Name
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr
                      key={category.serviceCategoryId}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {category.serviceCategoryId}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {category.serviceCategory}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <IconButton
                          variant="lightInfo"
                          size="md"
                          icon={<FaPen />}
                          onClick={() =>
                            editCategory({
                              serviceCategoryId: category.serviceCategoryId,
                              serviceCategory: category.serviceCategory,
                              subCategoryTypes: category.subCategoryTypes || [],
                            })
                          }
                        />
                        <IconButton
                          variant="lightDanger"
                          size="md"
                          icon={<FiTrash2 />}
                          onClick={() =>
                            handleDeleteCategory(category.serviceCategoryId)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No categories found.</p>
          </div>
        )}
      </div>

      {/* Services Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((category) => (
              <div
                key={category.categoryName}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="p-4 bg-gray-50 border-b">
                  <h4 className="font-medium text-gray-800">
                    {category.categoryName}
                  </h4>
                </div>

                {category.services && category.services.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {category.services.map((service) => (
                      <div
                        key={service.serviceId}
                        className="p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">
                              {service.serviceName}
                            </h5>
                            {service.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-start space-x-2 ml-4">
                            <IconButton
                              variant="lightInfo"
                              size="md"
                              icon={<FaPen />}
                              onClick={() => editService(service)}
                            />
                            <IconButton
                              variant="lightDanger"
                              size="md"
                              icon={<FiTrash2 />}
                              onClick={() =>
                                handleDeleteService(service.serviceId)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No services in this category
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No services found.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">Service Filters</h3>
        {serviceFilters.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Filter
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {serviceFilters.map((filter) => (
                  <tr key={filter.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{filter.service_filter_id}</td>
                    <td className="px-4 py-2">{filter.serviceFilter}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <IconButton
                        variant="lightInfo"
                        size="sm"
                        icon={<FaPen />}
                        onClick={() => {
                          setSelectedFilter(filter);
                          setFilterMode("edit");
                          setShowFilterModal(true);
                        }}
                      />
                      <IconButton
                        variant="lightDanger"
                        size="sm"
                        icon={<FiTrash2 />}
                        onClick={async () => {
                          if (window.confirm("Are you sure?")) {
                            try {
                              await api.delete(
                                `/api/service/deletefilter/${filter.service_filter_id}`
                              );
                              toast.success("Filter deleted");
                              fetchServiceFilters();
                            } catch (err) {
                              toast.error("Error deleting filter");
                            }
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No service filters found.</p>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Service</h3>
              <IconButton
                onClick={() => {
                  setShowAddServiceModal(false);
                  resetServiceForm();
                }}
                variant="lightDanger"
                size="sm"
                icon={<FiX />}
              />
            </div>

            <form onSubmit={handleAddService} className="p-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="serviceName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Service Name*
                  </label>
                  <FormInput
                    type="text"
                    id="serviceName"
                    name="serviceName"
                    value={serviceFormData.serviceName}
                    onChange={handleServiceInputChange}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="categoryName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category*
                  </label>
                  <FormSelect
                    id="categoryName"
                    name="categoryName"
                    value={serviceFormData.categoryName}
                    onChange={handleServiceInputChange}
                    required
                    options={categories.map((cat) => ({
                      value: cat.serviceCategory,
                      label: cat.serviceCategory,
                    }))}
                    placeholder="Select Category"
                  />
                </div>
                {serviceFilters.length > 0 && (
                  <div>
                    <label
                      htmlFor="serviceFilter"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Service Filter
                    </label>
                    <FormSelect
                      id="serviceFilter"
                      name="serviceFilter"
                      value={serviceFormData.serviceFilter}
                      onChange={handleServiceInputChange}
                      options={getServiceFilterOptions()}
                      placeholder="Select Service Filter"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="serviceDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <FormTextarea
                    id="serviceDescription"
                    name="serviceDescription"
                    value={serviceFormData.serviceDescription}
                    onChange={handleServiceInputChange}
                    rows="3"
                  />
                </div>

                <CustomFileInput
                  label="Service Image"
                  required={false} // set true if you want to make this required
                  onChange={handleServiceImageChange}
                  preview={imagePreview}
                  onRemove={() => {
                    // clear preview and any file state you use
                    // if you keep a file state like `serviceFile`, clear it too
                    if (typeof setImagePreview === "function")
                      setImagePreview(null);
                    if (typeof setServiceFile === "function")
                      setServiceFile(null);
                  }}
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="lightError"
                  size="sm"
                  onClick={() => {
                    setShowAddServiceModal(false);
                    resetServiceForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="ml-2">Adding...</span>
                    </>
                  ) : (
                    "Add Service"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditServiceModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Service</h3>
              <IconButton
                onClick={() => setShowEditServiceModal(false)}
                variant="lightDanger"
                size="sm"
                icon={<FiX />}
              />
            </div>

            <form onSubmit={handleEditService} className="p-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="serviceName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Service Name*
                  </label>
                  <FormInput
                    type="text"
                    id="serviceName"
                    name="serviceName"
                    value={serviceFormData.serviceName}
                    onChange={handleServiceInputChange}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="categoryName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category*
                  </label>
                  <FormSelect
                    id="categoryName"
                    name="categoryName"
                    value={serviceFormData.categoryName}
                    onChange={handleServiceInputChange}
                    required
                    options={categories.map((cat) => ({
                      value: cat.serviceCategory,
                      label: cat.serviceCategory,
                    }))}
                    placeholder="Select Category"
                  />
                </div>

                {serviceFilters.length > 0 && (
                  <div>
                    <label
                      htmlFor="serviceFilter"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Service Filter
                    </label>
                    <FormSelect
                      id="serviceFilter"
                      name="serviceFilter"
                      value={serviceFormData.serviceFilter ?? ""}
                      onChange={handleServiceInputChange}
                      options={getServiceFilterOptions()}
                      placeholder="Select Service Filter"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="serviceDescription"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <FormTextarea
                    id="serviceDescription"
                    name="serviceDescription"
                    value={serviceFormData.serviceDescription}
                    onChange={handleServiceInputChange}
                    rows="3"
                  />
                </div>

                <div>
                  <CustomFileInput
                    label="Service Image"
                    required={false} // set true if you want to make this required
                    onChange={handleServiceImageChange}
                    preview={imagePreview}
                    onRemove={() => {
                      // clear preview and any file state you use
                      // if you keep a file state like `serviceFile`, clear it too
                      if (typeof setImagePreview === "function")
                        setImagePreview(null);
                      if (typeof setServiceFile === "function")
                        setServiceFile(null);
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="lightError"
                  onClick={() => setShowEditServiceModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <span className="ml-2">Updating...</span>
                  ) : (
                    "Update Service"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <IconButton
                size="sm"
                variant="lightDanger"
                onClick={() => setShowAddCategoryModal(false)}
                icon={<FiX />}
              />
            </div>

            <form onSubmit={handleAddCategory} className="p-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="newCategoryName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category Name*
                  </label>
                  <FormInput
                    type="text"
                    id="newCategoryName"
                    name="categoryName"
                    value={categoryFormData.categoryName}
                    onChange={handleCategoryInputChange}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  variant="lightError"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="ml-2">Adding...</span>
                    </>
                  ) : (
                    "Add Category"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Category</h3>
              <IconButton
                variant="lightDanger"
                size="sm"
                icon={<FiX />}
                onClick={() => setShowEditCategoryModal(false)}
              />
            </div>

            <form onSubmit={handleEditCategory} className="p-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="editCategoryName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category Name*
                  </label>
                  <FormInput
                    type="text"
                    id="editCategoryName"
                    name="categoryName"
                    value={categoryFormData.categoryName}
                    onChange={handleCategoryInputChange}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="lightError"
                  type="button"
                  onClick={() => setShowEditCategoryModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="ml-2">Updating...</span>
                    </>
                  ) : (
                    "Update Category"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ServiceFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        mode={filterMode}
        filterData={selectedFilter}
        onSave={fetchServiceFilters}
      />
    </div>
  );
};

export default Services;
