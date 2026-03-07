// Mirror of src/core/evaluation-model — kept local to avoid cross-package imports.

export type EvaluationScope    = 'trace' | 'step';
export type EvaluationStatus   = 'pending' | 'running' | 'success' | 'error';
export type EvaluationSeverity = 'info' | 'warning' | 'error';

export interface EvaluationTarget {
  traceId:    string;
  stepId?:    string;
  targetType: EvaluationScope;
}

export interface EvaluationIssue {
  code:        string;
  title:       string;
  description: string;
  severity:    EvaluationSeverity;
  metadata?:   Record<string, unknown>;
}

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
