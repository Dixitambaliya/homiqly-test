import React, { useState, useEffect } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormFileInput,
} from "../../../shared/components/Form";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import axios from "axios";

const AddServiceTypeModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    serviceId: "",
    serviceType: "",
    serviceTypeMedia: null,
    packages: [
      { package_name: "", description: "", total_price: "", total_time: "" },
    ],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVendorRegisteredServices();
    }
  }, [isOpen]);

  const loadVendorRegisteredServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/vendor/vendorservice");
      setServices(response.data.services || []);
      setLoading(false);
    } catch (error) {
      console.error("Error loading vendor services:", error);
      setLoading(false);
    }
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
    const updatedPackages = [...formData.packages];
    updatedPackages[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      packages: updatedPackages,
    }));
  };

  const addPackage = () => {
    setFormData((prev) => ({
      ...prev,
      packages: [
        ...prev.packages,
        { package_name: "", description: "", total_price: "", total_time: "" },
      ],
    }));
  };

  const removePackage = (index) => {
    if (formData.packages.length > 1) {
      const updatedPackages = [...formData.packages];
      updatedPackages.splice(index, 1);
      setFormData((prev) => ({
        ...prev,
        packages: updatedPackages,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Create FormData object for file upload
    const formDataToSend = new FormData();
    formDataToSend.append("serviceId", formData.serviceId);
    formDataToSend.append("serviceType", formData.serviceType);

    if (formData.serviceTypeMedia) {
      formDataToSend.append("serviceTypeMedia", formData.serviceTypeMedia);
    }

    // Add packages as JSON string
    formDataToSend.append("packages", JSON.stringify(formData.packages));

    onSubmit(formDataToSend);
  };

  const resetForm = () => {
    setFormData({
      serviceId: "",
      serviceType: "",
      serviceTypeMedia: null,
      packages: [
        { package_name: "", description: "", total_price: "", total_time: "" },
      ],
    });
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
            label="Service"
            name="serviceId"
            value={formData.serviceId}
            onChange={handleInputChange}
            options={services.map((service) => ({
              value: service.service_id,
              label: service.serviceName,
            }))}
            placeholder="Select a service"
            required
            disabled={loading}
          />

          <FormInput
            label="Service Type Name"
            name="serviceType"
            value={formData.serviceType}
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
              {formData.packages.map((pkg, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-md bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium">Package {index + 1}</h5>
                    {formData.packages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePackage(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput
                      label="Package Name"
                      name={`package_name_${index}`}
                      value={pkg.package_name}
                      onChange={(e) =>
                        handlePackageChange(
                          index,
                          "package_name",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Basic Package"
                      required
                    />

                    <FormInput
                      label="Description"
                      name={`description_${index}`}
                      value={pkg.description}
                      onChange={(e) =>
                        handlePackageChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Brief description"
                    />

                    <FormInput
                      label="Price ($)"
                      name={`total_price_${index}`}
                      type="number"
                      value={pkg.total_price}
                      onChange={(e) =>
                        handlePackageChange(
                          index,
                          "total_price",
                          e.target.value
                        )
                      }
                      placeholder="e.g., 1999.99"
                      min="0"
                      step="0.01"
                      required
                    />

                    <FormInput
                      label="Time Required"
                      name={`total_time_${index}`}
                      value={pkg.total_time}
                      onChange={(e) =>
                        handlePackageChange(index, "total_time", e.target.value)
                      }
                      placeholder="e.g., 2 hours"
                      required
                    />
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
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Submit for Approval
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddServiceTypeModal;
