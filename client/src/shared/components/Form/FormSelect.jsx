import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error,
  placeholder = "Select an option",
  icon,
  className = "",
  id,
  // NEW props:
  dropdownDirection = "down", // "down" | "up" | "auto"
  dropdownMaxHeight = 150, // px, matches Tailwind max-h-56 (14rem = 224px)
  ...rest
}) => {
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [resolvedDirection, setResolvedDirection] = useState("down"); // actual chosen direction

  // Normalize options: ensure { label, value }
  const normOptions = options.map((opt) =>
    typeof opt === "object" ? opt : { label: String(opt), value: opt }
  );

  const selectedOption = normOptions.find(
    (o) => String(o.value) === String(value)
  );

  useEffect(() => {
    // reset highlight if options change or open toggles
    if (!open) setHighlightIndex(-1);
  }, [open, options.length]);

  // Determine dropdown position + direction when opening
  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      // space below and above trigger (viewport coordinates)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Decide direction
      let dir = dropdownDirection;
      if (dropdownDirection === "auto") {
        // prefer down if there's enough space below else choose above if above has more room
        if (spaceBelow >= dropdownMaxHeight) dir = "down";
        else if (spaceAbove >= dropdownMaxHeight) dir = "up";
        else {
          // none fits fully, choose side with more space
          dir = spaceBelow >= spaceAbove ? "down" : "up";
        }
      }

      // compute top coordinate based on chosen direction
      let top;
      if (dir === "down") {
        top = rect.bottom + scrollY;
      } else {
        // For up direction, we need to calculate based on actual content height
        // Since we don't know the exact height, we'll use the max height
        top = rect.top + scrollY - Math.min(dropdownMaxHeight, normOptions.length * 40); // Estimate 40px per item
        // If top goes above document (negative), clamp to 0
        if (top < 0) top = 0;
      }

      setResolvedDirection(dir);
      setDropdownPos({
        top,
        left: rect.left + scrollX,
        width: rect.width,
      });
    };

    updatePosition();
  }, [open, dropdownDirection, dropdownMaxHeight, normOptions.length]);

  // Close on outside click and scroll (including portal)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        !containerRef.current?.contains(e.target) &&
        !listRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleScroll = (e) => {
      // Only close if the scroll event is not inside the dropdown itself
      if (!listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
      // Use passive: true for better performance on scroll events
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
      document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [open]);

  // Update dropdown position on window resize
  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let dir = resolvedDirection;
      
      // Recalculate direction if auto
      if (dropdownDirection === "auto") {
        if (spaceBelow >= dropdownMaxHeight) dir = "down";
        else if (spaceAbove >= dropdownMaxHeight) dir = "up";
        else {
          dir = spaceBelow >= spaceAbove ? "down" : "up";
        }
        setResolvedDirection(dir);
      }

      let top;
      if (dir === "down") {
        top = rect.bottom + scrollY;
      } else {
        top = rect.top + scrollY - Math.min(dropdownMaxHeight, normOptions.length * 40);
        if (top < 0) top = 0;
      }

      setDropdownPos({
        top,
        left: rect.left + scrollX,
        width: rect.width,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, resolvedDirection, dropdownDirection, dropdownMaxHeight, normOptions.length]);

  // Keyboard handlers for accessibility
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = i + 1;
          return next >= normOptions.length ? 0 : next;
        });
        
        // Scroll highlighted item into view
        setTimeout(() => {
          const highlightedItem = listRef.current?.querySelector('[data-highlighted="true"]');
          highlightedItem?.scrollIntoView({ block: 'nearest' });
        }, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = i - 1;
          return next < 0 ? normOptions.length - 1 : next;
        });
        
        // Scroll highlighted item into view
        setTimeout(() => {
          const highlightedItem = listRef.current?.querySelector('[data-highlighted="true"]');
          highlightedItem?.scrollIntoView({ block: 'nearest' });
        }, 0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < normOptions.length) {
          const opt = normOptions[highlightIndex];
          triggerChange(opt.value);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener("keydown", onKey);
    }
    
    return () => document.removeEventListener("keydown", onKey);
  }, [open, highlightIndex, normOptions]);

  const triggerChange = (newValue) => {
    // Mimic native event shape so existing handlers work
    if (onChange && !disabled) {
      onChange({ target: { name, value: newValue } });
    }
    setOpen(false);
    // small timeout to allow focus/visual update
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((v) => !v);
  };

  // Handle click on dropdown items
  const handleItemClick = (value) => {
    triggerChange(value);
  };

  return (
    <div
      className={`w-full relative ${className}`}
      ref={containerRef}
      {...rest}
    >
      {label && (
        <label
          htmlFor={id || name}
          className="block mb-1 text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center rounded-lg border ${
          error ? "border-red-400" : "border-gray-300"
        } bg-white shadow-sm transition-colors focus-within:ring-1 focus-within:ring-green-500  ${
          disabled ? "bg-gray-50 cursor-not-allowed" : ""
        }`}
      >
        {/* left icon */}
        {icon && (
          <div className="pl-3 text-gray-400 pointer-events-none">{icon}</div>
        )}

        {/* button that behaves as the select trigger */}
        <button
          id={id || name}
          type="button"
          ref={buttonRef}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={id || name}
          onClick={toggleOpen}
          disabled={disabled}
          className={`w-full text-left text-sm py-2.5 pr-3 outline-none bg-transparent flex items-center gap-2 ${
            icon ? "pl-2" : "px-3"
          } ${disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-900 cursor-pointer"}`}
        >
          <span className="flex-1 text-sm truncate">
            {selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>

          <span className="flex-shrink-0 ml-2 text-gray-400 select-none">
            {/* chevron */}
            <svg
              className={`w-4 h-4 transform transition-transform duration-200 ${
                open ? "rotate-180" : "rotate-0"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      {/* error message */}
      {error && (
        <p className="mt-1 text-sm font-medium text-red-500">{error}</p>
      )}

      {/* dropdown rendered via portal */}
      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-50 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownMaxHeight,
              minWidth: dropdownPos.width, // Ensure minimum width matches trigger
            }}
            role="listbox"
            aria-labelledby={id || name}
            tabIndex={-1}
            data-direction={resolvedDirection}
          >
            <div className="max-h-full overflow-auto">
              {normOptions.length === 0 ? (
                <div 
                  className="px-4 py-3 text-sm text-center text-gray-500"
                  role="option"
                >
                  No options available
                </div>
              ) : (
                <ul className="py-1">
                  {normOptions.map((opt, idx) => {
                    const active = String(opt.value) === String(value);
                    const highlighted = idx === highlightIndex;
                    return (
                      <li
                        key={String(opt.value) + "-" + idx}
                        role="option"
                        aria-selected={active}
                        data-highlighted={highlighted}
                        className={`cursor-pointer select-none px-4 py-2 text-sm transition-colors duration-150 w-auto${
                          active
                            ? "bg-blue-50 text-green-600 font-medium"
                            : "text-gray-800"
                        } ${
                          highlighted ? "bg-gray-100" : ""
                        } hover:bg-gray-100 active:bg-gray-200`}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onMouseLeave={() => setHighlightIndex(-1)}
                        onClick={() => handleItemClick(opt.value)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{opt.label}</span>
                          {active && (
                            <svg
                              className="flex-shrink-0 w-4 h-4 ml-2 text-green-600"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FormSelect;