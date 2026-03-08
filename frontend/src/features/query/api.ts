import type { TraceQuery, TraceQueryResult } from './types';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

/** POST /api/traces/query — structured query with filtering, sorting, pagination. */
export async function runQuery(query: TraceQuery): Promise<TraceQueryResult> {
  const res = await fetch(`${BASE}/traces/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(query),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Query failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<TraceQueryResult>;
}
