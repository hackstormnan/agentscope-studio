import { useState, useEffect } from 'react';
import { ErrorState }  from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState }   from '../components/ui/EmptyState';
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

function deriveStatus(r: DatasetRunSummary): 'success' | 'error' | 'partial' {
  if (r.errorCount === 0 && r.successCount === r.totalItems) return 'success';
  if (r.errorCount > 0) return 'error';
  return 'partial';
}

function successRate(r: DatasetRunSummary): string {
  if (r.totalItems === 0) return '—';
  return `${Math.round((r.successCount / r.totalItems) * 100)}%`;
}

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

  // Aggregate metrics
  const totalItems    = runs.reduce((s, r) => s + r.totalItems, 0);
  const totalSuccess  = runs.reduce((s, r) => s + r.successCount, 0);
  const totalErrors   = runs.reduce((s, r) => s + r.errorCount, 0);
  const avgSuccessRate = totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0;

  return (
    <div className="page">
      <div className="mb-6">
        <div className="page-title">Datasets</div>
        <div className="page-subtitle">Dataset replay runs and batch execution metrics</div>
      </div>

      {/* Metric strip */}
      {!loading && !error && runs.length > 0 && (
        <div className={styles.metricStrip}>
          <MetricTile label="Total Runs"   value={String(runs.length)} />
          <MetricTile label="Total Items"  value={totalItems.toLocaleString()} />
          <MetricTile
            label="Avg Success"
            value={`${avgSuccessRate}%`}
            color={avgSuccessRate >= 80 ? 'success' : avgSuccessRate >= 50 ? 'warning' : 'error'}
          />
          <MetricTile
            label="Total Errors"
            value={totalErrors.toLocaleString()}
            color={totalErrors > 0 ? 'error' : undefined}
          />
        </div>
      )}

      {loading && <LoadingState rows={6} />}

      {error && (
        <ErrorState title="Failed to load dataset runs" message={error} onRetry={load} />
      )}

      {!loading && !error && runs.length === 0 && (
        <EmptyState
          icon="≡"
          title="No dataset runs yet"
          description="Dataset runs appear here after you POST to /api/datasets/runs to execute a batch replay."
        />
      )}

      {!loading && !error && runs.length > 0 && (
        <>
          <div className="section-label">Runs</div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Dataset</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Success</th>
                  <th>Errors</th>
                  <th>Success Rate</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const status = deriveStatus(r);
                  const pct    = r.totalItems > 0 ? (r.successCount / r.totalItems) * 100 : 0;

                  return (
                    <tr key={r.runId} style={{ cursor: 'default' }}>
                      <td>
                        <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                          {r.runId.slice(0, 20)}…
                        </span>
                      </td>
                      <td>
                        <span className="text-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                          {r.datasetId}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${status === 'success' ? 'success' : status === 'error' ? 'error' : 'warning'}`}>
                          {status}
                        </span>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.totalItems}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>
                        {r.successCount}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: r.errorCount > 0 ? 'var(--error)' : undefined }}>
                        {r.errorCount}
                      </td>
                      <td>
                        <div className={styles.rateCell}>
                          <div className={styles.rateBar}>
                            <div
                              className={styles.rateBarFill}
                              style={{
                                width:      `${pct}%`,
                                background: r.errorCount === 0 ? 'var(--success)' : 'var(--warning)',
                              }}
                            />
                          </div>
                          <span className={styles.rateLabel}>{successRate(r)}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.completedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetricTile({
  label, value, color,
}: {
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error';
}) {
  const colorVar =
    color === 'success' ? 'var(--success)'
    : color === 'warning' ? 'var(--warning)'
    : color === 'error'   ? 'var(--error)'
    : 'var(--text)';

  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: colorVar, fontSize: 24 }}>{value}</div>
    </div>
  );
}
