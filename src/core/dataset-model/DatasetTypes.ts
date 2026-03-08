/**
 * A named, versioned collection of input/output pairs used as the source
 * for batch replay and evaluation runs.
 */
export interface Dataset {
  datasetId:    string;
  name:         string;
  description?: string;
  items:        DatasetItem[];
  /** Arbitrary caller-defined metadata (e.g. version, tags, owner). */
  metadata?:    Record<string, unknown>;
}

/**
 * A single row in a Dataset.
 *
 * - `input`          — the value fed into the agent during a replay. Shape is
 *                      agent-specific and intentionally left as `unknown`.
 * - `expectedOutput` — optional ground-truth value used by evaluators to
 *                      score the replay's produced output.
 */
export interface DatasetItem {
  itemId:          string;
  input:           unknown;
  expectedOutput?: unknown;
  /** Arbitrary per-item metadata (e.g. source, difficulty, label). */
  metadata?:       Record<string, unknown>;
}
