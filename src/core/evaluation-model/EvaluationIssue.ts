import type { EvaluationSeverity } from './EvaluationTypes';

/**
 * A single finding produced by an evaluator.
 *
 * - `code`        — machine-readable identifier (e.g. "PROMPT_TOO_LONG")
 * - `title`       — short human-readable label
 * - `description` — full explanation, may include remediation guidance
 * - `severity`    — how serious the issue is
 * - `metadata`    — optional arbitrary payload (e.g. token counts, diff excerpts)
 */
export interface EvaluationIssue {
  code:         string;
  title:        string;
  description:  string;
  severity:     EvaluationSeverity;
  metadata?:    Record<string, unknown>;
}
