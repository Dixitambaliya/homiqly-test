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

  // Measure dropdown position when open
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  // Close on outside click (including portal)
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        !containerRef.current?.contains(e.target) &&
        !listRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = i - 1;
          return next < 0 ? normOptions.length - 1 : next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < normOptions.length) {
          const opt = normOptions[highlightIndex];
          triggerChange(opt.value);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
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
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center rounded-lg border ${
          error ? "border-red-400" : "border-gray-300"
        } bg-white shadow-sm transition-colors`}
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
          className={`w-full text-left text-sm py-2 pr-3 outline-none bg-transparent flex items-center gap-2 ${
            icon ? "pl-2" : "px-3"
          } ${disabled ? "text-gray-400 bg-gray-50" : "text-gray-900"}`}
        >
          <span className="truncate text-sm">
            {selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>

          <span className="ml-auto text-gray-400 text-xs select-none">
            {/* chevron */}
            <svg
              className={`w-4 h-4 transform transition-transform ${
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
        <p className="text-sm text-red-500 mt-1 font-medium">{error}</p>
      )}

      {/* dropdown rendered via portal */}
      {open &&
        createPortal(
          <div
            ref={listRef}
            className="absolute z-50 rounded-lg ring-1 ring-black ring-opacity-5 bg-white shadow-lg overflow-auto max-h-56"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              position: "absolute",
            }}
            role="listbox"
            tabIndex={-1}
          >
            <ul className="max-h-56 overflow-auto focus:outline-none">
              {normOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-500">No options</li>
              ) : (
                normOptions.map((opt, idx) => {
                  const active = String(opt.value) === String(value);
                  const highlighted = idx === highlightIndex;
                  return (
                    <li
                      key={String(opt.value) + "-" + idx}
                      role="option"
                      aria-selected={active}
                      className={`cursor-pointer select-none px-4 py-2 text-sm flex items-center gap-3 ${
                        active
                          ? "bg-sky-50 text-sky-700 font-medium"
                          : "text-gray-800"
                      } ${highlighted ? "bg-gray-100" : ""} hover:bg-gray-100`}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseLeave={() => setHighlightIndex(-1)}
                      onClick={() => triggerChange(opt.value)}
                    >
                      <span className="truncate">{opt.label}</span>
                      {active && (
                        <span className="ml-auto text-xs text-sky-700 font-semibold">
                          Selected
                        </span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FormSelect;
