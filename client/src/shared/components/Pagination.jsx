import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Button } from "./Button";
import { FormSelect } from "./Form";

/**
 * Pagination
 * Props:
 * - page, totalPages, onPage, onLimit, limit, total, limitOptions, windowSize
 * - minimal white-themed Tailwind styles
 */
const Pagination = ({
  page,
  totalPages,
  onPage,
  onNext,
  onPrev,
  limit,
  onLimit,
  limitOptions = [5, 10, 20, 50],
  total,
  windowSize = 5,
}) => {
  const getWindow = useMemo(() => {
    const size = Math.max(3, windowSize);
    let start = Math.max(1, page - Math.floor(size / 2));
    let end = Math.min(totalPages, start + size - 1);
    if (end - start + 1 < size) {
      start = Math.max(1, end - size + 1);
    }
    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [page, totalPages, windowSize]);

  const showStartEllipsis = getWindow.length && getWindow[0] > 2;
  const showEndEllipsis =
    getWindow.length && getWindow[getWindow.length - 1] < totalPages - 1;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t bg-white">
      <div className="flex items-center gap-3">
        <label className="text-sm">Show</label>
        <FormSelect
          className=""
          dropdownDirection="auto"
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          options={limitOptions.map((opt) => ({ value: opt, label: opt }))}
        />
        <span className="ml-2 text-sm text-gray-600 flex gap-1">
          {total === 0 ? (
            "No entries"
          ) : (
            <>
              Showing <strong>{Math.min((page - 1) * limit + 1, total)}</strong>{" "}
              to <strong>{Math.min(page * limit, total)}</strong> of{" "}
              <strong>{total}</strong>
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
          aria-label="First page"
        >
          First
        </Button>
        <Button
          onClick={() => {
            onPrev?.();
            onPage(page - 1);
          }}
          variant="ghost"
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
          aria-label="Previous page"
        >
          Prev
        </Button>

        <div className="flex items-center gap-1">
          {getWindow[0] > 1 && (
            <>
              <Button
                onClick={() => onPage(1)}
                className="px-3 py-1 border rounded text-sm"
              >
                1
              </Button>
              {showStartEllipsis && (
                <span className="px-2 text-sm text-gray-500">…</span>
              )}
            </>
          )}

          {getWindow.map((p) => (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`px-3 py-1 border rounded-md  ${
                p === page ? "bg-gray-100 font-bold" : ""
              }`}
            >
              {p}
            </button>
          ))}

          {showEndEllipsis && (
            <>
              <span className="px-2 text-sm text-gray-500">…</span>
              <Button
                onClick={() => onPage(totalPages)}
                className="px-3 py-1 border rounded text-sm"
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            onNext?.();
            onPage(page + 1);
          }}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
          aria-label="Next page"
        >
          Next
        </Button>

        <Button
          variant="ghost"
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
          aria-label="Last page"
        >
          Last
        </Button>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPage: PropTypes.func.isRequired,
  onNext: PropTypes.func,
  onPrev: PropTypes.func,
  limit: PropTypes.number,
  onLimit: PropTypes.func,
  limitOptions: PropTypes.array,
  total: PropTypes.number,
  windowSize: PropTypes.number,
};

export default React.memo(Pagination);
