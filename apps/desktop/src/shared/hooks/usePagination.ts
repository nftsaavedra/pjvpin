import { useCallback, useState } from "react";

export interface PaginationState {
  page: number;
  limit: number;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
}

export function usePagination(initialPage = 1, initialLimit = 10): UsePaginationReturn {
  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
  });

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState(() => ({ page: 1, limit }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  const reset = useCallback(() => {
    setState({ page: initialPage, limit: initialLimit });
  }, [initialPage, initialLimit]);

  return { page: state.page, limit: state.limit, setPage, setLimit, nextPage, prevPage, reset };
}
