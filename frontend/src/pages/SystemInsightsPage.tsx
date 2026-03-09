import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState }  from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { getTraceStats } from '../lib/api';
import type { DashboardStats, TraceSummary } from '../lib/api';
import { runQuery } from '../features/query/api';
import styles from './SystemInsightsPage.module.css';

function fmtMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1_000)  return `${(ms / 1_000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function latencyColor(ms: number): string {
  if (ms > 10_000) return 'var(--error)';
  if (ms > 3_000)  return 'var(--warning)';
  return 'var(--success)';
}

export default function SystemInsightsPage() {
  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [slowTraces,  setSlowTraces]  = useState<TraceSummary[]>([]);
  const [errorTraces, setErrorTraces] = useState<TraceSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);

    Promise.all([
      getTraceStats(),
      // Top-10 slowest traces
      runQuery({
        filters: [],
        sort:    { field: 'totalLatency', direction: 'desc' },
        limit:   10,
      }),
      // Most-recent error traces
      runQuery({
        filters: [{ field: 'hasError', operator: 'eq', value: true }],
        sort:    { field: 'createdAt', direction: 'desc' },
        limit:   8,
      }),
    ])
      .then(([s, slowResult, errorResult]) => {
        setStats(s);
        setSlowTraces(slowResult.items);
        setErrorTraces(errorResult.items);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load system insights'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="page">
      <div className="mb-6">
        <div className="page-title">System Insights</div>
        <div className="page-subtitle">Latency, token usage, and health trends across all traces</div>
      </div>

      {loading && <LoadingState rows={8} />}
      {error   && <ErrorState title="Failed to load insights" message={error} onRetry={load} />}

      {!loading && !error && stats && (
        <>
          {/* ── Metric strip ──────────────────────────────────────────────── */}
          <div className={styles.metricStrip}>
            <div className="stat-card">
              <div className="stat-card-label">Avg Latency</div>
              <div className="stat-card-value stat-card-value--accent">{fmtMs(stats.avgLatency)}</div>
              <div className="stat-card-sub">across all traces</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Avg Tokens</div>
              <div className="stat-card-value">{Math.round(stats.avgTokens).toLocaleString()}</div>
              <div className="stat-card-sub">per trace</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Traces</div>
              <div className="stat-card-value">{stats.totalTraces.toLocaleString()}</div>
              <div className="stat-card-sub">
                {stats.last24hTraces !== undefined
                  ? `${stats.last24hTraces} in last 24 h`
                  : 'all time'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Error Rate</div>
              <div className={`stat-card-value${stats.errorRate > 0.1 ? ' stat-card-value--error' : ''}`}>
                {(stats.errorRate * 100).toFixed(1)}%
              </div>
              <div className="stat-card-sub">{stats.errorTraces} error traces</div>
            </div>
          </div>

          {/* ── Two-column: slowest + error traces ────────────────────────── */}
          <div className={styles.twoCol}>
            {/* Slowest traces */}
            <div>
              <div className="section-label">Slowest Traces</div>
              {slowTraces.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-subtle)', padding: '16px 0' }}>
                  No trace data available yet
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Trace ID</th>
                        <th>Latency</th>
                        <th>Tokens</th>
                        <th>Err</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slowTraces.map((t) => (
                        <tr key={t.traceId}>
                          <td>
                            <Link
                              to={`/traces/${t.traceId}`}
                              className="text-mono"
                              style={{ fontSize: 11, color: 'var(--accent)' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t.traceId.slice(0, 16)}…
                            </Link>
                          </td>
                          <td>
                            <span
                              className={styles.latencyChip}
                              style={{
                                background: t.totalLatency > 10_000 ? 'var(--error-bg)'
                                  : t.totalLatency > 3_000 ? 'var(--warning-bg)'
                                  : 'var(--success-bg)',
                                color: latencyColor(t.totalLatency),
                              }}
                            >
                              {fmtMs(t.totalLatency)}
                            </span>
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', fontSize: 13 }}>
                            {t.totalTokens.toLocaleString()}
                          </td>
                          <td>
                            {t.hasError && <span className="badge badge-error" style={{ fontSize: 10, padding: '1px 6px' }}>err</span>}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                            {fmtDate(t.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent error traces */}
            <div>
              <div className="section-label">Recent Error Traces</div>
              {errorTraces.length === 0 ? (
                <div className={styles.noErrors}>
                  <span>✓</span>
                  <span>No error traces — system is healthy</span>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Trace ID</th>
                        <th>Session</th>
                        <th>Latency</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorTraces.map((t) => (
                        <tr key={t.traceId}>
                          <td>
                            <Link
                              to={`/traces/${t.traceId}`}
                              className="text-mono"
                              style={{ fontSize: 11, color: 'var(--accent)' }}
                            >
                              {t.traceId.slice(0, 16)}…
                            </Link>
                          </td>
                          <td>
                            <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                              {t.sessionId.slice(0, 12)}…
                            </span>
                          </td>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                            {fmtMs(t.totalLatency)}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                            {fmtDate(t.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
