export interface TraceAnalysisResult {
  traceId: string;
  totalLatency: number;
  slowestStepId?: string;
  averageStepLatency?: number;
  totalTokens?: number;
  estimatedCost?: number;
  latencyOutliers?: string[];
  tokenHeavySteps?: string[];
}

export interface StepAnalysisResult {
  stepId: string;
  latency?: number;
  tokens?: number;
  estimatedCost?: number;
  latencyCategory?: 'fast' | 'normal' | 'slow';
}
