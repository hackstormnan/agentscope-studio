import { useState, useEffect, useMemo } from 'react';
import { ErrorState }  from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState }   from '../components/ui/EmptyState';
import { listEvaluations } from '../features/evaluation/api';
import type { EvaluationResult, EvaluationIssue } from '../features/evaluation/types';
import styles from './EvaluationCenterPage.module.css';

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function scoreColor(score: number): string {
  if (score >= 0.8)  return 'var(--success)';
  if (score >= 0.5)  return 'var(--warning)';
  return 'var(--error)';
}

export default function EvaluationCenterPage() {
  const [evals,   setEvals]   = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listEvaluations(100)
      .then(setEvals)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load evaluations'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // ── Aggregation ─────────────────────────────────────────────────────────────
  const agg = useMemo(() => {
    const allIssues: EvaluationIssue[] = evals.flatMap((e) => e.issues ?? []);
    const successful = evals.filter((e) => e.status === 'success');
    const scored     = successful.filter((e) => e.score !== undefined);
    const avgScore   = scored.length > 0
      ? scored.reduce((s, e) => s + (e.score ?? 0), 0) / scored.length
      : undefined;

    // Issue counts by rule code — top 10 for the breakdown table
    const codeCounts: Record<string, { count: number; severity: string }> = {};
    for (const issue of allIssues) {
      if (!codeCounts[issue.code]) {
        codeCounts[issue.code] = { count: 0, severity: issue.severity };
      }
      codeCounts[issue.code].count++;
    }
    const topCodes = Object.entries(codeCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return {
      totalIssues:   allIssues.length,
      errorIssues:   allIssues.filter((i) => i.severity === 'error').length,
      warningIssues: allIssues.filter((i) => i.severity === 'warning').length,
      infoIssues:    allIssues.filter((i) => i.severity === 'info').length,
      avgScore,
      topCodes,
    };
  }, [evals]);

  return (
    <div className="page">
      <div className="mb-6">
        <div className="page-title">Evaluation Center</div>
        <div className="page-subtitle">Rule-based evaluation results, quality signals, and issue trends</div>
      </div>

      {loading && <LoadingState rows={6} />}
      {error   && <ErrorState title="Failed to load evaluations" message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {/* ── Metric strip ──────────────────────────────────────────────── */}
          <div className={styles.metricStrip}>
            <div className="stat-card">
              <div className="stat-card-label">Total Evaluations</div>
              <div className="stat-card-value">{evals.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Avg Score</div>
              <div
                className="stat-card-value"
                style={{ color: agg.avgScore !== undefined ? scoreColor(agg.avgScore) : 'var(--text-subtle)' }}
              >
                {agg.avgScore !== undefined ? agg.avgScore.toFixed(3) : '—'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Issues</div>
              <div className={`stat-card-value${agg.totalIssues > 0 ? ' stat-card-value--error' : ''}`}>
                {agg.totalIssues}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Errors / Warnings</div>
              <div className="stat-card-value" style={{ fontSize: 22 }}>
                <span style={{ color: 'var(--error)' }}>{agg.errorIssues}</span>
                <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}> / </span>
                <span style={{ color: 'var(--warning)' }}>{agg.warningIssues}</span>
              </div>
            </div>
          </div>

          {/* ── Two-column: rule violations + issue bars ───────────────────── */}
          <div className={styles.twoCol}>
            {/* Rule violation table */}
            <div>
              <div className="section-label">Rule Violations</div>
              {agg.topCodes.length === 0 ? (
                <div className={styles.clean}>✓ No rule violations found</div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rule Code</th>
                        <th>Severity</th>
                        <th>Occurrences</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agg.topCodes.map(([code, { count, severity }]) => (
                        <tr key={code} style={{ cursor: 'default' }}>
                          <td>
                            <code className="text-mono" style={{ fontSize: 12 }}>{code}</code>
                          </td>
                          <td>
                            <span className={`badge badge-${severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'default'}`}>
                              {severity}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                              {count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Issue severity bars */}
            <div>
              <div className="section-label">Issue Breakdown</div>
              <div className={styles.issueCard}>
                <SeverityBar label="Errors"   count={agg.errorIssues}   total={agg.totalIssues} color="var(--error)" />
                <SeverityBar label="Warnings" count={agg.warningIssues} total={agg.totalIssues} color="var(--warning)" />
                <SeverityBar label="Info"     count={agg.infoIssues}    total={agg.totalIssues} color="var(--accent)" />
                <div className={styles.issueTotal}>
                  <span>{agg.totalIssues} total issue{agg.totalIssues !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'var(--text-subtle)' }}>across {evals.length} evaluations</span>
                </div>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* ── Recent evaluations table ────────────────────────────────────── */}
          <div className="section-label">Recent Evaluations</div>

          {evals.length === 0 ? (
            <EmptyState
              icon="◎"
              title="No evaluations yet"
              description="Run evaluations from the Trace Detail page (Evaluation tab) or via POST /api/evaluations."
            />
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trace ID</th>
                    <th>Scope</th>
                    <th>Evaluator</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Issues</th>
                    <th>Summary</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {evals.slice(0, 50).map((e) => (
                    <tr key={e.evaluationId} style={{ cursor: 'default' }}>
                      <td>
                        <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                          {e.target.traceId.slice(0, 16)}…
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-default">{e.target.targetType}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.evaluatorName}</td>
                      <td>
                        <span className={`badge badge-${e.status === 'success' ? 'success' : e.status === 'error' ? 'error' : 'default'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td>
                        {e.score !== undefined
                          ? <span style={{ color: scoreColor(e.score), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {e.score.toFixed(3)}
                            </span>
                          : <span style={{ color: 'var(--text-subtle)' }}>—</span>
                        }
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {(e.issues?.length ?? 0) > 0
                          ? <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{e.issues.length}</span>
                          : <span style={{ color: 'var(--text-subtle)' }}>0</span>
                        }
                      </td>
                      <td style={{ maxWidth: 240 }}>
                        <span className="truncate" style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                          {e.summary ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                        {fmtDate(e.startedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBar({
  label, count, total, color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      </div>
      <div style={{ background: 'var(--surface-3)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}
