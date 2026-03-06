import { useState, useEffect, useCallback } from 'react';
import { getTraceStats, listTraces } from '../../lib/api';
import type { DashboardStats, TraceSummary } from '../../lib/api';
import type { FiltersValue } from './TraceFilters';

export interface UseTracesResult {
  // Stats
  stats: DashboardStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Traces list
  traces: TraceSummary[];
  tracesLoading: boolean;
  tracesError: string | null;
  hasMore: boolean;

  // Filter state (owned here so the hook can debounce sessionId)
  filters: FiltersValue;
  setFilters: (f: FiltersValue) => void;

  // Actions
  refresh: () => void;
  loadMore: () => void;
}

const LIMIT = 25;
const SESSION_DEBOUNCE_MS = 350;

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

export function useTraces(): UseTracesResult {
  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError]   = useState<string | null>(null);

  const [traces, setTraces]             = useState<TraceSummary[]>([]);
  const [tracesLoading, setTracesLoading] = useState(true);
  const [tracesError, setTracesError]   = useState<string | null>(null);
  const [nextCursor, setNextCursor]     = useState<string | undefined>();

  const [filters, setFilters]           = useState<FiltersValue>({ sessionId: '', hasError: '' });
  // Debounced copy of sessionId — the actual fetch uses this.
  const [debouncedSession, setDebouncedSession] = useState('');

  // Incrementing this triggers a full re-fetch of both stats and traces.
  const [epoch, setEpoch] = useState(0);

  const refresh = useCallback(() => setEpoch((e) => e + 1), []);

  // ── Debounce sessionId ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSession(filters.sessionId), SESSION_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters.sessionId]);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);

    getTraceStats()
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((err: unknown) => { if (!cancelled) setStatsError(errMsg(err)); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });

    return () => { cancelled = true; };
  }, [epoch]);

  // ── Fetch traces (first page) ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTracesLoading(true);
    setTracesError(null);
    setNextCursor(undefined);

    listTraces({
      limit:     LIMIT,
      sessionId: debouncedSession || undefined,
      hasError:  filters.hasError === '' ? undefined : filters.hasError === 'true',
    })
      .then(({ items, nextCursor: nc }) => {
        if (cancelled) return;
        setTraces(items);
        setNextCursor(nc);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTracesError(errMsg(err));
        setTraces([]);
      })
      .finally(() => { if (!cancelled) setTracesLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSession, filters.hasError, epoch]);

  // ── Load next page ────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!nextCursor) return;

    listTraces({
      limit:     LIMIT,
      cursor:    nextCursor,
      sessionId: debouncedSession || undefined,
      hasError:  filters.hasError === '' ? undefined : filters.hasError === 'true',
    })
      .then(({ items, nextCursor: nc }) => {
        setTraces((prev) => [...prev, ...items]);
        setNextCursor(nc);
      })
      .catch((err: unknown) => console.error('[useTraces] loadMore failed:', errMsg(err)));
  }, [nextCursor, debouncedSession, filters.hasError]);

  return {
    stats, statsLoading, statsError,
    traces, tracesLoading, tracesError,
    hasMore: !!nextCursor,
    filters, setFilters,
    refresh, loadMore,
  };
}
