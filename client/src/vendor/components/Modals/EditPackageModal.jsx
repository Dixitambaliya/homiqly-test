import React, { useState, useEffect } from "react";
import Modal from "../../../shared/components/Modal"; // your modal wrapper
import { Button } from "../../../shared/components/Button";

const EditPackageModal = ({ isOpen, onClose, packageData, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    time_required: "",
    sub_packages: [],
  });

  useEffect(() => {
    if (packageData) {
      setFormData({
        title: packageData.title || "",
        description: packageData.description || "",
        price: packageData.price || "",
        time_required: packageData.time_required || "",
        sub_packages: packageData.sub_packages || [],
      });
    }
  }, [packageData]);

  const handleSubChange = (index, key, value) => {
    const updated = [...formData.sub_packages];
    updated[index][key] = value;
    setFormData({ ...formData, sub_packages: updated });
  };

  const handleSubmit = () => {
    onSave({ ...packageData, ...formData });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Package">
      <div className="space-y-4">
        <input
          className="w-full p-2 border rounded"
          placeholder="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <textarea
          className="w-full p-2 border rounded"
          placeholder="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <input
          type="number"
          className="w-full p-2 border rounded"
          placeholder="Price"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
        <input
          className="w-full p-2 border rounded"
          type="number"
          label="Time Required (in minutes only)"
          value={formData.time_required}
          onChange={(e) =>
            setFormData({ ...formData, time_required: e.target.value })
          }
        />

        {/* Sub-packages */}
        {formData.sub_packages.map((sub, i) => (
          <div key={i} className="p-3 border rounded bg-gray-50 space-y-2">
            <input
              className="w-full p-1 border rounded"
              placeholder="Sub-package title"
              value={sub.title}
              onChange={(e) => handleSubChange(i, "title", e.target.value)}
            />
            <input
              className="w-full p-1 border rounded"
              placeholder="Description"
              value={sub.description}
              onChange={(e) =>
                handleSubChange(i, "description", e.target.value)
              }
            />
            <input
              type="number"
              className="w-full p-1 border rounded"
              placeholder="Price"
              value={sub.price}
              onChange={(e) => handleSubChange(i, "price", e.target.value)}
            />
            <input
              className="w-full p-1 border rounded"
              placeholder="Time"
              value={sub.time_required}
              onChange={(e) =>
                handleSubChange(i, "time_required", e.target.value)
              }
            />
          </div>
        ))}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditPackageModal;
