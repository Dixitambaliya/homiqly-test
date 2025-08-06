import React from 'react';

const FormTextarea = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  rows = 3,
  className = '',
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
          className={`relative rounded-lg border ${
            error ? "border-red-400" : "border-gray-300"
          } shadow-sm bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all`}
        >
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
            className={`
              w-full outline-none text-sm placeholder-gray-400 rounded-lg bg-transparent py-3 px-4 resize-none
              ${disabled ? "text-gray-400 bg-gray-50" : "text-gray-900"}
            `}
            {...rest}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-1 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
};

export default FormTextarea;
