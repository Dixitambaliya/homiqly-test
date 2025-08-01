import React, { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal/Modal";
import {
  FormInput,
  FormTextarea,
  FormFileInput,
} from "../../../shared/components/Form";
import { Button } from "../../../shared/components/Button";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";

const EditPackageModal = ({ isOpen, onClose, packageData, refresh }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeRequired, setTimeRequired] = useState("");
  const [subPackages, setSubPackages] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(false);

  // Auto-calculate price from sub-packages
  const totalPrice = subPackages.reduce(
    (sum, sub) => sum + Number(sub.price || 0),
    0
  );

  useEffect(() => {
    if (packageData) {
      setTitle(packageData.title || packageData.package_name || "");
      setDescription(packageData.description || "");
      setTimeRequired(
        packageData.time_required || packageData.total_time || ""
      );
      setSubPackages(packageData.sub_packages || []);
      setPreferences(packageData.preferences || []);
    }
  }, [packageData]);

  const handleFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileKey = `itemMedia_0_${index}`;

    setFiles((prev) => ({
      ...prev,
      [fileKey]: file,
    }));

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews((prev) => ({
        ...prev,
        [fileKey]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removePreview = (index) => {
    const fileKey = `itemMedia_0_${index}`;
    const updatedFiles = { ...files };
    const updatedPreviews = { ...previews };
    delete updatedFiles[fileKey];
    delete updatedPreviews[fileKey];
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubPackageChange = (index, field, value) => {
    setSubPackages((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handlePreferenceChange = (index, value) => {
    setPreferences((prev) => {
      const updated = [...prev];
      updated[index].preference_value = value;
      return updated;
    });
  };

  const addSubPackage = () => {
    setSubPackages((prev) => [
      ...prev,
      {
        sub_package_id: null,
        title: "",
        description: "",
        price: "",
        time_required: "",
      },
    ]);
  };

  const removeSubPackage = (index) => {
    setSubPackages((prev) => prev.filter((_, i) => i !== index));
    removePreview(index);
  };

  const addPreference = () => {
    setPreferences((prev) => [...prev, { preference_value: "" }]);
  };

  const removePreference = (index) => {
    setPreferences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = new FormData();

      //   form.append("service_type_id", packageData.service_type_id);
      //   form.append("serviceTypeName", packageData.service_type_name);
      //   form.append("serviceId", packageData.service_id);

      const packages = [
        {
          package_id: packageData.package_id,
          package_name: title,
          description,
          total_price: totalPrice,
          total_time: timeRequired,
          subPackages: subPackages.map((sub) => ({
            sub_package_id: sub.sub_package_id,
            item_name: sub.item_name,
            description: sub.description,
            price: sub.price,
            time_required: sub.time_required,
          })),
        },
      ];

      const prefs = preferences.map((p) => ({
        preference_value: p.preference_value,
      }));

      form.append("packages", JSON.stringify(packages));
      form.append("preferences", JSON.stringify(prefs));

      Object.entries(files).forEach(([key, file]) => {
        form.append(key, file);
      });

      await api.put("/api/admin/editpackage", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Package updated successfully");
      onClose();
      refresh();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to update package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Package">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Package Name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <FormTextarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FormInput
          label="Total Price (Auto)"
          type="number"
          disabled
          value={totalPrice}
          readOnly
        />
        <FormInput
          label="Time Required"
          value={timeRequired}
          onChange={(e) => setTimeRequired(e.target.value)}
          required
        />

        {/* Sub-packages */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold">Sub-Packages</h4>
            <Button type="button" size="sm" onClick={addSubPackage}>
              + Add Sub-package
            </Button>
          </div>
          {subPackages.map((sub, index) => (
            <div key={index} className="mb-4 p-3 border rounded bg-gray-50">
              <FormInput
                label="item_name"
                value={sub.item_name}
                onChange={(e) =>
                  handleSubPackageChange(index, "item_name", e.target.value)
                }
                required
              />
              <FormTextarea
                label="Description"
                value={sub.description}
                onChange={(e) =>
                  handleSubPackageChange(index, "description", e.target.value)
                }
              />
              <FormInput
                label="Price"
                type="number"
                value={sub.price}
                onChange={(e) =>
                  handleSubPackageChange(index, "price", e.target.value)
                }
                required
              />
              <FormInput
                label="Time Required"
                value={sub.time_required}
                onChange={(e) =>
                  handleSubPackageChange(index, "time_required", e.target.value)
                }
                required
              />
              <FormFileInput
                label="Upload Media"
                name={`itemMedia_0_${index}`}
                onChange={(e) => handleFileChange(e, index)}
              />
              {/* Preview */}
              {previews[`itemMedia_0_${index}`] && (
                <div className="mt-2 relative w-fit">
                  <img
                    src={previews[`itemMedia_0_${index}`]}
                    alt="preview"
                    className="h-20 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removePreview(index)}
                    className="text-xs text-red-500 absolute top-0 right-0 bg-white px-2 rounded-full shadow"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeSubPackage(index)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Preferences */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold">Preferences</h4>
            <Button type="button" size="sm" onClick={addPreference}>
              + Add Preference
            </Button>
          </div>
          {preferences.map((pref, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <FormInput
                label={`Preference ${index + 1}`}
                value={pref.preference_value}
                onChange={(e) => handlePreferenceChange(index, e.target.value)}
                required
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => removePreference(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPackageModal;
