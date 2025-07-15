import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";
import axios from "axios";

const ApplyServiceModal = ({ isOpen, onClose, vendor }) => {
  const [groupedPackages, setGroupedPackages] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedSubPackage, setSelectedSubPackage] = useState("");

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await axios.get("/api/admin/getpackages");
        const rawData = Array.isArray(response.data)
          ? response.data
          : response.data?.result || [];

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

  const categoryOptions = Object.keys(groupedPackages);

  const serviceOptions =
    selectedCategory && groupedPackages[selectedCategory]
      ? groupedPackages[selectedCategory].map((item, index) => ({
          id: `${item.service_id}-${index}`, // unique key using index
          value: item.service_id,
          name: item.service_name,
        }))
      : [];

  const selectedServiceObj =
    groupedPackages[selectedCategory]?.find(
      (item) => String(item.service_id) === selectedService
    ) || null;

  const packageOptions =
    selectedServiceObj?.packages?.map((pkg, index) => ({
      id: `${pkg.package_id}-${index}`,
      value: pkg.package_id,
      name: pkg.title,
    })) || [];

  const selectedPackageObj =
    selectedServiceObj?.packages?.find(
      (pkg) => String(pkg.package_id) === selectedPackage
    ) || null;

  const subPackageOptions =
    selectedPackageObj?.sub_packages?.map((sub, index) => ({
      id: `${sub.sub_package_id}-${index}`,
      value: sub.sub_package_id,
      name: sub.item_name,
    })) || [];

  const handleSubmit = () => {
    console.log("Assigning to vendor:", vendor?.vendor_id);
    console.log("Selected category:", selectedCategory);
    console.log("Selected service:", selectedService);
    console.log("Selected package:", selectedPackage);
    console.log("Selected sub-package:", selectedSubPackage);

    // 🟡 You can send this data to your API if needed

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Services to Vendor">
      <p className="text-sm text-gray-700 mb-4">
        {vendor ? (
          <>
            Assign services for vendor ID: <strong>{vendor.vendor_id}</strong>
          </>
        ) : (
          "Loading vendor details..."
        )}
      </p>

      <div className="space-y-4 mb-6">
        {/* Category Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedService("");
              setSelectedPackage("");
              setSelectedSubPackage("");
            }}
          >
            <option value="">Select category</option>
            {categoryOptions.map((cat, index) => (
              <option key={`${cat}-${index}`} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Service Dropdown */}
        {selectedCategory && (
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setSelectedPackage("");
                setSelectedSubPackage("");
              }}
            >
              <option value="">Select service</option>
              {serviceOptions.map((s) => (
                <option key={s.id} value={s.value}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Package Dropdown */}
        {selectedService && (
          <div>
            <label className="block text-sm font-medium mb-1">Package</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={selectedPackage}
              onChange={(e) => {
                setSelectedPackage(e.target.value);
                setSelectedSubPackage("");
              }}
            >
              <option value="">Select package</option>
              {packageOptions.map((pkg) => (
                <option key={pkg.id} value={pkg.value}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sub-Package Dropdown */}
        {selectedPackage && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Sub-Package
            </label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={selectedSubPackage}
              onChange={(e) => setSelectedSubPackage(e.target.value)}
            >
              <option value="">Select sub-package</option>
              {subPackageOptions.map((sub) => (
                <option key={sub.id} value={sub.value}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            !selectedCategory ||
            !selectedService ||
            !selectedPackage ||
            !selectedSubPackage
          }
        >
          Assign Service
        </Button>
      </div>
    </Modal>
  );
};

export default ApplyServiceModal;
