import type { TraceStore } from '../storage';
import type { EvaluationTarget, EvaluationResult, EvaluatorContext } from '../../core/evaluation-model';
import { RuleBasedEvaluator } from './RuleBasedEvaluator';

/**
 * Orchestrates evaluation runs.
 *
 * Responsibilities:
 *   1. Load the trace (and optionally the step) from the store.
 *   2. Build an EvaluatorContext from the loaded data.
 *   3. Delegate to the configured evaluator.
 *   4. Return the EvaluationResult.
 *
 * A single RuleBasedEvaluator instance is used by default.
 * Future versions can accept an array of Evaluator plugins.
 */
export class EvaluationService {
  private readonly evaluator: RuleBasedEvaluator;

  constructor(private readonly store: TraceStore) {
    this.evaluator = new RuleBasedEvaluator();
  }

  async evaluate(target: EvaluationTarget): Promise<EvaluationResult> {
    // ── Load trace ────────────────────────────────────────────────────────────
    const trace = await this.store.getTrace(target.traceId);

    if (!trace) {
      // Return an error result without throwing so callers get a consistent shape
      return {
        evaluationId:  `eval_missing_${Date.now()}`,
        target,
        evaluatorName: this.evaluator.name,
        status:        'error',
        issues:        [],
        startedAt:     new Date().toISOString(),
        completedAt:   new Date().toISOString(),
        errorMessage:  `Trace not found: ${target.traceId}`,
      };
    }

    // ── Build context ─────────────────────────────────────────────────────────
    const context: EvaluatorContext = { trace };

    if (target.targetType === 'step' && target.stepId) {
      const step = trace.steps.find((s) => s.stepId === target.stepId) ?? undefined;

      if (!step) {
        return {
          evaluationId:  `eval_missing_${Date.now()}`,
          target,
          evaluatorName: this.evaluator.name,
          status:        'error',
          issues:        [],
          startedAt:     new Date().toISOString(),
          completedAt:   new Date().toISOString(),
          errorMessage:  `Step not found in trace ${target.traceId}: ${target.stepId}`,
        };
      }

      context.step = step;
    }

    // ── Run evaluator ─────────────────────────────────────────────────────────
    return this.evaluator.evaluate(target, context);
  }
}
