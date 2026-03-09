import type { EvaluationResult } from '../../core/evaluation-model';

// ── Per-item evaluation output ───────────────────────────────────────────────

export interface ItemEvaluation {
  itemId:      string;
  evaluations: EvaluationResult[];
}

// ── Run-level aggregation ────────────────────────────────────────────────────

export interface BatchEvaluationSummary {
  runId:             string;
  totalItems:        number;
  evaluatedItems:    number;   // items that produced at least one successful evaluation
  issueCount:        number;   // total issues across all evaluated items
  errorIssueCount:   number;   // issues with severity === 'error'
  warningIssueCount: number;   // issues with severity === 'warning'
  averageScore?:     number;   // mean score across scored items; absent if none scored
  successRate?:      number;   // fraction of evaluated items with zero issues [0,1]
}

// ── Top-level response ────────────────────────────────────────────────────────

export interface BatchEvaluationResponse {
  runId:           string;
  summary:         BatchEvaluationSummary;
  itemEvaluations: ItemEvaluation[];
  evaluatedAt:     string;  // ISO 8601
}
