import { useState, useEffect } from 'react';
import { Link }              from 'react-router-dom';
import { ErrorState }        from '../components/ui/ErrorState';
import { LoadingState }      from '../components/ui/LoadingState';
import { MetricCard }        from '../components/ui/MetricCard';
import { DataTable }         from '../components/ui/DataTable';
import { PanelContainer }    from '../components/ui/PanelContainer';
import type { Column }       from '../components/ui/DataTable';
import { getTraceStats }     from '../lib/api';
import type { DashboardStats, TraceSummary } from '../lib/api';
import { runQuery }          from '../features/query/api';
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

// ── Column definitions ────────────────────────────────────────────────────────

const SLOW_COLS: Column<TraceSummary>[] = [
  {
    key: 'traceId',
    header: 'Trace ID',
    render: (t) => (
      <Link
        to={`/traces/${t.traceId}`}
        className="text-mono"
        style={{ fontSize: 11, color: 'var(--accent)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {t.traceId.slice(0, 16)}…
      </Link>
    ),
  },
  {
    key: 'latency',
    header: 'Latency',
    render: (t) => (
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
    ),
  },
  {
    key: 'tokens',
    header: 'Tokens',
    tdStyle: { fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', fontSize: 13 },
    render: (t) => t.totalTokens.toLocaleString(),
  },
  {
    key: 'err',
    header: 'Err',
    render: (t) =>
      t.hasError ? (
        <span className="badge badge-error" style={{ fontSize: 10, padding: '1px 6px' }}>err</span>
      ) : null,
  },
  {
    key: 'date',
    header: 'Date',
    render: (t) => (
      <span style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
        {fmtDate(t.createdAt)}
      </span>
    ),
  },
];

const ERROR_COLS: Column<TraceSummary>[] = [
  {
    key: 'traceId',
    header: 'Trace ID',
    render: (t) => (
      <Link
        to={`/traces/${t.traceId}`}
        className="text-mono"
        style={{ fontSize: 11, color: 'var(--accent)' }}
      >
        {t.traceId.slice(0, 16)}…
      </Link>
    ),
  },
  {
    key: 'session',
    header: 'Session',
    render: (t) => (
      <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
        {t.sessionId.slice(0, 12)}…
      </span>
    ),
  },
  {
    key: 'latency',
    header: 'Latency',
    tdStyle: { fontVariantNumeric: 'tabular-nums', fontSize: 12 },
    render: (t) => fmtMs(t.totalLatency),
  },
  {
    key: 'date',
    header: 'Date',
    render: (t) => (
      <span style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
        {fmtDate(t.createdAt)}
      </span>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

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
      runQuery({ filters: [], sort: { field: 'totalLatency', direction: 'desc' }, limit: 10 }),
      runQuery({ filters: [{ field: 'hasError', operator: 'eq', value: true }], sort: { field: 'createdAt', direction: 'desc' }, limit: 8 }),
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
          {/* Metric strip */}
          <div className={styles.metricStrip}>
            <MetricCard
              label="Avg Latency"
              value={fmtMs(stats.avgLatency)}
              sub="across all traces"
              variant="accent"
            />
            <MetricCard
              label="Avg Tokens"
              value={Math.round(stats.avgTokens).toLocaleString()}
              sub="per trace"
            />
            <MetricCard
              label="Total Traces"
              value={stats.totalTraces.toLocaleString()}
              sub={stats.last24hTraces !== undefined ? `${stats.last24hTraces} in last 24 h` : 'all time'}
            />
            <MetricCard
              label="Error Rate"
              value={`${(stats.errorRate * 100).toFixed(1)}%`}
              sub={`${stats.errorTraces} error traces`}
              variant={stats.errorRate > 0.1 ? 'error' : 'default'}
            />
          </div>

          {/* Two-column: slowest + error traces */}
          <div className={styles.twoCol}>
            <PanelContainer title="Slowest Traces" subtitle="Top 10 by total latency">
              <DataTable
                columns={SLOW_COLS}
                data={slowTraces}
                rowKey={(t) => t.traceId}
                empty={
                  <div style={{ fontSize: 13, color: 'var(--text-subtle)', padding: '16px 0' }}>
                    No trace data available yet
                  </div>
                }
              />
            </PanelContainer>

            <PanelContainer title="Recent Error Traces" subtitle="Most recent 8 traces with errors">
              {errorTraces.length === 0 ? (
                <div className={styles.noErrors}>
                  <span>✓</span>
                  <span>No error traces — system is healthy</span>
                </div>
              ) : (
                <DataTable
                  columns={ERROR_COLS}
                  data={errorTraces}
                  rowKey={(t) => t.traceId}
                />
              )}
            </PanelContainer>
          </div>
        </>
      )}
    </div>
  );
}
