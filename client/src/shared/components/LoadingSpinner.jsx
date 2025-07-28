import React from "react";

const colorVariants = {
  primary: ["bg-blue-600", "bg-blue-400"],
  secondary: ["bg-purple-600", "bg-purple-400"],
  outline: ["bg-gray-600", "bg-gray-400"],
  danger: ["bg-red-600", "bg-red-400"],
  success: ["bg-green-600", "bg-green-500"],
  warning: ["bg-yellow-500", "bg-yellow-300"],
  ghost: ["bg-gray-300", "bg-gray-100"],
};

const LoadingSlider = ({ fullscreen = false, color = "success" }) => {
  const [bar1, bar2] = colorVariants[color] || colorVariants["primary"];

  return (
    <div
      className={`w-full h-96 flex items-center justify-center ${
        fullscreen ? "fixed inset-0 z-50 bg-white/60" : ""
      }`}
    >
      <div className="w-96 h-1 bg-gray-200 overflow-hidden relative rounded">
        <div className={`absolute h-full ${bar1} animate-slide1`}></div>
        <div className={`absolute h-full ${bar2} animate-slide2`}></div>
      </div>
    </div>
  );
};

export default LoadingSlider;
