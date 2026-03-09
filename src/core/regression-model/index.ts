// ── Regression model — core types ────────────────────────────────────────────
//
// Used by RegressionReportService (server) and mirrored in the frontend
// features/regression/types.ts.  No runtime logic lives here.

/**
 * Per-metric verdict after comparing baseline vs. candidate.
 *
 * Classification rules (applied by RegressionReportService):
 *   higher-better metrics (evaluationScore, successRate):
 *     improved   → candidateValue > baselineValue
 *     regressed  → candidateValue < baselineValue
 *     unchanged  → equal, or both undefined
 *
 *   lower-better metrics (issueCount, errorIssueCount, warningIssueCount,
 *                          averageLatency, estimatedCost):
 *     improved   → candidateValue < baselineValue
 *     regressed  → candidateValue > baselineValue
 *     unchanged  → equal, or both undefined
 *
 *   For issue deltas the delta field drives status:
 *     improved   → delta < 0  (fewer occurrences in candidate)
 *     regressed  → delta > 0  (more occurrences in candidate)
 *     unchanged  → delta === 0
 */
export type RegressionStatus = 'improved' | 'regressed' | 'unchanged';

/** Change in a single numeric metric between two runs. */
export interface RegressionMetricDelta {
  /** Human-readable metric name, e.g. "evaluationScore". */
  metric: string;
  baselineValue?:   number;
  candidateValue?:  number;
  /** candidateValue − baselineValue.  Absent if either value is missing. */
  absoluteDelta?:   number;
  /** (absoluteDelta / baselineValue) × 100.  Absent if baseline is 0 or missing. */
  percentageDelta?: number;
  status: RegressionStatus;
}

/** Change in how often a specific rule-violation code fired between two runs. */
export interface RegressionIssueDelta {
  /** The evaluation rule code, e.g. "STEP_ERROR_STATUS". */
  issueCode:      string;
  baselineCount:  number;
  candidateCount: number;
  /** candidateCount − baselineCount.  Negative → fewer issues (improvement). */
  delta:          number;
  status:         RegressionStatus;
}

/** Full comparison payload — arrays of deltas for metrics and issue codes. */
export interface RegressionComparison {
  baselineRunId:  string;
  candidateRunId: string;
  metricDeltas:   RegressionMetricDelta[];
  issueDeltas:    RegressionIssueDelta[];
}

/** Top-level regression report persisted to disk and returned by the API. */
export interface RegressionReport {
  reportId:       string;
  baselineRunId:  string;
  candidateRunId: string;
  createdAt:      string;   // ISO 8601
  /** One-line human summary, e.g. "2 regressions, 3 improvements detected." */
  summary?:       string;
  comparison:     RegressionComparison;
}
