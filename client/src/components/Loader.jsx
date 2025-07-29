import React from "react";

const Loader = () => {
  return (
    <div>
      {" "}
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-light"></div>
      </div>
    </div>
  );
};

export default Loader;
