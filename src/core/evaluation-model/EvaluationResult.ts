import type { EvaluationTarget, EvaluationStatus } from './EvaluationTypes';
import type { EvaluationIssue } from './EvaluationIssue';

/**
 * The full output of a single evaluator run against one target.
 *
 * - `evaluationId`  — unique identifier for this result record
 * - `target`        — what was evaluated (trace or step)
 * - `evaluatorName` — name of the evaluator that produced this result
 * - `status`        — terminal state of the run
 * - `score`         — optional numeric quality score (range is evaluator-defined)
 * - `issues`        — zero or more findings; empty when status is 'error'
 * - `summary`       — optional human-readable summary of the evaluation
 * - `startedAt`     — ISO 8601 timestamp when evaluation began
 * - `completedAt`   — ISO 8601 timestamp when evaluation finished (absent while running)
 * - `errorMessage`  — present only when status is 'error'
 */
export interface EvaluationResult {
  evaluationId:  string;
  target:        EvaluationTarget;
  evaluatorName: string;
  status:        EvaluationStatus;
  score?:        number;
  issues:        EvaluationIssue[];
  summary?:      string;
  startedAt:     string;
  completedAt?:  string;
  errorMessage?: string;
}
