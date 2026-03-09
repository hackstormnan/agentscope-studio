import { useState, useEffect, useMemo } from 'react';
import { ErrorState }    from '../components/ui/ErrorState';
import { LoadingState }  from '../components/ui/LoadingState';
import { EmptyState }    from '../components/ui/EmptyState';
import { MetricCard }    from '../components/ui/MetricCard';
import { StatusBadge }   from '../components/ui/StatusBadge';
import { DataTable }     from '../components/ui/DataTable';
import { PanelContainer } from '../components/ui/PanelContainer';
import type { Column }   from '../components/ui/DataTable';
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
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

// ── Column definitions ────────────────────────────────────────────────────────

type RuleEntry = [string, { count: number; severity: string }];

const RULE_COLS: Column<RuleEntry>[] = [
  {
    key: 'code',
    header: 'Rule Code',
    render: ([code]) => <code className="text-mono" style={{ fontSize: 12 }}>{code}</code>,
  },
  {
    key: 'severity',
    header: 'Severity',
    render: ([, { severity }]) => <StatusBadge status={severity} />,
  },
  {
    key: 'count',
    header: 'Occurrences',
    render: ([, { count }]) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{count}</span>
    ),
  },
];

const EVAL_COLS: Column<EvaluationResult>[] = [
  {
    key: 'traceId',
    header: 'Trace ID',
    render: (e) => (
      <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
        {e.target.traceId.slice(0, 16)}…
      </span>
    ),
  },
  {
    key: 'scope',
    header: 'Scope',
    render: (e) => <StatusBadge status={e.target.targetType} label={e.target.targetType} />,
  },
  {
    key: 'evaluator',
    header: 'Evaluator',
    tdStyle: { fontSize: 12, color: 'var(--text-muted)' },
    render: (e) => e.evaluatorName,
  },
  {
    key: 'status',
    header: 'Status',
    render: (e) => <StatusBadge status={e.status} />,
  },
  {
    key: 'score',
    header: 'Score',
    render: (e) =>
      e.score !== undefined ? (
        <span style={{ color: scoreColor(e.score), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {e.score.toFixed(3)}
        </span>
      ) : (
        <span style={{ color: 'var(--text-subtle)' }}>—</span>
      ),
  },
  {
    key: 'issues',
    header: 'Issues',
    render: (e) =>
      (e.issues?.length ?? 0) > 0 ? (
        <span style={{ color: 'var(--warning)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {e.issues.length}
        </span>
      ) : (
        <span style={{ color: 'var(--text-subtle)' }}>0</span>
      ),
  },
  {
    key: 'summary',
    header: 'Summary',
    tdStyle: { maxWidth: 240 },
    render: (e) => (
      <span className="truncate" style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
        {e.summary ?? '—'}
      </span>
    ),
  },
  {
    key: 'when',
    header: 'When',
    render: (e) => (
      <span style={{ fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
        {fmtDate(e.startedAt)}
      </span>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

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

  const agg = useMemo(() => {
    const allIssues: EvaluationIssue[] = evals.flatMap((e) => e.issues ?? []);
    const successful = evals.filter((e) => e.status === 'success');
    const scored     = successful.filter((e) => e.score !== undefined);
    const avgScore   = scored.length > 0
      ? scored.reduce((s, e) => s + (e.score ?? 0), 0) / scored.length
      : undefined;

    const codeCounts: Record<string, { count: number; severity: string }> = {};
    for (const issue of allIssues) {
      if (!codeCounts[issue.code]) codeCounts[issue.code] = { count: 0, severity: issue.severity };
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

  const avgScoreVariant =
    agg.avgScore === undefined ? 'default'
    : agg.avgScore >= 0.8     ? 'success'
    : agg.avgScore >= 0.5     ? 'warning'
    : 'error';

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
          {/* Metric strip */}
          <div className={styles.metricStrip}>
            <MetricCard label="Total Evaluations" value={evals.length} />
            <MetricCard
              label="Avg Score"
              value={agg.avgScore !== undefined ? agg.avgScore.toFixed(3) : '—'}
              variant={avgScoreVariant}
            />
            <MetricCard
              label="Total Issues"
              value={agg.totalIssues}
              variant={agg.totalIssues > 0 ? 'error' : 'default'}
            />
            <MetricCard
              label="Errors / Warnings"
              value={
                <span style={{ fontSize: 22 }}>
                  <span style={{ color: 'var(--error)' }}>{agg.errorIssues}</span>
                  <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}> / </span>
                  <span style={{ color: 'var(--warning)' }}>{agg.warningIssues}</span>
                </span>
              }
            />
          </div>

          {/* Two-column: rule violations + severity bars */}
          <div className={styles.twoCol}>
            <PanelContainer title="Rule Violations">
              {agg.topCodes.length === 0 ? (
                <div className={styles.clean}>✓ No rule violations found</div>
              ) : (
                <DataTable
                  columns={RULE_COLS}
                  data={agg.topCodes}
                  rowKey={([code]) => code}
                />
              )}
            </PanelContainer>

            <PanelContainer title="Issue Breakdown">
              <div className={styles.issueCard}>
                <SeverityBar label="Errors"   count={agg.errorIssues}   total={agg.totalIssues} color="var(--error)" />
                <SeverityBar label="Warnings" count={agg.warningIssues} total={agg.totalIssues} color="var(--warning)" />
                <SeverityBar label="Info"     count={agg.infoIssues}    total={agg.totalIssues} color="var(--accent)" />
                <div className={styles.issueTotal}>
                  <span>{agg.totalIssues} total issue{agg.totalIssues !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'var(--text-subtle)' }}>across {evals.length} evaluations</span>
                </div>
              </div>
            </PanelContainer>
          </div>

          <div className="divider" />

          {/* Recent evaluations table */}
          <PanelContainer title="Recent Evaluations">
            {evals.length === 0 ? (
              <EmptyState
                icon="◎"
                title="No evaluations yet"
                description="Run evaluations from the Trace Detail page (Evaluation tab) or via POST /api/evaluations."
              />
            ) : (
              <DataTable
                columns={EVAL_COLS}
                data={evals.slice(0, 50)}
                rowKey={(e) => e.evaluationId}
              />
            )}
          </PanelContainer>
        </>
      )}
    </div>
  );
}
