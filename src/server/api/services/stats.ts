import type { TraceStore } from '../../storage';
import type { DashboardStats } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function computeStats(store: TraceStore): Promise<DashboardStats> {
  const summaries = await store.getAllSummaries();
  const totalTraces = summaries.length;

  if (totalTraces === 0) {
    return {
      totalTraces: 0,
      errorTraces: 0,
      errorRate: 0,
      avgLatency: 0,
      avgTokens: 0,
      last24hTraces: 0,
      last24hErrorTraces: 0,
    };
  }

  let errorTraces = 0;
  let sumLatency = 0;
  let sumTokens = 0;
  let last24hTraces = 0;
  let last24hErrorTraces = 0;

  const cutoff = Date.now() - MS_PER_DAY;

  for (const s of summaries) {
    if (s.hasError) errorTraces++;
    sumLatency += s.totalLatency;
    sumTokens += s.totalTokens;

    if (new Date(s.createdAt).getTime() >= cutoff) {
      last24hTraces++;
      if (s.hasError) last24hErrorTraces++;
    }
  }

  return {
    totalTraces,
    errorTraces,
    errorRate: errorTraces / totalTraces,
    avgLatency: sumLatency / totalTraces,
    avgTokens: sumTokens / totalTraces,
    last24hTraces,
    last24hErrorTraces,
  };
}
