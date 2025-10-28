import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * useServerPagination
 * - fetcher: async (params) => { data, total, page, totalPages, limit } OR various common shapes
 * - initial: { page, limit, search, filters }
 * - options: { debounceMs, preserveDataOnFetch }
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

  const [page, setPage] = useState(Number(initialPage));
  const [limit, setLimit] = useState(Number(initialLimit));
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
      // reset page on search change
      setPage(1);
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

        // Try to normalize different common API shapes
        // Expect either: { data, total, page, totalPages, limit } OR { rows, total, currentPage }
        const payload = res?.data ?? res ?? {};

        // find array payload
        const pageData =
          payload?.rows ??
          payload?.data ??
          payload?.items ??
          payload?.applications ??
          payload;

        // total records
        const apiTotal =
          Number(payload?.totalRecords ?? payload?.total ?? payload?.count) ||
          (Array.isArray(pageData) ? pageData.length : 0);

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

        const apiTotalPages =
          typeof payload?.totalPages !== "undefined"
            ? Number(payload.totalPages)
            : Math.max(1, Math.ceil(apiTotal / (apiLimit || apiLimit)));

        setData(Array.isArray(pageData) ? pageData : []);
        setTotal(Number(apiTotal) || 0);
        setTotalPages(Number(apiTotalPages) || 1);

        // keep page/limit in sync with server if changed
        if (!opts.keepPage) {
          if (apiPage && apiPage !== page) setPage(apiPage);
        }
        if (apiLimit && apiLimit !== limit) setLimit(apiLimit);
      } catch (err) {
        setError(err);
        setData([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [fetcher, normalizedParams, preserveDataOnFetch, page, limit]
  );

  // auto fetch when relevant params change
  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // helpers
  const goToPage = (p) => {
    const bounded = Math.max(1, Math.min(totalPages, Number(p)));
    if (bounded !== page) setPage(bounded);
  };

  const changeLimit = (newLimit) => {
    setLimit(Number(newLimit));
    setPage(1);
  };

  const refresh = () => fetchPage({ keepPage: true });

  const reset = (opts = {}) => {
    setSearch(initialSearch);
    setFilters(initialFilters);
    setLimit(initialLimit);
    setPage(initialPage);
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
