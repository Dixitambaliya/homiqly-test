import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { IconButton } from "../Button";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      // Restore body scrolling when modal is closed
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Size classes
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      // onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-lg shadow-lg w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            {showCloseButton && (
              <IconButton
                onClick={onClose}
                variant="lightDanger"
                icon={<FiX />}
              ></IconButton>
            )}
          </div>
        )}

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
