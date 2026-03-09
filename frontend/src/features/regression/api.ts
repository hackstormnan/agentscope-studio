import type { RegressionReport } from './types';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

export class RegressionApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'RegressionApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg  = typeof data['error'] === 'string' ? data['error'] : `${res.status} ${res.statusText}`;
    throw new RegressionApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export interface GenerateReportParams {
  baselineRunId:   string;
  candidateRunId:  string;
  /** Optional latency from the experiment run summary (ms). */
  baselineLatency?:  number;
  candidateLatency?: number;
  /** Optional estimated cost from the experiment run summary ($). */
  baselineCost?:   number;
  candidateCost?:  number;
}

/** POST /api/reports/regression — generate and persist a regression report. */
export function generateRegressionReport(params: GenerateReportParams): Promise<RegressionReport> {
  return fetch(`${BASE}/reports/regression`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  }).then((res) => handleResponse<RegressionReport>(res));
}

/** GET /api/reports/:reportId — retrieve a stored report (null on 404). */
export async function getRegressionReport(reportId: string): Promise<RegressionReport | null> {
  const res = await fetch(`${BASE}/reports/${encodeURIComponent(reportId)}`);
  if (res.status === 404) return null;
  return handleResponse<RegressionReport>(res);
}
