import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Task G.2 — minimal data-fetching hook for the admin dashboard: local
 * loading/data/error state per widget plus a short-TTL module-level cache
 * keyed by endpoint+params, so revisiting a tab doesn't refetch (aggregate
 * views change infrequently). `reload()` always bypasses the cache — this
 * backs the explicit Refresh action.
 *
 * Each call site is independent: one widget's failure never touches
 * another's state.
 */
export const ADMIN_CACHE_TTL_MS = 60_000;

const cache = new Map<string, { data: unknown; at: number }>();

/** Called on logout / role loss so admin data never outlives an admin session. */
export function clearAdminCache(): void {
  cache.clear();
}

export type AdminQueryStatus = 'loading' | 'success' | 'error';

export interface AdminQueryResult<T> {
  status: AdminQueryStatus;
  data: T | null;
  error: unknown;
  reload: () => void;
}

export function useAdminQuery<T>(key: string, fetcher: () => Promise<T>): AdminQueryResult<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const cached = cache.get(key);
  const fresh = cached !== undefined && Date.now() - cached.at < ADMIN_CACHE_TTL_MS;

  const [state, setState] = useState<{ status: AdminQueryStatus; data: T | null; error: unknown }>(
    fresh
      ? { status: 'success', data: cached.data as T, error: null }
      : { status: 'loading', data: null, error: null }
  );

  const load = useCallback(
    async (force: boolean) => {
      const hit = cache.get(key);
      if (!force && hit && Date.now() - hit.at < ADMIN_CACHE_TTL_MS) {
        setState({ status: 'success', data: hit.data as T, error: null });
        return;
      }
      const id = ++requestId.current;
      setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
      try {
        const data = await fetcherRef.current();
        if (id !== requestId.current) return; // superseded by a newer request
        cache.set(key, { data, at: Date.now() });
        setState({ status: 'success', data, error: null });
      } catch (error) {
        if (id !== requestId.current) return;
        setState({ status: 'error', data: null, error });
      }
    },
    [key]
  );

  useEffect(() => {
    load(false);
    return () => {
      requestId.current += 1; // ignore results arriving after unmount / key change
    };
  }, [load]);

  const reload = useCallback(() => {
    load(true);
  }, [load]);

  return { status: state.status, data: state.data, error: state.error, reload };
}
