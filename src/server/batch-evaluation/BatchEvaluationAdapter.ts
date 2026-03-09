import type { AgentTrace, AgentStep } from '../../core/trace-model';
import type { EvaluatorContext, EvaluationTarget } from '../../core/evaluation-model';
import type { DatasetRunResult } from '../../core/dataset-model';

/**
 * Dataset Item → EvaluatorContext Adapter
 * ─────────────────────────────────────────
 * The existing RuleBasedEvaluator operates on AgentTrace / AgentStep objects,
 * but dataset replay produces DatasetRunResult rows — which have no real
 * trace stored in the TraceStore.
 *
 * Strategy: build a *minimal synthetic* AgentTrace + AgentStep directly from
 * the DatasetRunResult so the evaluator can be reused without modification.
 *
 * Fields that have no real data (latency, tokens) are set to 0 or omitted.
 * Thresholds in RuleBasedEvaluator only fire above their limits, so synthetic
 * zeroes are always safe — they will never trigger a false positive.
 *
 * Rules that WILL fire on dataset items:
 *   STEP_ERROR_STATUS      — when DatasetRunResult.status === 'error'
 *   STEP_MISSING_OUTPUT    — when producedOutput is null / empty
 *   TRACE_ERROR_RATE_HIGH  — 1 step that errors → 100% error rate → always fires
 *
 * Rules that will NOT fire (no real data available):
 *   TRACE_LATENCY_HIGH     — latency is 0
 *   STEP_LATENCY_HIGH      — latency is 0
 */
export function buildEvaluatorContext(result: DatasetRunResult): EvaluatorContext {
  const stepId = `synthetic_step_${result.itemId}`;

  const step: AgentStep = {
    stepId,
    type:     'llm',
    // Map dataset item status to step status; treat pending/running as success
    // so only explicitly failed items are flagged.
    status:   result.status === 'error' ? 'error' : 'success',
    input:    null,                        // original input not available here
    output:   result.producedOutput ?? null,
    latency:  0,                           // no real timing for synthetic runs
    children: [],
  };

  const trace: AgentTrace = {
    traceId:    `synthetic_trace_${result.runId}_${result.itemId}`,
    sessionId:  `synthetic_session_${result.runId}`,
    rootStepId: stepId,
    steps:      [step],
    metadata: {
      model:        'synthetic',
      totalLatency: 0,
      totalTokens:  0,
      cost:         0,
    },
  };

  return {
    trace,
    step,
    replay:   result.replayResult,
    metadata: {
      datasetItemId: result.itemId,
      synthetic:     true,
    },
  };
}

/**
 * Build the EvaluationTarget for a dataset item.
 * Uses 'trace' scope so RuleBasedEvaluator runs trace-level + all step rules.
 */
export function buildEvaluationTarget(result: DatasetRunResult): EvaluationTarget {
  return {
    traceId:    `synthetic_trace_${result.runId}_${result.itemId}`,
    targetType: 'trace',
  };
}
