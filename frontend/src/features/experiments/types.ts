// Local mirrors of src/core/experiment-model types.
// Kept here to avoid cross-package imports from the frontend.

export type ExperimentRunStatus = 'pending' | 'running' | 'success' | 'error';

export interface ExperimentConfig {
  promptVersion?:  string;
  model?:          string;
  temperature?:    number;
  replayOverrides?: {
    overridePrompt?: string;
    overrideInput?:  unknown;
  };
  metadata?: Record<string, unknown>;
}

export interface Experiment {
  experimentId:  string;
  name:          string;
  description?:  string;
  createdAt:     string;
  metadata?:     Record<string, unknown>;
}

/** Experiment with run count, returned by GET /api/experiments */
export interface ExperimentListItem extends Experiment {
  runCount: number;
}

export interface ExperimentRun {
  runId:        string;
  experimentId: string;
  datasetRunId: string;
  config?:      ExperimentConfig;
  status:       ExperimentRunStatus;
  startedAt?:   string;
  completedAt?: string;
}

export interface ExperimentRunSummary {
  runId:             string;
  datasetSize:       number;
  successCount:      number;
  errorCount:        number;
  evaluationScore?:  number;
  averageLatency?:   number;
  estimatedCost?:    number;
}

export interface ExperimentRunWithSummary {
  run:     ExperimentRun;
  summary: ExperimentRunSummary;
}

export interface ExperimentDetail {
  experiment: Experiment;
  runs:       ExperimentRunWithSummary[];
}
