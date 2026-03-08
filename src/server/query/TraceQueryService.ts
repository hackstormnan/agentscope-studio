import type { TraceQuery, TraceQueryResult } from '../../core/query-model';
import type { TraceStore, TraceSummary } from '../storage/TraceStore';
import { applyFilters, applySort, encodeCursor, decodeCursor } from './query-utils';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * Executes structured {@link TraceQuery} requests against the trace store.
 *
 * All filtering, sorting, and pagination is performed in-memory using the
 * summaries returned by {@link TraceStore.getAllSummaries}. This is suitable
 * for development and small-to-medium datasets. A production implementation
 * would push predicates into the storage layer.
 */
export class TraceQueryService {
  constructor(private readonly store: TraceStore) {}

  async execute(query: TraceQuery): Promise<TraceQueryResult<TraceSummary>> {
    // 1. Fetch all summaries from the storage layer.
    const all = await this.store.getAllSummaries();

    // 2. Apply filters (AND semantics across all filter entries).
    const filtered = applyFilters(all, query.filters);

    // 3. Apply sort (mutates the filtered array in place).
    if (query.sort) {
      applySort(filtered, query.sort);
    }

    // 4. Resolve pagination bounds.
    const limit  = resolveLimit(query.limit);
    const offset = query.cursor ? decodeCursor(query.cursor) : 0;

    // 5. Slice the page.
    const page = filtered.slice(offset, offset + limit);

    // 6. Determine whether a next page exists.
    const nextOffset = offset + limit;
    const nextCursor = nextOffset < filtered.length
      ? encodeCursor(nextOffset)
      : undefined;

    return {
      items: page,
      nextCursor,
      appliedQuery: query,
    };
  }
}

function resolveLimit(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}
