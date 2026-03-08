import { useState, useCallback } from 'react';
import type { TraceSummary } from '../../lib/api';
import type { DraftFilter, TraceQuery, TraceSort } from './types';
import { FIELD_OPERATORS, draftToFilter } from './types';
import { runQuery } from './api';

const LIMIT = 25;

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

function newDraft(field: DraftFilter['field'] = 'sessionId'): DraftFilter {
  return {
    id:       crypto.randomUUID(),
    field,
    operator: FIELD_OPERATORS[field][0],
    value:    field === 'hasError' ? 'true' : '',
  };
}

function buildQuery(
  drafts:  DraftFilter[],
  sort:    TraceSort,
  cursor?: string,
): TraceQuery {
  const filters = drafts.flatMap((d) => {
    const f = draftToFilter(d);
    return f ? [f] : [];
  });
  return { filters, sort, limit: LIMIT, cursor };
}

export interface UseQueryBuilderResult {
  // Filter state
  filters: DraftFilter[];
  addFilter:    () => void;
  removeFilter: (id: string) => void;
  updateFilter: (id: string, patch: Partial<DraftFilter>) => void;

  // Sort state
  sort:    TraceSort;
  setSort: (sort: TraceSort) => void;

  // Execution state
  items:   TraceSummary[];
  loading: boolean;
  error:   string | null;
  hasRun:  boolean;
  hasMore: boolean;

  // Actions
  execute:  () => Promise<void>;
  loadMore: () => Promise<void>;
  reset:    () => void;
}

export function useQueryBuilder(): UseQueryBuilderResult {
  const [filters, setFilters] = useState<DraftFilter[]>([]);
  const [sort, setSort]       = useState<TraceSort>({ field: 'createdAt', direction: 'desc' });

  const [items,   setItems]   = useState<TraceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasRun,  setHasRun]  = useState(false);

  // ── Filter mutations ───────────────────────────────────────────────────────

  const addFilter = useCallback(() => {
    setFilters((prev) => [...prev, newDraft()]);
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFilter = useCallback((id: string, patch: Partial<DraftFilter>) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        // When field changes, reset operator to first valid one for that field,
        // and reset value to sensible default.
        if (patch.field && patch.field !== f.field) {
          next.operator = FIELD_OPERATORS[patch.field][0];
          next.value    = patch.field === 'hasError' ? 'true' : '';
        }
        return next;
      }),
    );
  }, []);

  // ── Query execution ────────────────────────────────────────────────────────

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNextCursor(undefined);
    setItems([]);

    try {
      const result = await runQuery(buildQuery(filters, sort));
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setHasRun(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;

    try {
      const result = await runQuery(buildQuery(filters, sort, nextCursor));
      setItems((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.error('[useQueryBuilder] loadMore failed:', errMsg(err));
    }
  }, [nextCursor, filters, sort]);

  const reset = useCallback(() => {
    setFilters([]);
    setSort({ field: 'createdAt', direction: 'desc' });
    setItems([]);
    setError(null);
    setNextCursor(undefined);
    setHasRun(false);
  }, []);

  return {
    filters, addFilter, removeFilter, updateFilter,
    sort, setSort,
    items, loading, error, hasRun,
    hasMore: !!nextCursor,
    execute, loadMore, reset,
  };
}
