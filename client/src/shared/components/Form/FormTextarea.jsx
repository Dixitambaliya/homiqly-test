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
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      
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
          block w-full rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm
          pl-3 pr-3 py-2
          ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'}
          ${error ? 'border-error' : 'border-gray-300'}
        `}
        {...rest}
      />
      
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

export default FormTextarea;