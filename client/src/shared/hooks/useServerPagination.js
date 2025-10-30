// src/shared/hooks/useServerPagination.js
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * useServerPagination - robust normalization
 */
export default function useServerPagination(
  fetcher,
  initial = {},
  options = {}
) {
  const {
    page: initialPage = 1,
    limit: initialLimit = 10,
    search: initialSearch = "",
    filters: initialFilters = {},
  } = initial;

  const { debounceMs = 350, preserveDataOnFetch = false } = options;

  const [page, setPageState] = useState(Number(initialPage));
  const [limit, setLimitState] = useState(Number(initialLimit));
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);

  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((s) => (s === search ? s : search));
      setPageState(1);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [search, debounceMs]);

  const normalizedParams = useMemo(
    () => ({
      page: Number(page),
      limit: Number(limit),
      search: debouncedSearch?.trim() || undefined,
      ...filters,
    }),
    [page, limit, debouncedSearch, filters]
  );

  const fetchPage = useCallback(
    async (opts = { keepPage: false }) => {
      setLoading(true);
      setError(null);
      try {
        if (!preserveDataOnFetch) setData([]);
        const res = await fetcher(normalizedParams);

        // payload might be res, res.data, or already normalized
        const payload = res?.data ?? res ?? {};

        // detect page array in common fields (data, rows, applications, items, etc.)
        const pageData =
          Array.isArray(payload?.data) && payload.data.length >= 0
            ? payload.data
            : Array.isArray(payload?.rows) && payload.rows.length >= 0
            ? payload.rows
            : Array.isArray(payload?.applications) &&
              payload.applications.length >= 0
            ? payload.applications
            : Array.isArray(payload?.items) && payload.items.length >= 0
            ? payload.items
            : Array.isArray(payload)
            ? payload
            : [];

        // Prefer explicit totals from server; fallback to length of pageData
        const apiTotal =
          Number(
            payload?.total ?? payload?.totalRecords ?? payload?.count ?? -1
          ) >= 0
            ? Number(payload?.total ?? payload?.totalRecords ?? payload?.count)
            : Array.isArray(pageData)
            ? pageData.length
            : 0;

        // page and limit from payload or from requested params
        const apiPage =
          typeof payload?.currentPage !== "undefined"
            ? Number(payload.currentPage)
            : typeof payload?.page !== "undefined"
            ? Number(payload.page)
            : Number(normalizedParams.page);

        const apiLimit =
          typeof payload?.limit !== "undefined"
            ? Number(payload.limit)
            : Number(normalizedParams.limit);

        // totalPages: prefer server-provided, else compute defensively
        const apiTotalPages =
          typeof payload?.totalPages !== "undefined"
            ? Number(payload.totalPages)
            : apiLimit > 0
            ? Math.max(1, Math.ceil((apiTotal || 0) / apiLimit))
            : 1;

        // commit state
        setData(Array.isArray(pageData) ? pageData : []);
        setTotal(Number(apiTotal) || 0);
        setTotalPages(Number(apiTotalPages) || 1);

        // sync page/limit with server where appropriate
        if (!opts.keepPage) {
          if (apiPage && apiPage !== page) setPageState(Number(apiPage));
        }
        if (apiLimit && apiLimit !== limit) setLimitState(Number(apiLimit));
      } catch (err) {
        setError(err);
        setData([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [fetcher, normalizedParams, preserveDataOnFetch] // avoid including page/limit here; normalizedParams changes when needed
  );

  // auto fetch when relevant params change
  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // helpers
  const goToPage = (p) => {
    const bounded = Math.max(1, Math.min(totalPages || 1, Number(p)));
    if (bounded !== page) setPageState(bounded);
  };

  const changeLimit = (newLimit) => {
    setLimitState(Number(newLimit));
    setPageState(1);
  };

  const refresh = () => fetchPage({ keepPage: true });

  const reset = (opts = {}) => {
    setSearch(initialSearch);
    setFilters(initialFilters);
    setLimitState(Number(initialLimit));
    setPageState(Number(initialPage));
    if (opts.fetch !== false) fetchPage();
  };

  return {
    state: {
      data,
      loading,
      error,
      page,
      limit,
      total,
      totalPages,
      search,
      filters,
    },
    actions: {
      setPage: goToPage,
      setLimit: changeLimit,
      setSearch,
      setFilters,
      refresh,
      reset,
      fetchPage,
    },
  };
}
