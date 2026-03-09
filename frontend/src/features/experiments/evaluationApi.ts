const API_BASE = 'http://localhost:4000';

// ── Local mirrors of BatchEvaluationTypes (no shared package needed) ─────────

export interface BatchEvaluationSummary {
  runId:             string;
  totalItems:        number;
  evaluatedItems:    number;
  issueCount:        number;
  errorIssueCount:   number;
  warningIssueCount: number;
  averageScore?:     number;
  successRate?:      number;
}

export interface BatchEvaluationResponse {
  runId:       string;
  summary:     BatchEvaluationSummary;
  evaluatedAt: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** POST /api/datasets/runs/:datasetRunId/evaluate — runs evaluation, returns result. */
export async function triggerEvaluation(
  datasetRunId: string,
): Promise<BatchEvaluationResponse> {
  const res = await fetch(`${API_BASE}/api/datasets/runs/${datasetRunId}/evaluate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Evaluation request failed: ${res.status}`);
  }
  return res.json() as Promise<BatchEvaluationResponse>;
}

/** GET /api/datasets/runs/:datasetRunId/evaluations — returns stored result, or null on 404. */
export async function fetchStoredEvaluation(
  datasetRunId: string,
): Promise<BatchEvaluationResponse | null> {
  const res = await fetch(`${API_BASE}/api/datasets/runs/${datasetRunId}/evaluations`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load evaluation: ${res.status}`);
  return res.json() as Promise<BatchEvaluationResponse>;
}
