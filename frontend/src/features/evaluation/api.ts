import type { EvaluationTarget, EvaluationResult } from './types';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

export class EvaluationApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'EvaluationApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg  = typeof data['error'] === 'string' ? data['error'] : `${res.status} ${res.statusText}`;
    throw new EvaluationApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

/** POST /api/evaluations — run evaluation, persist, return result. */
export function runEvaluation(target: EvaluationTarget): Promise<EvaluationResult> {
  return fetch(`${BASE}/evaluations`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(target),
  }).then((res) => handleResponse<EvaluationResult>(res));
}

/** GET /api/evaluations/:id — retrieve a stored evaluation (null on 404). */
export async function getEvaluation(evaluationId: string): Promise<EvaluationResult | null> {
  const res = await fetch(`${BASE}/evaluations/${encodeURIComponent(evaluationId)}`);
  if (res.status === 404) return null;
  return handleResponse<EvaluationResult>(res);
}

/** GET /api/evaluations?limit=N — list recent evaluations across all traces. */
export function listEvaluations(limit = 50): Promise<EvaluationResult[]> {
  return fetch(`${BASE}/evaluations?limit=${limit}`)
    .then((res) => handleResponse<EvaluationResult[]>(res));
}

/** GET /api/traces/:traceId/evaluations — evaluations for a specific trace. */
export function listTraceEvaluations(traceId: string): Promise<EvaluationResult[]> {
  return fetch(`${BASE}/traces/${encodeURIComponent(traceId)}/evaluations`)
    .then((res) => handleResponse<EvaluationResult[]>(res));
}

/** GET /api/traces/:traceId/steps/:stepId/evaluations — evaluations for a step. */
export function listStepEvaluations(traceId: string, stepId: string): Promise<EvaluationResult[]> {
  return fetch(
    `${BASE}/traces/${encodeURIComponent(traceId)}/steps/${encodeURIComponent(stepId)}/evaluations`,
  ).then((res) => handleResponse<EvaluationResult[]>(res));
}
