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
