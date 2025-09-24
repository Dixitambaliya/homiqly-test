import React from "react";

const IconButton = ({
  icon,
  onClick,
  variant = "lightPrimary",
  size = "md",
  disabled = false,
  isLoading = false,
  tooltip,
  className = "",
  ...rest
}) => {
  // Variant classes
  const variantClasses = {
    primary:
      "bg-primary hover:bg-primary-dark text-white focus:outline-none focus:ring-1 focus:ring-primary",
    secondary:
      "bg-white border border-primary text-primary hover:bg-primary-light/10 focus:outline-none focus:ring-1 focus:ring-primary",
    outline:
      "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300",
    danger:
      "bg-error hover:bg-red-600 text-white focus:outline-none focus:ring-1 focus:ring-red-500",
    success:
      "bg-success hover:bg-green-600 text-white focus:outline-none focus:ring-1 focus:ring-green-500",
    warning:
      "bg-warning hover:bg-yellow-600 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500",
    ghost:
      "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300",

    inherit:
      "bg-transparent text-current hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300",
    light:
      "bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300",
    lightPrimary:
      "bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-1 focus:ring-green-300",
    lightSecondary:
      "bg-purple-100 text-purple-700 hover:bg-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-300",
    lightInfo:
      "bg-sky-100 text-sky-700 hover:bg-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-300",
    lightSuccess:
      "bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-1 focus:ring-green-300",
    lightWarning:
      "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-1 focus:ring-yellow-300",
    lightDanger:
      "bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-1 focus:ring-red-300",
    lightBlack:
      "bg-gray-200 text-black hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400",
    lightWhite:
      "bg-white text-black hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-200",
    lightGhost:
      "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300",
  };

  // Size classes
  const sizeClasses = {
    xs: "p-1 text-xs",
    sm: "p-1.5 text-sm",
    md: "p-2 text-base",
    lg: "p-2.5 text-lg",
    xl: "p-3 text-xl",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={tooltip}
      className={`
        inline-flex items-center justify-center rounded-full p-2
        transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${
          disabled || isLoading
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer"
        }
        ${className}
      `}
      {...rest}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        icon
      )}
    </button>
  );
};

export default IconButton;
