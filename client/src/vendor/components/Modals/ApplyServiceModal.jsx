import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import Select from "react-select";
import { toast } from "react-toastify";

const ApplyServiceModal = ({ isOpen, onClose, vendor }) => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [selectedSubPackages, setSelectedSubPackages] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.get("/api/admin/getpackages");
        const rawData = Array.isArray(response.data)
          ? response.data
          : response.data?.result || [];

        console.log("Raw API response:", rawData); // 👈 check what you get

        const grouped = rawData.reduce((acc, item) => {
          const category = item.service_category_name;
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
          return acc;
        }, {});
        setGroupedPackages(grouped);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const resetSelections = () => {
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedPackages([]);
    setSelectedSubPackages([]);
    setSelectedPreferences([]);
  };

  const handleModalClose = () => {
    resetSelections();
    onClose();
  };

  const handleSubmit = async () => {
    // Build payload with validation logic
    const builtPackages = selectedPackages.map((pkg) => {
      const pkgId = pkg.value;

      const subPackages = selectedSubPackages
        .filter((sub) => {
          const pkgDetail = allPackages.find((p) => p.package_id === pkgId);
          return pkgDetail?.sub_packages?.some(
            (sp) => sp.sub_package_id === sub.value
          );
        })
        .map((sub) => ({ sub_package_id: sub.value }));

      const preferences = selectedPreferences
        .filter((pref) => {
          const pkgDetail = allPackages.find((p) => p.package_id === pkgId);
          return pkgDetail?.preferences?.some(
            (p) => p.preference_id === pref.value
          );
        })
        .map((pref) => ({ preference_id: pref.value }));

      return {
        package_id: pkgId,
        sub_packages: subPackages,
        preferences: preferences,
      };
    });

    // ✅ Validate: each package must have at least one sub_package and preference
    const isValid = builtPackages.every(
      (p) => p.sub_packages.length > 0 && p.preferences.length > 0
    );

    if (!isValid) {
      toast.error(
        "Each package must have at least one sub-package and one preference."
      );
      return;
    }

    const payload = {
      // vendor_id: vendor?.vendor_id,
      selectedPackages: builtPackages,
    };

    try {
      setSubmitting(true);
      await api.post("/api/vendor/applyservice", payload);
      toast.success("Service reuqested successfully!");
      resetSelections();
      onClose();
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to request service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = Object.keys(groupedPackages).map((cat) => ({
    label: cat,
    value: cat,
  }));

  const serviceOptions =
    selectedCategory && groupedPackages[selectedCategory.value]
      ? groupedPackages[selectedCategory.value].map((item) => ({
          label: item.service_name,
          value: item.service_id,
        }))
      : [];

  const selectedServiceObj =
    groupedPackages[selectedCategory?.value]?.find(
      (item) => String(item.service_id) === String(selectedService?.value)
    ) || null;

  const allPackages = selectedServiceObj?.packages || [];

  const packageOptions = allPackages.map((pkg) => ({
    label: pkg.title,
    value: pkg.package_id,
    sub_packages: pkg.sub_packages || [],
  }));

  const allSelectedSubPackages = selectedPackages.flatMap((pkg) => {
    const pkgDetail = allPackages.find((p) => p.package_id === pkg.value);
    return (
      pkgDetail?.sub_packages?.map((sub) => ({
        label: sub.item_name,
        value: sub.sub_package_id,
      })) || []
    );
  });

  const allSelectedPreferences = selectedPackages.flatMap((pkg) => {
    const pkgDetail = allPackages.find((p) => p.package_id === pkg.value);
    return (
      pkgDetail?.preferences?.map((pref) => ({
        label: pref.preference_value,
        value: pref.preference_id,
      })) || []
    );
  });

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      padding: "2px 6px",
      minHeight: 42,
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
      "&:hover": {
        borderColor: "#3b82f6",
      },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#e0f2fe",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#0369a1",
    }),
    placeholder: (base) => ({
      ...base,
      fontSize: "0.95rem",
      color: "#9ca3af",
    }),
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Request New Services to Vendor"
    >
      {/* <p className="text-sm text-gray-700 mb-4">
        {vendor ? (
          <>
            Assign services for vendor ID: <strong>{vendor.vendor_id}</strong>
          </>
        ) : (
          "Loading vendor details..."
        )}
      </p> */}

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
              setSelectedPackages([]);
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
                setSelectedPackages([]);
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

        {/* Packages (Multi-select) */}
        {selectedService && (
          <div>
            <label className="block text-sm font-medium mb-1">Packages</label>
            <Select
              options={packageOptions}
              value={selectedPackages}
              onChange={(value) => {
                setSelectedPackages(value || []);
                setSelectedSubPackages([]);
              }}
              styles={customSelectStyles}
              placeholder="Select packages"
              isMulti
              isClearable
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
            />
          </div>
        )}

        {/* Sub-Packages (Multi-select) */}
        {selectedPackages.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Sub-Packages
            </label>
            <Select
              options={allSelectedSubPackages}
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
          </div>
        )}

        {allSelectedPreferences.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Preferences
            </label>
            <Select
              options={allSelectedPreferences}
              value={selectedPreferences}
              onChange={(value) => setSelectedPreferences(value || [])}
              styles={customSelectStyles}
              placeholder="Select preferences"
              isMulti
              isClearable
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
            />
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
            selectedPackages.length === 0 ||
            selectedSubPackages.length === 0 ||
            selectedPreferences.length === 0
          }
        >
          {submitting ? "Submitting..." : "Request new service"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApplyServiceModal;
