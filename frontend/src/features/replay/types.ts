export type ReplayStatus = 'pending' | 'running' | 'success' | 'error';

export interface ReplayOverrides {
  overridePrompt?: string;
  overrideInput?: unknown;
}

export interface ReplayRequest {
  traceId: string;
  targetStepId: string;
  overrides?: ReplayOverrides;
  metadata?: {
    requestedBy?: string;
    reason?: string;
    requestedAt?: string;
  };
}

export interface ReplayResult {
  replayId: string;
  sourceTraceId: string;
  targetStepId: string;
  status: ReplayStatus;
  startedAt: string;
  completedAt?: string;
  producedStep?: unknown;
  producedTraceId?: string;
  errorMessage?: string;
}
