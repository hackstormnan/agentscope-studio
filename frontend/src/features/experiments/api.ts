import type { ExperimentListItem, ExperimentDetail } from './types';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function listExperiments(): Promise<ExperimentListItem[]> {
  return get<ExperimentListItem[]>('/experiments');
}

export function getExperimentDetail(experimentId: string): Promise<ExperimentDetail> {
  return get<ExperimentDetail>(`/experiments/${encodeURIComponent(experimentId)}`);
}
