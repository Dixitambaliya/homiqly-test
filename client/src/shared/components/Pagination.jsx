import React from "react";

/** Build a compact page list: 1 … (c-1) c (c+1) … total */
function getPages(current, total, delta = 1) {
  if (!total || total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  pages.push(1);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

/**
 * Pagination (all-in-one)
 *
 * Props:
 * - page (number)                 current page (1-based)
 * - totalPages (number)           total pages
 * - onPageChange (fn)             (p:number) => void
 * - disabled (bool)               disable all controls
 * - keepVisibleOnSinglePage (bool) default: true (show even when totalPages<=1)
 *
 * - totalRecords (number)         for "Showing A–B of N" summary
 * - limit (number)                current page size
 * - onLimitChange (fn)            (next:number) => void
 * - pageSizeOptions (number[])    default: [5,10,20,50]
 * - renderLimitSelect (fn)        optional renderer to use a custom <FormSelect/>
 *                                 signature: ({value,onChange,options}) => ReactNode
 *
 * - className (string)            container class override
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
  keepVisibleOnSinglePage = true,

  totalRecords,
  limit,
  onLimitChange,
  pageSizeOptions = [5, 10, 20, 50],
  renderLimitSelect,

  className = "",
}) {
  const show =
    keepVisibleOnSinglePage ? true : (totalPages && totalPages > 1);

  if (!show) return null;

  const safePage = Math.max(1, Math.min(totalPages || 1, page || 1));
  const pages = getPages(safePage, totalPages || 1);
  const allDisabled = disabled || totalPages <= 1;

  const btnBase =
    "inline-flex items-center justify-center min-w-9 h-9 rounded-md border text-sm px-3 disabled:opacity-50";
  const active = "bg-gray-900 text-white border-gray-900";
  const normal = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
  const ghost = "text-gray-700 border-gray-300 hover:bg-gray-50";

  // Range summary
  const hasSummary = Number.isFinite(totalRecords) && Number.isFinite(limit);
  const startIdx = hasSummary
    ? Math.min((safePage - 1) * limit + 1, totalRecords)
    : null;
  const endIdx = hasSummary
    ? Math.min(safePage * limit, totalRecords)
    : null;

  // Default fallback <select> if user didn't provide a custom FormSelect
  const DefaultSelect = ({ value, onChange, options }) => (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="border rounded px-2 py-1 text-sm"
      aria-label="Rows per page"
    >
      {options.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );

  const LimitSelect = renderLimitSelect || DefaultSelect;

  return (
    <div
      className={
        "flex flex-row items-center justify-end gap-3 p-4  " +
        className
      }
    >
      {/* Left: page size + range summary */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Range summary */}
        <div
          className="text-sm text-gray-600 whitespace-nowrap"
          aria-live="polite"
        >
          {hasSummary ? (
            <>
              Showing <strong>{startIdx}</strong>–<strong>{endIdx}</strong> of{" "}
              <strong>{totalRecords}</strong> entries
            </>
          ) : (
            <>Page {safePage} of {totalPages || 1}</>
          )}
        </div>

        {/* Page size dropdown (optional) */}
        {typeof onLimitChange === "function" && Number.isFinite(limit) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows:</span>
            <LimitSelect
              value={limit}
              onChange={onLimitChange}
              options={pageSizeOptions}
            />
          </div>
        )}
      </div>

      {/* Right: page indicator + controls */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:block text-sm text-gray-600 mr-2 whitespace-nowrap">
          Page {safePage} of {totalPages || 1}
        </div>

        <button
          className={`${btnBase} ${ghost}`}
          onClick={() => onPageChange?.(1)}
          disabled={allDisabled || safePage === 1}
          aria-label="First page"
        >
          «
        </button>
        <button
          className={`${btnBase} ${ghost}`}
          onClick={() => onPageChange?.(Math.max(1, safePage - 1))}
          disabled={allDisabled || safePage === 1}
          aria-label="Previous page"
        >
          ‹
        </button>

        {pages.map((p, idx) =>
          p === "…" ? (
            <span
              key={`dots-${idx}`}
              className="px-2 text-gray-500 select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              className={`${btnBase} ${p === safePage ? active : normal}`}
              aria-current={p === safePage ? "page" : undefined}
              onClick={() => onPageChange?.(p)}
              disabled={allDisabled || p === safePage}
            >
              {p}
            </button>
          )
        )}

        <button
          className={`${btnBase} ${ghost}`}
          onClick={() => onPageChange?.(Math.min((totalPages || 1), safePage + 1))}
          disabled={allDisabled || safePage === (totalPages || 1)}
          aria-label="Next page"
        >
          ›
        </button>
        <button
          className={`${btnBase} ${ghost}`}
          onClick={() => onPageChange?.(totalPages || 1)}
          disabled={allDisabled || safePage === (totalPages || 1)}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}
