import type { TraceSummary } from '../../lib/api';

// Local mirrors of src/core/query-model types.
// Kept here to avoid cross-package imports from the frontend.

export type TraceFilterOperator = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
export type TraceSortField = 'createdAt' | 'totalLatency' | 'totalTokens';
export type TraceQueryField =
  | 'traceId'
  | 'sessionId'
  | 'hasError'
  | 'totalLatency'
  | 'totalTokens'
  | 'createdAt';

export interface TraceQueryFilter {
  field: TraceQueryField;
  operator: TraceFilterOperator;
  value: string | number | boolean;
}

export interface TraceSort {
  field: TraceSortField;
  direction: 'asc' | 'desc';
}

export interface TraceQuery {
  filters: TraceQueryFilter[];
  sort?: TraceSort;
  limit?: number;
  cursor?: string;
}

export interface TraceQueryResult {
  items: TraceSummary[];
  nextCursor?: string;
  appliedQuery: TraceQuery;
}

// ── Draft filter — used inside the builder UI ──────────────────────────────
// value is always kept as a string while editing; converted on execute.

export interface DraftFilter {
  /** Stable React key — not sent to the server. */
  id: string;
  field: TraceQueryField;
  operator: TraceFilterOperator;
  value: string;
}

// ── Field metadata ─────────────────────────────────────────────────────────

export type FieldKind = 'string' | 'boolean' | 'numeric' | 'date';

export const FIELD_KIND: Record<TraceQueryField, FieldKind> = {
  traceId:      'string',
  sessionId:    'string',
  hasError:     'boolean',
  totalLatency: 'numeric',
  totalTokens:  'numeric',
  createdAt:    'date',
};

export const FIELD_OPERATORS: Record<TraceQueryField, TraceFilterOperator[]> = {
  traceId:      ['eq', 'contains'],
  sessionId:    ['eq', 'contains'],
  hasError:     ['eq'],
  totalLatency: ['eq', 'gt', 'gte', 'lt', 'lte'],
  totalTokens:  ['eq', 'gt', 'gte', 'lt', 'lte'],
  createdAt:    ['eq', 'gt', 'gte', 'lt', 'lte'],
};

export const FIELD_LABELS: Record<TraceQueryField, string> = {
  traceId:      'Trace ID',
  sessionId:    'Session ID',
  hasError:     'Has Error',
  totalLatency: 'Latency (ms)',
  totalTokens:  'Total Tokens',
  createdAt:    'Created At',
};

export const OPERATOR_LABELS: Record<TraceFilterOperator, string> = {
  eq:       '=',
  contains: 'contains',
  gt:       '>',
  gte:      '≥',
  lt:       '<',
  lte:      '≤',
};

export const SORT_FIELD_LABELS: Record<TraceSortField, string> = {
  createdAt:    'Created At',
  totalLatency: 'Latency',
  totalTokens:  'Tokens',
};

// ── Draft → wire conversion ────────────────────────────────────────────────

export function draftToFilter(draft: DraftFilter): TraceQueryFilter | null {
  const kind = FIELD_KIND[draft.field];

  if (kind === 'boolean') {
    return { field: draft.field, operator: draft.operator, value: draft.value === 'true' };
  }

  if (kind === 'numeric') {
    const n = parseFloat(draft.value);
    if (!Number.isFinite(n)) return null;
    return { field: draft.field, operator: draft.operator, value: n };
  }

  // string or date: require non-empty
  if (draft.value.trim() === '') return null;
  return { field: draft.field, operator: draft.operator, value: draft.value.trim() };
}

export function isValidDraft(draft: DraftFilter): boolean {
  return draftToFilter(draft) !== null;
}
