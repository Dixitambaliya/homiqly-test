import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import Select from "react-select";
import { toast } from "react-toastify";
import LoadingSlider from "../../../shared/components/LoadingSpinner";

const ApplyServiceModal = ({ isOpen, onClose, vendor, refresh }) => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // Removed selectedPackages state (user requested no package selector).
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

        console.log("Raw API response:", rawData); // inspect data shape

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
    setSelectedSubPackages([]);
    setSelectedPreferences([]);
  };

  const handleModalClose = () => {
    resetSelections();
    onClose();
  };

  const handleSubmit = async () => {
    const groupedByPackage = selectedSubPackages.reduce((acc, sub) => {
      const pkgId = sub.package_id;
      if (!acc[pkgId]) acc[pkgId] = { package_id: pkgId, sub_packages: [] };
      acc[pkgId].sub_packages.push({ sub_package_id: sub.value });
      return acc;
    }, {});

    selectedPreferences.forEach((pref) => {
      const pkgId = pref.package_id;
      if (groupedByPackage[pkgId]) {
        if (!groupedByPackage[pkgId].preferences)
          groupedByPackage[pkgId].preferences = [];
        groupedByPackage[pkgId].preferences.push({
          preference_id: pref.value,
        });
      }
    });

    const builtPackages = Object.values(groupedByPackage).map((p) => ({
      package_id: p.package_id,
      sub_packages: p.sub_packages || [],
    }));

    const payload = {
      vendor_id: vendor?.vendor_id,
      selectedPackages: builtPackages,
    };

    try {
      setSubmitting(true);
      await api.post("/api/admin/assignpackage", payload);
      toast.success("Service assigned successfully!");
      resetSelections();
      onClose();
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to assign service. Please try again.");
    } finally {
      refresh();
      setSubmitting(false);
    }
  };

  // Category and service options (unchanged)
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

  // allPackages: packages belonging to the selected service (array)
  const allPackages = selectedServiceObj?.packages || [];
  console.log(allPackages);

  // NEW: build sub-package options across ALL packages of the selected service.
  // Each option includes package_id so we can infer package on submit.
  const subPackageOptions = allPackages.flatMap((pkg) =>
    (pkg.sub_packages || []).map((sub) => ({
      label: sub.item_name,
      value: sub.sub_package_id,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSlider />
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Assign Services to Vendor"
    >
      <p className="text-sm text-gray-700 mb-4">
        {vendor ? (
          <>
            Assign services for vendor ID: <strong>{vendor.vendor_id}</strong>
          </>
        ) : (
          "Loading vendor details..."
        )}
      </p>

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
              setSelectedPreferences([]);
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
                setSelectedPreferences([]);
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

        {/* Sub-Packages (now selectable directly, across all packages of selected service) */}
        {selectedService && (
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
              Select one or more sub-packages. The system will infer package(s)
              automatically.
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
          {submitting ? "Submitting..." : "Assign Service"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApplyServiceModal;
