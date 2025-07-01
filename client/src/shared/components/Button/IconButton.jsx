import React from 'react';

const IconButton = ({
  icon,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  tooltip,
  className = '',
  ...rest
}) => {
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-dark text-white',
    secondary: 'bg-white border border-primary text-primary hover:bg-primary-light/10',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: 'bg-error hover:bg-red-600 text-white',
    success: 'bg-success hover:bg-green-600 text-white',
    warning: 'bg-warning hover:bg-yellow-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
  };
  
  // Size classes
  const sizeClasses = {
    xs: 'p-1 text-xs',
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-2.5 text-lg',
    xl: 'p-3 text-xl',
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={tooltip}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...rest}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        icon
      )}
    </button>
  );
};

export default IconButton;