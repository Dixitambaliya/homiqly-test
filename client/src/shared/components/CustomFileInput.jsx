import { FiImage } from "react-icons/fi";
import { ImagePreview } from "./ImagePreview";

export const CustomFileInput = ({
  label,
  onChange,
  accept = "image/*",
  preview,
  onRemove,
  required = false,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    {!preview ? (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <FiImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <label className="cursor-pointer">
          <span className="text-sm text-gray-600">Click to upload image</span>
          <input
            type="file"
            accept={accept}
            onChange={onChange}
            className="hidden"
          />
        </label>
      </div>
    ) : (
      <ImagePreview src={preview} onRemove={onRemove} />
    )}
  </div>
);
