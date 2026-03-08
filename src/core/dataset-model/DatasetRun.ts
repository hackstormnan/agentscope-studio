import type { ReplayOverrides, ReplayResult } from '../replay-model';
import type { EvaluationResult } from '../evaluation-model';

/**
 * Lifecycle status shared by both the overall run and individual item results.
 * Mirrors ReplayStatus / EvaluationStatus but is defined independently so
 * the dataset layer remains decoupled from either downstream model's evolution.
 */
export type DatasetRunStatus = 'pending' | 'running' | 'success' | 'error';

/**
 * A single execution of a Dataset — one replay + optional evaluation per item.
 *
 * A DatasetRun is created when the user triggers batch execution against a
 * Dataset. It records the shared overrides applied to every item and tracks
 * the aggregate lifecycle of the run. Per-item outcomes are recorded in
 * DatasetRunResult records (stored separately and keyed by runId + itemId).
 *
 * Relationship to replay-model:
 *   `replayOverrides` is the same struct used by individual ReplayRequests.
 *   The batch engine applies these overrides uniformly to every DatasetItem
 *   replay, letting callers swap a prompt or inject a fixed input for the
 *   whole run without modifying dataset items in place.
 */
export interface DatasetRun {
  runId:      string;
  datasetId:  string;
  /**
   * Overrides applied to every replay within this run.
   * When absent, each item is replayed with its own input unchanged.
   */
  replayOverrides?: ReplayOverrides;
  status:       DatasetRunStatus;
  /** ISO 8601 timestamp — set when status transitions from 'pending'. */
  startedAt?:   string;
  /** ISO 8601 timestamp — set when all items reach a terminal status. */
  completedAt?: string;
}

/**
 * The outcome of running a single DatasetItem within a DatasetRun.
 *
 * Relationship to replay-model:
 *   `replayResult` is the direct ReplayResult produced for this item's replay.
 *   `producedOutput` is a convenience copy of the output extracted from the
 *   replay (e.g. the produced step's output field) so evaluators and UI do not
 *   need to unwrap the full ReplayResult.
 *
 * Relationship to evaluation-model:
 *   `evaluationResults` holds every EvaluationResult run against the replay
 *   produced for this item. Multiple evaluators can contribute results.
 *   Each EvaluationResult's `target` points to the produced trace or step so
 *   it can be cross-referenced with the replay store.
 */
export interface DatasetRunResult {
  runId:   string;
  itemId:  string;
  /**
   * Convenience output extracted from the agent's response for this item.
   * Shape is agent-specific (`unknown`) and mirrors DatasetItem.expectedOutput
   * so callers can compare them directly.
   */
  producedOutput?:     unknown;
  /** Full replay record for this item, including produced step and traceId. */
  replayResult?:       ReplayResult;
  /** All evaluation results scored against the replay's produced output. */
  evaluationResults?:  EvaluationResult[];
  status: DatasetRunStatus;
}
