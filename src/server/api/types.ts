export interface DashboardStats {
  totalTraces: number;
  errorTraces: number;
  /** Fraction of traces that have at least one error step (0–1). */
  errorRate: number;
  avgLatency: number;
  avgTokens: number;
  last24hTraces?: number;
  last24hErrorTraces?: number;
}
