// Local mirror of src/core/regression-model — no cross-package imports.

export type RegressionStatus = 'improved' | 'regressed' | 'unchanged';

export interface RegressionMetricDelta {
  metric:           string;
  baselineValue?:   number;
  candidateValue?:  number;
  absoluteDelta?:   number;
  percentageDelta?: number;
  status:           RegressionStatus;
}

export interface RegressionIssueDelta {
  issueCode:      string;
  baselineCount:  number;
  candidateCount: number;
  delta:          number;
  status:         RegressionStatus;
}

export interface RegressionComparison {
  baselineRunId:  string;
  candidateRunId: string;
  metricDeltas:   RegressionMetricDelta[];
  issueDeltas:    RegressionIssueDelta[];
}

export interface RegressionReport {
  reportId:       string;
  baselineRunId:  string;
  candidateRunId: string;
  createdAt:      string;
  summary?:       string;
  comparison:     RegressionComparison;
}
