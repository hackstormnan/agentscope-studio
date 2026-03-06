export type ReplayStatus = 'pending' | 'running' | 'success' | 'error';

export interface ReplayOverrides {
  overridePrompt?: string;
  overrideInput?: unknown;
}

export interface ReplayTarget {
  traceId: string;
  targetStepId: string;
  parentStepId?: string;
  rootStepId?: string;
}
