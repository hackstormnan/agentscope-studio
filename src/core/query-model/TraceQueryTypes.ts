/**
 * Supported filter comparison operators.
 */
export type TraceFilterOperator = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';

/**
 * Fields available for sorting query results.
 */
export type TraceSortField = 'createdAt' | 'totalLatency' | 'totalTokens';

/**
 * A single filter predicate applied to a trace field.
 */
export interface TraceQueryFilter {
  field:
    | 'traceId'
    | 'sessionId'
    | 'hasError'
    | 'totalLatency'
    | 'totalTokens'
    | 'createdAt';
  operator: TraceFilterOperator;
  value: string | number | boolean;
}

/**
 * Sort order for query results.
 */
export interface TraceSort {
  field: TraceSortField;
  direction: 'asc' | 'desc';
}
