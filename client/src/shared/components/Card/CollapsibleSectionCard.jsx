import React, { useState, useRef, useEffect } from "react";

export const CollapsibleSectionCard = ({
  title,
  children,
  className = "",
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const innerRef = useRef(null); // actual content element to measure
  const [maxHeight, setMaxHeight] = useState("0px");

  // update measured max-height based on inner content's scrollHeight
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const updateHeight = () => {
      // use scrollHeight so the wrapper can transition to exact height
      if (open) {
        const h = el.scrollHeight;
        setMaxHeight(`${h}px`);
      } else {
        setMaxHeight("0px");
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        // when inner content resize happens (images load, nested collapsibles open etc.)
        updateHeight();
      });
      ro.observe(el);
      window.addEventListener("resize", updateHeight);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", updateHeight);
      };
    } else {
      // fallback: MutationObserver + resize
      const mo = new MutationObserver(() => updateHeight());
      mo.observe(el, { childList: true, subtree: true, attributes: true });
      window.addEventListener("resize", updateHeight);
      return () => {
        mo.disconnect();
        window.removeEventListener("resize", updateHeight);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, children]);

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="ml-4 p-2 rounded-md hover:bg-gray-100"
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${
              open ? "rotate-180" : "rotate-0"
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* wrapper that animates max-height */}
      <div
        style={{
          maxHeight,
          transition: "max-height 280ms ease",
          overflow: "hidden",
        }}
        aria-hidden={!open}
      >
        {/* inner content measured by ResizeObserver */}
        <div
          ref={innerRef}
          className={`p-6 transition-all duration-200 ease-in-out ${
            open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSectionCard;
