const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

export interface DatasetRunSummary {
  runId:        string;
  datasetId:    string;
  totalItems:   number;
  successCount: number;
  errorCount:   number;
  startedAt?:   string;
  completedAt?: string;
}

export async function listDatasetRuns(): Promise<DatasetRunSummary[]> {
  const res = await fetch(`${BASE}/datasets/runs`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json() as { items: DatasetRunSummary[] };
  return data.items ?? [];
}
