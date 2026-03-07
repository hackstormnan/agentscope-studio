import type { TraceAnalysisResult } from './types';

const BASE = '/api/traces';

export async function getTraceAnalysis(traceId: string): Promise<TraceAnalysisResult | null> {
  const res = await fetch(`${BASE}/${encodeURIComponent(traceId)}/analysis`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Analysis request failed: ${res.status}`);
  return res.json() as Promise<TraceAnalysisResult>;
}
