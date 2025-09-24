import { FiImage } from "react-icons/fi";
import { ImagePreview } from "./ImagePreview";
import { useState } from "react";
import { toast } from "react-toastify";

export const CustomFileInput = ({
  label,
  onChange,
  accept = "image/*",
  preview,
  onRemove,
  required = false,
}) => {
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPG, PNG, and WebP files are allowed.");
        setError("Only JPG, PNG, and WebP files are allowed.");
        e.target.value = ""; // reset input
        return;
      }

      setError("");
      onChange(e); // pass back to parent
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {!preview ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <label className="cursor-pointer">
            <FiImage className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <span className="text-sm text-gray-600">Click to upload image</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <ImagePreview src={preview} onRemove={onRemove} />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
