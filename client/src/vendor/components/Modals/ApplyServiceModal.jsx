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
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [selectedSubPackages, setSelectedSubPackages] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
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

        // Prefill initialPackage
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
              if (pkg) {
                setSelectedPackages([
                  { value: pkg.package_id, label: pkg.title },
                ]);

                // Sub-packages
                if (pkg.sub_packages?.length) {
                  setSelectedSubPackages(
                    pkg.sub_packages.map((sp) => ({
                      value: sp.sub_package_id,
                      label: sp.item_name,
                    }))
                  );
                }

                // Preferences
                if (pkg.preferences?.length) {
                  setSelectedPreferences(
                    pkg.preferences.map((pref) => ({
                      value: pref.preference_id,
                      label: pref.preference_value,
                    }))
                  );
                }

                // Addons
                if (pkg.addons?.length) {
                  setSelectedAddons(
                    pkg.addons.map((addon) => ({
                      value: addon.addon_id,
                      label: addon.addon_name,
                    }))
                  );
                }
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
    setSelectedPackages([]);
    setSelectedSubPackages([]);
    setSelectedPreferences([]);
    setSelectedAddons([]);
  };

  const handleModalClose = () => {
    resetSelections();
    onClose();
  };

  const selectedServiceObj =
    groupedPackages[selectedCategory?.value]?.services?.[
      selectedService?.value
    ] || {};
  const allPackages = selectedServiceObj?.packages || [];

  const packageOptions = allPackages.map((pkg) => ({
    value: pkg.package_id,
    label: pkg.title,
  }));

  const allSelectedSubPackages = selectedPackages.flatMap((pkg) => {
    const pkgDetail = allPackages.find((p) => p.package_id === pkg.value);
    return (pkgDetail?.sub_packages || []).map((sp) => ({
      value: sp.sub_package_id,
      label: sp.item_name,
    }));
  });

  const allSelectedPreferences = selectedPackages.flatMap((pkg) => {
    const pkgDetail = allPackages.find((p) => p.package_id === pkg.value);
    return (pkgDetail?.preferences || []).map((pref) => ({
      value: pref.preference_id,
      label: pref.preference_value,
    }));
  });

  const allSelectedAddons = selectedPackages.flatMap((pkg) => {
    const pkgDetail = allPackages.find((p) => p.package_id === pkg.value);
    return (pkgDetail?.addons || []).map((addon) => ({
      value: addon.addon_id,
      label: addon.addon_name,
    }));
  });

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
    const builtPackages = selectedPackages.map((pkg) => {
      const pkgId = pkg.value;

      const subPackages = selectedSubPackages
        .filter((sub) =>
          allPackages
            .find((p) => p.package_id === pkgId)
            ?.sub_packages?.some((sp) => sp.sub_package_id === sub.value)
        )
        .map((sub) => ({ sub_package_id: sub.value }));

      const preferences = selectedPreferences
        .filter((pref) =>
          allPackages
            .find((p) => p.package_id === pkgId)
            ?.preferences?.some((p) => p.preference_id === pref.value)
        )
        .map((pref) => ({ preference_id: pref.value }));

      const addons = selectedAddons
        .filter((addon) =>
          allPackages
            .find((p) => p.package_id === pkgId)
            ?.addons?.some((a) => a.addon_id === addon.value)
        )
        .map((addon) => ({ addon_id: addon.value }));

      return {
        package_id: pkgId,
        sub_packages: subPackages,
        preferences,
        addons,
      };
    });

    // const isValid = builtPackages.every(
    //   (p) => p.sub_packages.length > 0 && p.preferences.length > 0
    // );
    // if (!isValid) {
    //   toast.error(
    //     "Each package must have at least one sub-package and one preference."
    //   );
    //   return;
    // }

    try {
      setSubmitting(true);
      await api.post("/api/vendor/applyservice", {
        selectedPackages: builtPackages,
      });
      toast.success("Service requested successfully!");
      handleModalClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to request service.");
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
              setSelectedPackages([]);
              setSelectedSubPackages([]);
              setSelectedPreferences([]);
              setSelectedAddons([]);
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
                setSelectedPreferences([]);
                setSelectedAddons([]);
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

        {/* Packages */}
        {selectedService && (
          <div>
            <label className="block text-sm font-medium mb-1">Packages</label>
            <Select
              options={packageOptions}
              value={selectedPackages}
              onChange={(value) => {
                setSelectedPackages(value || []);
                setSelectedSubPackages([]);
                setSelectedPreferences([]);
                setSelectedAddons([]);
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

        {/* Sub-Packages */}
        {allSelectedSubPackages.length > 0 && (
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

        {/* Preferences */}
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

        {/* Addons */}
        {allSelectedAddons.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Addons</label>
            <Select
              options={allSelectedAddons}
              value={selectedAddons}
              onChange={(value) => setSelectedAddons(value || [])}
              styles={customSelectStyles}
              placeholder="Select addons"
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
            selectedPackages.length === 0
          }
        >
          {submitting ? "Submitting..." : "Request Service"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApplyServiceModal;
