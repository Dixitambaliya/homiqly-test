import React, { useState } from "react";

const FormInput = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  icon,
  className = "",
  ...rest
}) => {
  const [touched, setTouched] = useState(false);
  const showError = required && touched && !value;

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
            showError || error ? "border-red-400" : "border-gray-300"
          } shadow-sm bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all`}
        >
          {icon && (
            <div className="pl-3 text-gray-400 pointer-events-none">{icon}</div>
          )}

          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={() => setTouched(true)} // Mark field as touched
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full outline-none text-sm placeholder-gray-400 rounded-lg bg-transparent py-1.5 ${
              icon ? "pl-2 pr-4" : "px-4"
            } ${disabled ? "text-gray-400 bg-gray-50" : "text-gray-900"}`}
            {...rest}
          />
        </div>

        {(showError || error) && (
          <p className="text-sm text-red-500 mt-1 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
};

export default FormInput;
