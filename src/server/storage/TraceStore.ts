import type { AgentTrace } from '../../core/trace-model';

export interface TraceSummary {
  traceId: string;
  sessionId: string;
  createdAt: string; // ISO 8601
  totalLatency: number;
  totalTokens: number;
  hasError: boolean;
}

export interface ListParams {
  limit?: number;
  /** Cursor is the traceId of the last item seen in the previous page. */
  cursor?: string;
  hasError?: boolean;
  /** Case-insensitive substring match on summary.sessionId. */
  sessionId?: string;
}

export interface ListResult {
  items: TraceSummary[];
  nextCursor?: string;
}

export interface TraceStore {
  saveTrace(trace: AgentTrace): Promise<void>;
  getTrace(traceId: string): Promise<AgentTrace | null>;
  listTraces(params: ListParams): Promise<ListResult>;
  /** Returns every summary without pagination. Intended for stats computation. */
  getAllSummaries(): Promise<TraceSummary[]>;
}
