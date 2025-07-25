import React from "react";
import { useLoader } from "../context/loaderContext";

const GlobalLoader = () => {
  const { loading } = useLoader();

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 z-50 w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin" />
    </div>
  );
};

export default GlobalLoader;
