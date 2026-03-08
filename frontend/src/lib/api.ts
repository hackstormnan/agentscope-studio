// ── Shared types ────────────────────────────────────────────────────────────
// Mirror of src/core/trace-model. Kept local to avoid cross-package imports.
// In a larger project, extract to a shared @agentscope/types workspace package.

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentDescriptor {
  agentId: string;
  agentName?: string;
  agentRole?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceMetadata {
  model: string;
  totalLatency: number;
  totalTokens: number;
  cost: number;
  agents?: AgentDescriptor[];
}

export interface AgentStep {
  stepId: string;
  parentId?: string;
  type: 'llm' | 'tool' | 'memory' | 'planner' | 'reflection';
  status: 'running' | 'success' | 'error';
  input: unknown;
  output: unknown;
  latency: number;
  tokens?: TokenUsage;
  children: string[];
  agentId?: string;
  agentName?: string;
  agentRole?: string;
}

export interface AgentTrace {
  traceId: string;
  sessionId: string;
  rootStepId: string;
  steps: AgentStep[];
  metadata: TraceMetadata;
}

export interface TraceSummary {
  traceId: string;
  sessionId: string;
  createdAt: string; // ISO 8601
  totalLatency: number;
  totalTokens: number;
  hasError: boolean;
}

export interface DashboardStats {
  totalTraces: number;
  errorTraces: number;
  errorRate: number;
  avgLatency: number;
  avgTokens: number;
  last24hTraces?: number;
  last24hErrorTraces?: number;
}

export interface ListResult {
  items: TraceSummary[];
  nextCursor?: string;
}

export interface ListParams {
  limit?: number;
  cursor?: string;
  hasError?: boolean;
  sessionId?: string;
}

// ── HTTP client ──────────────────────────────────────────────────────────────
// In dev: Vite proxies /api → http://localhost:4000/api (see vite.config.ts)
// In prod: set VITE_API_BASE env var to the deployed API origin.
const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

/** Thrown when the server responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── API methods ──────────────────────────────────────────────────────────────
// getTraceStats and listTraces throw on failure — callers must handle errors
// and can show proper error UI rather than silent fallbacks.
// getTrace returns null on 404 (trace not found) and throws on other errors.

export function getTraceStats(): Promise<DashboardStats> {
  return get<DashboardStats>('/stats');
}

export function listTraces(params: ListParams = {}): Promise<ListResult> {
  const qs = new URLSearchParams();
  if (params.limit     !== undefined) qs.set('limit',     String(params.limit));
  if (params.cursor    !== undefined) qs.set('cursor',    params.cursor);
  if (params.hasError  !== undefined) qs.set('hasError',  String(params.hasError));
  if (params.sessionId !== undefined) qs.set('sessionId', params.sessionId);

  const query = qs.toString();
  return get<ListResult>(`/traces${query ? `?${query}` : ''}`);
}

export async function getTrace(traceId: string): Promise<AgentTrace | null> {
  try {
    return await get<AgentTrace>(`/traces/${encodeURIComponent(traceId)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
