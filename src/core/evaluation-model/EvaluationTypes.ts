/**
 * Whether an evaluation targets the whole trace or a single step.
 */
export type EvaluationScope = 'trace' | 'step';

/**
 * Identifies the trace (and optionally the step) being evaluated.
 */
export interface EvaluationTarget {
  traceId:    string;
  stepId?:    string;
  targetType: EvaluationScope;
}

/**
 * Lifecycle state of an evaluation run.
 */
export type EvaluationStatus = 'pending' | 'running' | 'success' | 'error';

/**
 * How severe an individual issue is.
 */
export type EvaluationSeverity = 'info' | 'warning' | 'error';
