import type { DatasetRun, DatasetRunResult } from '../../core/dataset-model';

/** Compact metrics for a completed (or failed) batch run. */
export interface DatasetRunSummary {
  runId:        string;
  datasetId:    string;
  totalItems:   number;
  successCount: number;
  errorCount:   number;
  startedAt?:   string;
  completedAt?: string;
}

/**
 * The full response returned by BatchReplayService.runDatasetReplay and
 * persisted to disk under data/datasets/runs/<runId>.json.
 */
export interface DatasetBatchRunResponse {
  run:     DatasetRun;
  summary: DatasetRunSummary;
  results: DatasetRunResult[];
}
