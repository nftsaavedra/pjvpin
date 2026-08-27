import { useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface UseDataCacheOptions {
  ttlMs: number;
}

export function useDataCache<T>(options: UseDataCacheOptions) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const { ttlMs } = options;

  const get = useCallback(
    (key: string): T | null => {
      const entry = cacheRef.current.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > ttlMs) {
        cacheRef.current.delete(key);
        return null;
      }
      return entry.data;
    },
    [ttlMs],
  );

  const set = useCallback((key: string, data: T) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const invalidate = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const has = useCallback(
    (key: string): boolean => {
      const entry = cacheRef.current.get(key);
      if (!entry) return false;
      if (Date.now() - entry.timestamp > ttlMs) {
        cacheRef.current.delete(key);
        return false;
      }
      return true;
    },
    [ttlMs],
  );

  return { get, set, invalidate, has };
}
