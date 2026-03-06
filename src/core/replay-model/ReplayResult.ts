import type { ReplayStatus } from './ReplayTypes';

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
