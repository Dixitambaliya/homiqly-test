import React from 'react';

const FormCheckbox = ({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  error,
  className = '',
  ...rest
}) => {
  return (
    <div className={`flex items-start mb-4 ${className}`}>
      <div className="flex items-center h-5">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${error ? 'border-error' : ''}
          `}
          {...rest}
        />
      </div>
      <div className="ml-3 text-sm">
        <label 
          htmlFor={name} 
          className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}
        >
          {label}
        </label>
        
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
      </div>
    </div>
  );
};

export default FormCheckbox;