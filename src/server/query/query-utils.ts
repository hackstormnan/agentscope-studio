import type { TraceQueryFilter, TraceSort } from '../../core/query-model';
import type { TraceSummary } from '../storage/TraceStore';

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

/**
 * Reads the raw value of a filterable field from a TraceSummary.
 * Returns `undefined` for unknown field names (should not happen if callers
 * validate the query against the type, but guard defensively).
 */
function getField(summary: TraceSummary, field: TraceQueryFilter['field']): string | number | boolean | undefined {
  switch (field) {
    case 'traceId':      return summary.traceId;
    case 'sessionId':    return summary.sessionId;
    case 'hasError':     return summary.hasError;
    case 'totalLatency': return summary.totalLatency;
    case 'totalTokens':  return summary.totalTokens;
    case 'createdAt':    return summary.createdAt;
  }
}

// ---------------------------------------------------------------------------
// Single-filter evaluation
// ---------------------------------------------------------------------------

/**
 * Returns true when `summary` satisfies the given filter predicate.
 *
 * Invalid operator/field combinations are handled conservatively:
 *   - `contains` on a non-string field → false (no match, never throws)
 *   - comparison operators (gt/gte/lt/lte) on a boolean field → false
 *   - `createdAt` comparisons parse the ISO string into a Date timestamp
 *     so that lexicographic ordering matches chronological ordering.
 */
export function evaluateFilter(summary: TraceSummary, filter: TraceQueryFilter): boolean {
  const raw = getField(summary, filter.field);
  if (raw === undefined) return false;

  const { operator, value } = filter;

  switch (operator) {
    case 'eq':
      return raw === value;

    case 'contains': {
      // Only meaningful for string fields; treat non-strings as non-match.
      if (typeof raw !== 'string' || typeof value !== 'string') return false;
      return raw.toLowerCase().includes(value.toLowerCase());
    }

    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      // Booleans are not orderable in this context.
      if (typeof raw === 'boolean') return false;

      // Resolve comparable numbers. For createdAt, parse ISO strings to ms.
      const a: number = filter.field === 'createdAt'
        ? Date.parse(raw as string)
        : (raw as number);

      const b: number = filter.field === 'createdAt' && typeof value === 'string'
        ? Date.parse(value)
        : (value as number);

      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

      if (operator === 'gt')  return a >  b;
      if (operator === 'gte') return a >= b;
      if (operator === 'lt')  return a <  b;
      /* lte */               return a <= b;
    }
  }
}

// ---------------------------------------------------------------------------
// Filter application
// ---------------------------------------------------------------------------

/** Returns summaries that satisfy ALL filters (AND semantics). */
export function applyFilters(
  summaries: TraceSummary[],
  filters: TraceQueryFilter[],
): TraceSummary[] {
  if (filters.length === 0) return summaries;
  return summaries.filter(s => filters.every(f => evaluateFilter(s, f)));
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/** Sorts a mutable array of summaries in-place. Returns the same array. */
export function applySort(summaries: TraceSummary[], sort: TraceSort): TraceSummary[] {
  const dir = sort.direction === 'asc' ? 1 : -1;

  summaries.sort((a, b) => {
    switch (sort.field) {
      case 'totalLatency': return (a.totalLatency - b.totalLatency) * dir;
      case 'totalTokens':  return (a.totalTokens  - b.totalTokens)  * dir;
      case 'createdAt': {
        const ta = Date.parse(a.createdAt);
        const tb = Date.parse(b.createdAt);
        return (ta - tb) * dir;
      }
    }
  });

  return summaries;
}

// ---------------------------------------------------------------------------
// Cursor encoding / decoding
// ---------------------------------------------------------------------------
//
// Strategy: encode a numeric page-offset as a base64 string.
// This keeps the API surface opaque to callers (they must not parse cursors)
// while remaining trivially decodable server-side.
// Trade-off: offset cursors are not stable across concurrent writes — but
// for an observability tool queried by a single user this is acceptable.

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString('base64');
}

export function decodeCursor(cursor: string): number {
  try {
    const n = parseInt(Buffer.from(cursor, 'base64').toString(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}
