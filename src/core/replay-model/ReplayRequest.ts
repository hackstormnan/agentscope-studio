import type { ReplayOverrides } from './ReplayTypes';

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
