import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import Select from "react-select";
import { toast } from "react-toastify";

const ApplyServiceModal = ({ isOpen, onClose, initialPackage }) => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // Removed selectedPackages -- user will select sub-packages directly
  const [selectedSubPackages, setSelectedSubPackages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.get("/api/admin/getpackages");
        const rawData = Array.isArray(response.data)
          ? response.data
          : response.data?.result || [];

        const grouped = rawData.reduce((acc, item) => {
          const categoryId = item.service_category_id;
          const serviceId = item.service_id;

          if (!acc[categoryId]) {
            acc[categoryId] = {
              categoryName: item.service_category_name,
              services: {},
            };
          }

          if (!acc[categoryId].services[serviceId]) {
            acc[categoryId].services[serviceId] = {
              serviceId,
              serviceName: item.service_name,
              packages: [],
            };
          }

          const existingService = acc[categoryId].services[serviceId];
          (item.packages || []).forEach((pkg) => {
            if (
              !existingService.packages.some(
                (p) => p.package_id === pkg.package_id
              )
            ) {
              existingService.packages.push(pkg);
            }
          });

          return acc;
        }, {});

        setGroupedPackages(grouped);

        // Prefill initialPackage: set category, service, and sub-packages from that package
        if (initialPackage) {
          const { service_category_id, service_id, package_id } =
            initialPackage;
          const cat = grouped[service_category_id];
          if (cat) {
            setSelectedCategory({
              value: service_category_id,
              label: cat.categoryName,
            });
            const srv = cat.services[service_id];
            if (srv) {
              setSelectedService({ value: service_id, label: srv.serviceName });
              const pkg = srv.packages.find((p) => p.package_id === package_id);
              if (pkg && pkg.sub_packages?.length) {
                setSelectedSubPackages(
                  pkg.sub_packages.map((sp) => ({
                    value: sp.sub_package_id,
                    label: sp.item_name,
                    package_id: pkg.package_id,
                  }))
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) fetchPackages();
  }, [isOpen, initialPackage]);

  const resetSelections = () => {
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedSubPackages([]);
  };

  const handleModalClose = () => {
    resetSelections();
    onClose();
  };

  // Service object and its packages for selected category/service
  const selectedServiceObj =
    groupedPackages[selectedCategory?.value]?.services?.[
      selectedService?.value
    ] || {};
  const allPackages = selectedServiceObj?.packages || [];

  // Build sub-package options across all packages of the selected service.
  // Each sub-package option includes package_id so the submit can infer package_id.
  const subPackageOptions = allPackages.flatMap((pkg) =>
    (pkg.sub_packages || []).map((sub) => ({
      value: sub.sub_package_id,
      label: sub.item_name,
      package_id: pkg.package_id,
    }))
  );

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      padding: "2px 6px",
      minHeight: 42,
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    multiValue: (base) => ({ ...base, backgroundColor: "#e0f2fe" }),
    multiValueLabel: (base) => ({ ...base, color: "#0369a1" }),
    placeholder: (base) => ({ ...base, fontSize: "0.95rem", color: "#9ca3af" }),
  };

  const handleSubmit = async () => {
    // Group selected sub-packages by package_id and assemble payload
    const groupedByPackage = selectedSubPackages.reduce((acc, sub) => {
      const pkgId = sub.package_id;
      if (!acc[pkgId]) acc[pkgId] = { package_id: pkgId, sub_packages: [] };
      acc[pkgId].sub_packages.push({ sub_package_id: sub.value });
      return acc;
    }, {});

    const builtPackages = Object.values(groupedByPackage);

    if (builtPackages.length === 0) {
      toast.error("Please select at least one sub-package.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post("/api/vendor/applyservice", {
        selectedPackages: builtPackages,
      });
      toast.success(response.data.message || "Service requested successfully!");
      handleModalClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.error ||
          "Failed to request service. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = Object.entries(groupedPackages).map(([id, cat]) => ({
    value: id,
    label: cat.categoryName,
  }));
  const serviceOptions = selectedCategory
    ? Object.values(
        groupedPackages[selectedCategory.value]?.services || {}
      ).map((srv) => ({ value: srv.serviceId, label: srv.serviceName }))
    : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        {/* keep simple loading fallback while fetching */}
        <div className="text-sm text-gray-600">Loading services...</div>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Request New Services"
    >
      <div className="space-y-5 mb-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              setSelectedService(null);
              setSelectedSubPackages([]);
            }}
            styles={customSelectStyles}
            placeholder="Select category"
            isClearable
            menuPortalTarget={
              typeof window !== "undefined" ? document.body : null
            }
            menuPosition="fixed"
          />
        </div>

        {/* Service */}
        {selectedCategory && (
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <Select
              options={serviceOptions}
              value={selectedService}
              onChange={(value) => {
                setSelectedService(value);
                setSelectedSubPackages([]);
              }}
              styles={customSelectStyles}
              placeholder="Select service"
              isClearable
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
            />
          </div>
        )}

        {/* Sub-Packages (select directly across all packages for the chosen service) */}
        {selectedService && subPackageOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Sub-Packages
            </label>
            <Select
              options={subPackageOptions}
              value={selectedSubPackages}
              onChange={(value) => setSelectedSubPackages(value || [])}
              styles={customSelectStyles}
              placeholder="Select sub-packages"
              isMulti
              isClearable
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose sub-packages. The form will infer package IDs automatically
              when submitting.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={handleModalClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            submitting ||
            !selectedCategory ||
            !selectedService ||
            selectedSubPackages.length === 0
          }
        >
          {submitting ? "Submitting..." : "Request Service"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApplyServiceModal;
