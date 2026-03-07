import type { ReplayRequest, ReplayResult } from './types';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

export class ReplayApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ReplayApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof data['error'] === 'string' ? data['error'] : `${res.status} ${res.statusText}`;
    throw new ReplayApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

/** POST /api/replays — run a replay and persist the result. */
export function createReplay(request: ReplayRequest): Promise<ReplayResult> {
  return fetch(`${BASE}/replays`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(request),
  }).then((res) => handleResponse<ReplayResult>(res));
}

/** GET /api/replays/:replayId — retrieve a stored replay. Returns null on 404. */
export async function getReplay(replayId: string): Promise<ReplayResult | null> {
  const res = await fetch(`${BASE}/replays/${encodeURIComponent(replayId)}`);
  if (res.status === 404) return null;
  return handleResponse<ReplayResult>(res);
}

/** GET /api/traces/:traceId/replays — all replays for a trace, newest first. */
export function listTraceReplays(traceId: string): Promise<ReplayResult[]> {
  return fetch(`${BASE}/traces/${encodeURIComponent(traceId)}/replays`)
    .then((res) => handleResponse<ReplayResult[]>(res));
}
