import type { EvaluationTarget } from './EvaluationTypes';
import type { EvaluationResult } from './EvaluationResult';

/**
 * Runtime context supplied to an evaluator alongside the target.
 *
 * All fields are optional so evaluators can be called with whatever
 * data is available at evaluation time. Typed as `unknown` to keep
 * this module free of dependencies on server or trace-model packages.
 *
 * - `trace`    — full AgentTrace object (when evaluating at trace scope)
 * - `step`     — individual AgentStep object (when evaluating at step scope)
 * - `replay`   — ReplayResult if evaluation is triggered from a replay
 * - `metadata` — arbitrary key/value bag for evaluator-specific config
 */
export interface EvaluatorContext {
  trace?:    unknown;
  step?:     unknown;
  replay?:   unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Plugin interface for evaluation logic.
 *
 * Implement this interface to create a named evaluator that can be
 * registered with an evaluation runner. Evaluators must be stateless —
 * all required context is passed through `EvaluatorContext`.
 *
 * Evaluators should never throw; return a result with status 'error'
 * and an `errorMessage` instead.
 */
export interface Evaluator {
  /** Unique human-readable name used to identify this evaluator. */
  readonly name: string;

  /**
   * Run the evaluation and return a fully-populated EvaluationResult.
   * The runner fills `evaluationId`, `startedAt`, and `completedAt`;
   * evaluators may also set them if they manage their own timing.
   */
  evaluate(
    target:  EvaluationTarget,
    context: EvaluatorContext,
  ): Promise<EvaluationResult>;
}
