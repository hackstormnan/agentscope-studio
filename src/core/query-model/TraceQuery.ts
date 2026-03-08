import type { TraceQueryFilter, TraceSort } from './TraceQueryTypes';

/**
 * A structured query over the trace store.
 * All fields are optional except `filters` (which defaults to an empty array
 * when omitted by callers).
 */
export interface TraceQuery {
  filters: TraceQueryFilter[];
  sort?: TraceSort;
  /** Maximum number of items to return. */
  limit?: number;
  /** Opaque cursor for pagination — returned by a prior TraceQueryResult. */
  cursor?: string;
}

/**
 * Paginated result returned by the query engine.
 *
 * @template T — the item shape (defaults to `unknown` to stay framework-agnostic).
 */
export interface TraceQueryResult<T = unknown> {
  items: T[];
  /** Present when more items exist beyond the current page. */
  nextCursor?: string;
  /** The query that produced this result, for auditability / re-execution. */
  appliedQuery: TraceQuery;
}
