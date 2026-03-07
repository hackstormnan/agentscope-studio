import type { TraceStore } from '../storage';
import type { AgentStep } from '../../core/trace-model';
import type { TraceAnalysisResult, StepAnalysisResult } from '../../core/analysis-model';

// Cost heuristic: $0.000002 per token (placeholder)
const COST_PER_TOKEN = 0.000002;

// A step is a latency outlier if its latency exceeds 2x the average
const OUTLIER_MULTIPLIER = 2;

// A step is "token heavy" if it holds more than this fraction of total tokens
const TOKEN_HEAVY_FRACTION = 0.3;

export class CostLatencyAnalyzer {
  constructor(private readonly store: TraceStore) {}

  async analyze(traceId: string): Promise<TraceAnalysisResult | null> {
    const trace = await this.store.getTrace(traceId);
    if (!trace) return null;

    const steps = trace.steps;

    // ── Latency ──────────────────────────────────────────────────────────────
    const totalLatency = trace.metadata?.totalLatency
      ?? steps.reduce((sum, s) => sum + (s.latency ?? 0), 0);

    let slowestStepId: string | undefined;
    let averageStepLatency: number | undefined;
    let latencyOutliers: string[] | undefined;

    if (steps.length > 0) {
      const stepLatencies = steps.map((s) => s.latency ?? 0);
      averageStepLatency = stepLatencies.reduce((a, b) => a + b, 0) / steps.length;

      const slowest = steps.reduce((best, s) =>
        (s.latency ?? 0) > (best.latency ?? 0) ? s : best,
      );
      slowestStepId = slowest.stepId;

      const outlierThreshold = averageStepLatency * OUTLIER_MULTIPLIER;
      const outliers = steps
        .filter((s) => (s.latency ?? 0) > outlierThreshold)
        .map((s) => s.stepId);
      if (outliers.length > 0) latencyOutliers = outliers;
    }

    // ── Tokens ───────────────────────────────────────────────────────────────
    let totalTokens: number | undefined;
    let estimatedCost: number | undefined;
    let tokenHeavySteps: string[] | undefined;

    const stepsWithTokens = steps.filter((s) => s.tokens != null);
    if (stepsWithTokens.length > 0) {
      totalTokens = stepsWithTokens.reduce(
        (sum, s) => sum + (s.tokens?.totalTokens ?? 0),
        0,
      );
      estimatedCost = totalTokens * COST_PER_TOKEN;

      if (totalTokens > 0) {
        const heavy = stepsWithTokens
          .filter((s) => (s.tokens?.totalTokens ?? 0) / totalTokens! > TOKEN_HEAVY_FRACTION)
          .map((s) => s.stepId);
        if (heavy.length > 0) tokenHeavySteps = heavy;
      }
    } else if (trace.metadata?.totalTokens) {
      // Fall back to trace-level token count when step-level is absent
      totalTokens = trace.metadata.totalTokens;
      estimatedCost = totalTokens * COST_PER_TOKEN;
    }

    return {
      traceId,
      totalLatency,
      slowestStepId,
      averageStepLatency,
      totalTokens,
      estimatedCost,
      latencyOutliers,
      tokenHeavySteps,
    };
  }

  analyzeStep(step: AgentStep, averageLatency?: number): StepAnalysisResult {
    const tokens   = step.tokens?.totalTokens;
    const latency  = step.latency;
    const estCost  = tokens != null ? tokens * COST_PER_TOKEN : undefined;

    let latencyCategory: StepAnalysisResult['latencyCategory'];
    if (latency != null && averageLatency != null && averageLatency > 0) {
      const ratio = latency / averageLatency;
      if (ratio <= 0.5) latencyCategory = 'fast';
      else if (ratio <= OUTLIER_MULTIPLIER) latencyCategory = 'normal';
      else latencyCategory = 'slow';
    }

    return { stepId: step.stepId, latency, tokens, estimatedCost: estCost, latencyCategory };
  }
}
