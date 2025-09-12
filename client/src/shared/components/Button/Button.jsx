import React from "react";
import { Loader2 } from "lucide-react";

const Button = ({
  children,
  type = "button",
  variant = "lightPrimary",
  size = "md",
  onClick,
  disabled = false,
  isLoading = false,
  icon,
  className = "",
  ...rest
}) => {
  const variantClasses = {
    inherit:
      "bg-gray-800 text-white hover:bg-gray-900 border border-gray-800 hover:border-gray-900 focus:ring-1 focus:ring-offset-1 focus:ring-gray-800",
    primary:
      "bg-green-600 text-white hover:bg-green-700 focus:ring-1 focus:ring-offset-1 focus:ring-green-600 border border-green-600 hover:border-green-700",
    secondary:
      "bg-purple-600 text-white hover:bg-purple-700 focus:ring-1 focus:ring-offset-1 focus:ring-purple-600 border border-purple-600 hover:border-purple-700",
    info: "bg-sky-500 text-white hover:bg-sky-600 focus:ring-1 focus:ring-offset-1 focus:ring-sky-500 border border-sky-500 hover:border-sky-600",
    success:
      "bg-green-500 text-white hover:bg-green-600 focus:ring-1 focus:ring-offset-1 focus:ring-green-500 border border-green-500 hover:border-green-600",
    warning:
      "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-1 focus:ring-offset-1 focus:ring-yellow-500 border border-yellow-500 hover:border-yellow-600",
    error:
      "bg-red-500 text-white hover:bg-red-600 focus:ring-1 focus:ring-offset-1 focus:ring-red-500 border border-red-500 hover:border-red-600",
    black:
      "bg-black text-white hover:bg-gray-900 border border-black hover:border-gray-900 focus:ring-1 focus:ring-offset-1 focus:ring-black",
    white:
      "bg-white text-black border hover:bg-gray-100 hover:border-gray-200 focus:ring-1 focus:ring-offset-1 focus:ring-gray-100",
    lightInherit:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-200 hover:border-gray-300 focus:ring-1 focus:ring-offset-1 focus:ring-gray-200",
    lightPrimary:
      "bg-green-100 text-green-700 hover:bg-green-200 border border-green-100 hover:border-green-200 focus:ring-1 focus:ring-offset-1 focus:ring-green-100",
    lightSecondary:
      "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-100 hover:border-purple-200 focus:ring-1 focus:ring-offset-1 focus:ring-purple-100",
    lightInfo:
      "bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-100 hover:border-sky-200 focus:ring-1 focus:ring-offset-1 focus:ring-sky-100",
    lightSuccess:
      "bg-green-100 text-green-700 hover:bg-green-200 border border-green-100 hover:border-green-200 focus:ring-1 focus:ring-offset-1 focus:ring-green-100",
    lightWarning:
      "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-100 hover:border-yellow-200 focus:ring-1 focus:ring-offset-1 focus:ring-yellow-100",
    lightError:
      "bg-red-100 text-red-700 hover:bg-red-200 border border-red-100 hover:border-red-200 focus:ring-1 focus:ring-offset-1 focus:ring-red-100",
    lightBlack:
      "bg-gray-200 text-black hover:bg-gray-300 border border-gray-200 hover:border-gray-300 focus:ring-1 focus:ring-offset-1 focus:ring-gray-200",
    outline:
      "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-1 focus:ring-offset-1 focus:ring-gray-300 ",
    ghost:
      "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-100 hover:border-gray-200 focus:ring-1 focus:ring-offset-1 focus:ring-gray-100",
  };

  const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    xl: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        transition-colors duration-200 ease-in-out
        
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
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
