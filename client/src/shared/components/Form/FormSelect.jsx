import React from "react";

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error,
  placeholder = "Select an option",
  icon,
  className = "",
  ...rest
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        {label && (
          <label
            htmlFor={name}
            className="block mb-1 text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div
          className={`relative flex items-center rounded-lg border ${
            error ? "border-red-400" : "border-gray-300"
          } shadow-sm bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all`}
        >
          {icon && (
            <div className="pl-3 text-gray-400 pointer-events-none">{icon}</div>
          )}

          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={`w-full text-sm text-gray-900 outline-none bg-transparent py-2 ${
              icon ? "pl-2 pr-4" : "px-2"
            } ${disabled ? "text-gray-400 bg-gray-50" : "text-gray-900"}`}
            {...rest}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-1 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
};

export default FormSelect;
