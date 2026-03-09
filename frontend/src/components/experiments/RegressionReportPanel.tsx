import { useState } from 'react';
import { Button }        from '../ui/Button';
import { StatusBadge }   from '../ui/StatusBadge';
import { DiffIndicator } from '../ui/DiffIndicator';
import { DataTable }     from '../ui/DataTable';
import type { Column }   from '../ui/DataTable';
import { generateRegressionReport } from '../../features/regression/api';
import type {
  RegressionReport,
  RegressionMetricDelta,
  RegressionIssueDelta,
  RegressionStatus,
} from '../../features/regression/types';
import type { ExperimentRunWithSummary } from '../../features/experiments/types';
import type { BatchEvaluationResponse }  from '../../features/experiments/evaluationApi';
import styles from './RegressionReportPanel.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusIcon(s: RegressionStatus): string {
  if (s === 'improved')  return '↑';
  if (s === 'regressed') return '↓';
  return '→';
}

function fmtMetricValue(metric: string, v: number | undefined): string {
  if (v === undefined) return '—';
  if (metric === 'evaluationScore' || metric === 'successRate') return v.toFixed(3);
  if (metric === 'averageLatency') return `${Math.round(v)}ms`;
  if (metric === 'estimatedCost')  return `$${v.toFixed(4)}`;
  return String(Math.round(v));
}

function overallStatus(report: RegressionReport): 'improved' | 'regressed' | 'neutral' {
  const deltas = report.comparison.metricDeltas;
  const regressions = deltas.filter((d) => d.status === 'regressed').length;
  const improvements = deltas.filter((d) => d.status === 'improved').length;
  if (regressions > 0) return 'regressed';
  if (improvements > 0) return 'improved';
  return 'neutral';
}

// ── Issue delta columns ───────────────────────────────────────────────────────

const ISSUE_COLS: Column<RegressionIssueDelta>[] = [
  {
    key: 'code',
    header: 'Issue Code',
    render: (d) => <code className="text-mono" style={{ fontSize: 12 }}>{d.issueCode}</code>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (d) => <StatusBadge status={d.status} />,
  },
  {
    key: 'baseline',
    header: 'Baseline',
    tdStyle: { fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' },
    render: (d) => d.baselineCount,
  },
  {
    key: 'candidate',
    header: 'Candidate',
    tdStyle: { fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' },
    render: (d) => d.candidateCount,
  },
  {
    key: 'delta',
    header: 'Delta',
    render: (d) => (
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          color: d.status === 'improved' ? 'var(--success)'
            : d.status === 'regressed' ? 'var(--error)'
            : 'var(--text-subtle)',
        }}
      >
        {d.delta > 0 ? `+${d.delta}` : d.delta}
      </span>
    ),
  },
];

// ── MetricDeltaTile ───────────────────────────────────────────────────────────

function MetricDeltaTile({ delta }: { delta: RegressionMetricDelta }) {
  const tileClass =
    delta.status === 'improved' ? ` ${styles.metricTileImproved}`
    : delta.status === 'regressed' ? ` ${styles.metricTileRegressed}`
    : '';

  const pct = delta.percentageDelta !== undefined
    ? `${delta.percentageDelta > 0 ? '+' : ''}${delta.percentageDelta.toFixed(1)}%`
    : undefined;

  // Polarity of DiffIndicator arrow: lower-better metrics → negative direction
  const lowerBetter = ['issueCount', 'errorIssueCount', 'warningIssueCount', 'averageLatency', 'estimatedCost'];
  const diffDirection = lowerBetter.includes(delta.metric) ? 'negative' : 'positive';

  return (
    <div className={`${styles.metricTile}${tileClass}`}>
      <div className={styles.metricTileLabel}>{delta.metric}</div>
      <div className={styles.metricTileValues}>
        <DiffIndicator
          before={fmtMetricValue(delta.metric, delta.baselineValue)}
          after={fmtMetricValue(delta.metric, delta.candidateValue)}
          direction={diffDirection}
        />
        {pct && (
          <span
            className={styles.metricTilePct}
            style={{
              color: delta.status === 'improved' ? 'var(--success)'
                : delta.status === 'regressed' ? 'var(--error)'
                : undefined,
            }}
          >
            ({pct})
          </span>
        )}
      </div>
      <StatusBadge status={delta.status} />
    </div>
  );
}

// ── SummaryBanner ─────────────────────────────────────────────────────────────

function SummaryBanner({ report }: { report: RegressionReport }) {
  const overall = overallStatus(report);
  const bannerClass =
    overall === 'improved'  ? styles.summaryBannerImproved
    : overall === 'regressed' ? styles.summaryBannerRegressed
    : styles.summaryBannerNeutral;
  const icon = overall === 'improved' ? '✓' : overall === 'regressed' ? '⚠' : '→';

  return (
    <div className={`${styles.summaryBanner} ${bannerClass}`}>
      <span>{icon}</span>
      <span>{report.summary}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RegressionReportPanelProps {
  runA: ExperimentRunWithSummary;
  runB: ExperimentRunWithSummary;
  /** Pre-loaded batch evaluations — null means run hasn't been evaluated yet. */
  evalA: BatchEvaluationResponse | null;
  evalB: BatchEvaluationResponse | null;
}

export function RegressionReportPanel({ runA, runB, evalA, evalB }: RegressionReportPanelProps) {
  const [report,  setReport]  = useState<RegressionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const canGenerate = evalA !== null && evalB !== null;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);

    try {
      const result = await generateRegressionReport({
        baselineRunId:   runA.run.datasetRunId,
        candidateRunId:  runB.run.datasetRunId,
        // Pass supplemental metrics from the experiment run summary if available
        baselineLatency:  runA.summary.averageLatency,
        candidateLatency: runB.summary.averageLatency,
        baselineCost:     runA.summary.estimatedCost,
        candidateCost:    runB.summary.estimatedCost,
      });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Regression Report</span>
          {report && (
            <StatusBadge
              status={overallStatus(report) === 'regressed' ? 'error' : overallStatus(report) === 'improved' ? 'success' : 'pending'}
              label={overallStatus(report)}
            />
          )}
        </div>
        {canGenerate && (
          <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : report ? 'Re-generate' : 'Generate Regression Report'}
          </Button>
        )}
      </div>

      {/* Cannot generate — evaluations missing */}
      {!canGenerate && (
        <div className={styles.noEvalHint}>
          Evaluate both runs (via the Batch Evaluation panel below) to enable regression report generation.
        </div>
      )}

      {/* Can generate but hasn't yet */}
      {canGenerate && !report && !loading && !error && (
        <div className={styles.generateRow}>
          <span className={styles.generateHint}>
            Both runs have been evaluated. Click "Generate Regression Report" to compare them.
          </span>
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.errorBanner}>⚠ {error}</div>}

      {/* Report content */}
      {report && (
        <>
          <SummaryBanner report={report} />

          {/* Metric delta tiles */}
          <div className={styles.metricGrid}>
            {report.comparison.metricDeltas.map((delta) => (
              <MetricDeltaTile key={delta.metric} delta={delta} />
            ))}
          </div>

          {/* Issue code delta table */}
          {report.comparison.issueDeltas.length > 0 && (
            <div className={styles.issueSection}>
              <div className={styles.issueSectionLabel}>Issue Code Changes</div>
              <DataTable
                columns={ISSUE_COLS}
                data={report.comparison.issueDeltas}
                rowKey={(d) => d.issueCode}
              />
            </div>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            report {report.reportId} · generated {new Date(report.createdAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
