import { useState, useEffect } from 'react';
import { ErrorState }    from '../components/ui/ErrorState';
import { LoadingState }  from '../components/ui/LoadingState';
import { EmptyState }    from '../components/ui/EmptyState';
import { MetricCard }    from '../components/ui/MetricCard';
import { StatusBadge }   from '../components/ui/StatusBadge';
import { DataTable }     from '../components/ui/DataTable';
import { PanelContainer } from '../components/ui/PanelContainer';
import type { Column }   from '../components/ui/DataTable';
import { listDatasetRuns } from '../features/datasets/api';
import type { DatasetRunSummary } from '../features/datasets/api';
import styles from './DatasetsPage.module.css';

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function deriveStatus(r: DatasetRunSummary): 'success' | 'error' | 'warning' {
  if (r.errorCount === 0 && r.successCount === r.totalItems) return 'success';
  if (r.errorCount > 0) return 'error';
  return 'warning';
}

function successRate(r: DatasetRunSummary): number {
  if (r.totalItems === 0) return 0;
  return Math.round((r.successCount / r.totalItems) * 100);
}

// ── Rate bar cell ─────────────────────────────────────────────────────────────

function RateBar({ run }: { run: DatasetRunSummary }) {
  const pct = run.totalItems > 0 ? (run.successCount / run.totalItems) * 100 : 0;
  return (
    <div className={styles.rateCell}>
      <div className={styles.rateBar}>
        <div
          className={styles.rateBarFill}
          style={{
            width: `${pct}%`,
            background: run.errorCount === 0 ? 'var(--success)' : 'var(--warning)',
          }}
        />
      </div>
      <span className={styles.rateLabel}>{successRate(run)}%</span>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: Column<DatasetRunSummary>[] = [
  {
    key: 'runId',
    header: 'Run ID',
    render: (r) => (
      <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
        {r.runId.slice(0, 20)}…
      </span>
    ),
  },
  {
    key: 'datasetId',
    header: 'Dataset',
    render: (r) => (
      <span className="text-mono text-sm" style={{ color: 'var(--text-muted)' }}>
        {r.datasetId}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <StatusBadge status={deriveStatus(r)} />,
  },
  {
    key: 'items',
    header: 'Items',
    render: (r) => r.totalItems,
    tdStyle: { fontVariantNumeric: 'tabular-nums' },
  },
  {
    key: 'success',
    header: 'Success',
    render: (r) => r.successCount,
    tdStyle: { fontVariantNumeric: 'tabular-nums', color: 'var(--success)' },
  },
  {
    key: 'errors',
    header: 'Errors',
    render: (r) => r.errorCount,
    tdStyle: (r) => ({
      fontVariantNumeric: 'tabular-nums',
      color: r.errorCount > 0 ? 'var(--error)' : undefined,
    }),
  },
  {
    key: 'rate',
    header: 'Success Rate',
    render: (r) => <RateBar run={r} />,
  },
  {
    key: 'date',
    header: 'Completed',
    render: (r) => (
      <span style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
        {fmtDate(r.completedAt)}
      </span>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DatasetsPage() {
  const [runs,    setRuns]    = useState<DatasetRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listDatasetRuns()
      .then(setRuns)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load dataset runs'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const totalItems     = runs.reduce((s, r) => s + r.totalItems, 0);
  const totalSuccess   = runs.reduce((s, r) => s + r.successCount, 0);
  const totalErrors    = runs.reduce((s, r) => s + r.errorCount, 0);
  const avgSuccessRate = totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0;

  return (
    <div className="page">
      <div className="mb-6">
        <div className="page-title">Datasets</div>
        <div className="page-subtitle">Dataset replay runs and batch execution metrics</div>
      </div>

      {loading && <LoadingState rows={6} />}
      {error   && <ErrorState title="Failed to load dataset runs" message={error} onRetry={load} />}

      {!loading && !error && runs.length > 0 && (
        <>
          {/* Metric strip */}
          <div className={styles.metricStrip}>
            <MetricCard label="Total Runs"  value={runs.length} />
            <MetricCard label="Total Items" value={totalItems.toLocaleString()} />
            <MetricCard
              label="Avg Success"
              value={`${avgSuccessRate}%`}
              variant={avgSuccessRate >= 80 ? 'success' : avgSuccessRate >= 50 ? 'warning' : 'error'}
            />
            <MetricCard
              label="Total Errors"
              value={totalErrors.toLocaleString()}
              variant={totalErrors > 0 ? 'error' : 'default'}
            />
          </div>

          {/* Runs table */}
          <PanelContainer title="Runs">
            <DataTable
              columns={COLUMNS}
              data={runs}
              rowKey={(r) => r.runId}
            />
          </PanelContainer>
        </>
      )}

      {!loading && !error && runs.length === 0 && (
        <EmptyState
          icon="≡"
          title="No dataset runs yet"
          description="Dataset runs appear here after you POST to /api/datasets/runs to execute a batch replay."
        />
      )}
    </div>
  );
}
