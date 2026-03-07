import type { AgentTrace, AgentStep } from '../../core/trace-model';
import type {
  Evaluator,
  EvaluatorContext,
  EvaluationTarget,
  EvaluationResult,
  EvaluationIssue,
} from '../../core/evaluation-model';
import { createEvaluationId, isOutputEmpty } from './EvaluationUtils';

// ── Thresholds ──────────────────────────────────────────────────────────────

const TRACE_LATENCY_THRESHOLD_MS  = 10_000; // >10 s → warning
const TRACE_ERROR_RATE_THRESHOLD  = 0.3;    // >30 % error steps → warning
const STEP_LATENCY_THRESHOLD_MS   = 2_000;  // >2 s  → warning

// ── Scoring ─────────────────────────────────────────────────────────────────
//
// Score starts at 1.0 and is penalised per issue:
//   error-severity issue  → −0.25
//   warning-severity issue → −0.10
//   info-severity issue    → −0.02
// Clamped to [0, 1].

const PENALTY: Record<EvaluationIssue['severity'], number> = {
  error:   0.25,
  warning: 0.10,
  info:    0.02,
};

function computeScore(issues: EvaluationIssue[]): number {
  const penalty = issues.reduce((sum, i) => sum + PENALTY[i.severity], 0);
  return Math.max(0, Math.min(1, 1 - penalty));
}

// ── Trace rules ─────────────────────────────────────────────────────────────

function checkTrace(trace: AgentTrace): EvaluationIssue[] {
  const issues: EvaluationIssue[] = [];

  // TRACE_EMPTY
  if (trace.steps.length === 0) {
    issues.push({
      code:        'TRACE_EMPTY',
      title:       'Trace has no steps',
      description: 'The trace contains zero steps. This usually indicates the agent exited before recording any work.',
      severity:    'error',
      metadata:    { traceId: trace.traceId },
    });
    // No further checks make sense on an empty trace
    return issues;
  }

  // TRACE_ERROR_RATE_HIGH
  const errorSteps = trace.steps.filter((s) => s.status === 'error');
  const errorRate  = errorSteps.length / trace.steps.length;

  if (errorRate > TRACE_ERROR_RATE_THRESHOLD) {
    issues.push({
      code:        'TRACE_ERROR_RATE_HIGH',
      title:       'High step error rate',
      description: `${Math.round(errorRate * 100)}% of steps finished with status "error" `
                 + `(${errorSteps.length} of ${trace.steps.length}). `
                 + `Threshold is ${TRACE_ERROR_RATE_THRESHOLD * 100}%.`,
      severity:    'warning',
      metadata:    {
        errorStepCount: errorSteps.length,
        totalStepCount: trace.steps.length,
        errorRate:      Math.round(errorRate * 100) / 100,
        errorStepIds:   errorSteps.map((s) => s.stepId),
      },
    });
  }

  // TRACE_LATENCY_HIGH
  const totalLatency = trace.metadata.totalLatency;
  if (totalLatency > TRACE_LATENCY_THRESHOLD_MS) {
    issues.push({
      code:        'TRACE_LATENCY_HIGH',
      title:       'Total trace latency is high',
      description: `Total latency is ${totalLatency}ms, which exceeds the `
                 + `${TRACE_LATENCY_THRESHOLD_MS}ms threshold.`,
      severity:    'warning',
      metadata:    {
        totalLatencyMs:    totalLatency,
        thresholdMs:       TRACE_LATENCY_THRESHOLD_MS,
      },
    });
  }

  return issues;
}

// ── Step rules ───────────────────────────────────────────────────────────────

function checkStep(step: AgentStep): EvaluationIssue[] {
  const issues: EvaluationIssue[] = [];

  // STEP_ERROR_STATUS
  if (step.status === 'error') {
    issues.push({
      code:        'STEP_ERROR_STATUS',
      title:       'Step finished with error status',
      description: `Step "${step.stepId}" (type: ${step.type}) completed with status "error".`,
      severity:    'error',
      metadata:    { stepId: step.stepId, stepType: step.type },
    });
  }

  // STEP_LATENCY_HIGH
  if (step.latency > STEP_LATENCY_THRESHOLD_MS) {
    issues.push({
      code:        'STEP_LATENCY_HIGH',
      title:       'Step latency is high',
      description: `Step "${step.stepId}" took ${step.latency}ms, exceeding the `
                 + `${STEP_LATENCY_THRESHOLD_MS}ms threshold.`,
      severity:    'warning',
      metadata:    {
        stepId:       step.stepId,
        stepType:     step.type,
        latencyMs:    step.latency,
        thresholdMs:  STEP_LATENCY_THRESHOLD_MS,
      },
    });
  }

  // STEP_MISSING_OUTPUT
  if (isOutputEmpty(step.output)) {
    issues.push({
      code:        'STEP_MISSING_OUTPUT',
      title:       'Step output is missing or empty',
      description: `Step "${step.stepId}" (type: ${step.type}) produced no output. `
                 + `This may indicate a silent failure or incomplete execution.`,
      severity:    'warning',
      metadata:    { stepId: step.stepId, stepType: step.type, output: step.output },
    });
  }

  return issues;
}

// ── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(issues: EvaluationIssue[], score: number, scope: string): string {
  if (issues.length === 0) {
    return `${scope} passed all checks. Score: ${score.toFixed(2)}.`;
  }

  const bySeverity = {
    error:   issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    info:    issues.filter((i) => i.severity === 'info').length,
  };

  const parts: string[] = [];
  if (bySeverity.error)   parts.push(`${bySeverity.error} error(s)`);
  if (bySeverity.warning) parts.push(`${bySeverity.warning} warning(s)`);
  if (bySeverity.info)    parts.push(`${bySeverity.info} info`);

  return `${scope} completed with ${parts.join(', ')}. Score: ${score.toFixed(2)}.`;
}

// ── Evaluator ────────────────────────────────────────────────────────────────

export class RuleBasedEvaluator implements Evaluator {
  readonly name = 'RuleBasedEvaluator';

  async evaluate(
    target:  EvaluationTarget,
    context: EvaluatorContext,
  ): Promise<EvaluationResult> {
    const evaluationId = createEvaluationId();
    const startedAt    = new Date().toISOString();

    try {
      let issues: EvaluationIssue[];
      let scope: string;

      if (target.targetType === 'step') {
        const step = context.step as AgentStep | undefined;
        if (!step) {
          return errorResult(evaluationId, target, this.name, startedAt, 'Step not found in context.');
        }
        issues = checkStep(step);
        scope  = `Step "${target.stepId ?? step.stepId}"`;
      } else {
        const trace = context.trace as AgentTrace | undefined;
        if (!trace) {
          return errorResult(evaluationId, target, this.name, startedAt, 'Trace not found in context.');
        }
        issues = checkTrace(trace);
        scope  = `Trace "${target.traceId}"`;
      }

      const score       = computeScore(issues);
      const summary     = buildSummary(issues, score, scope);
      const completedAt = new Date().toISOString();

      return {
        evaluationId,
        target,
        evaluatorName: this.name,
        status:        'success',
        score,
        issues,
        summary,
        startedAt,
        completedAt,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error during evaluation.';
      return errorResult(evaluationId, target, this.name, startedAt, message);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function errorResult(
  evaluationId:  string,
  target:        EvaluationTarget,
  evaluatorName: string,
  startedAt:     string,
  errorMessage:  string,
): EvaluationResult {
  return {
    evaluationId,
    target,
    evaluatorName,
    status:       'error',
    issues:       [],
    startedAt,
    completedAt:  new Date().toISOString(),
    errorMessage,
  };
}
