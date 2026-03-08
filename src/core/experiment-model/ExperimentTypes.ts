import type { ReplayOverrides } from '../replay-model';

/**
 * A named experiment — the top-level container grouping one or more runs
 * that test a hypothesis (e.g. "does prompt v2 reduce errors?").
 */
export interface Experiment {
  experimentId:  string;
  name:          string;
  description?:  string;
  /** ISO 8601 timestamp set at creation time. */
  createdAt:     string;
  metadata?:     Record<string, unknown>;
}

/** Lifecycle status mirroring DatasetRunStatus / ReplayStatus. */
export type ExperimentRunStatus = 'pending' | 'running' | 'success' | 'error';

/**
 * The variable configuration that distinguishes one experiment run from
 * another.  All fields are optional so callers only set what they vary.
 *
 * - `promptVersion`    — human-readable label for the prompt being tested
 * - `model`            — model identifier (e.g. "claude-sonnet-4-6")
 * - `temperature`      — sampling temperature passed to the model
 * - `replayOverrides`  — prompt/input overrides forwarded to BatchReplayService
 */
export interface ExperimentConfig {
  promptVersion?:   string;
  model?:           string;
  temperature?:     number;
  replayOverrides?: ReplayOverrides;
  metadata?:        Record<string, unknown>;
}

/**
 * A single execution of an Experiment against a Dataset.
 *
 * An ExperimentRun is created before execution begins (status: 'pending') and
 * updated as it progresses.  `datasetRunId` is the runId returned by
 * BatchReplayService — it is the foreign key that links this experiment run to
 * its concrete replay and evaluation results.
 */
export interface ExperimentRun {
  runId:         string;
  experimentId:  string;
  /** Foreign key → DatasetRun.runId produced by BatchReplayService. */
  datasetRunId:  string;
  config?:       ExperimentConfig;
  status:        ExperimentRunStatus;
  /** ISO 8601 — set when status transitions away from 'pending'. */
  startedAt?:    string;
  /** ISO 8601 — set when a terminal status is reached. */
  completedAt?:  string;
}

/**
 * Aggregate metrics computed over an ExperimentRun's results, suitable for
 * side-by-side comparison across runs of the same Experiment.
 *
 * This is a read-model populated by a caller after the run completes; it is
 * not computed by the store itself.
 */
export interface ExperimentRunSummary {
  runId:              string;
  datasetSize:        number;
  successCount:       number;
  errorCount:         number;
  /** Mean evaluation score across all scored items (0–1), if available. */
  evaluationScore?:   number;
  /** Mean latency in milliseconds across all items. */
  averageLatency?:    number;
  /** Estimated total cost in USD. */
  estimatedCost?:     number;
}
