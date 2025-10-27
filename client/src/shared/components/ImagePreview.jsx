import { X } from "lucide-react";

export const ImagePreview = ({ src, onRemove, className = "" }) => (
  <div className={`relative inline-block ${className}`}>
    <img
      src={src}
      alt="Preview"
      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
    />
    <button
      type="button"
      onClick={onRemove}
      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
