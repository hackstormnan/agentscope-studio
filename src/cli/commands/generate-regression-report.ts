import { BatchEvaluationStore }      from '../../server/batch-evaluation/BatchEvaluationStore';
import { RegressionReportService }   from '../../server/regression-report/RegressionReportService';
import { RegressionReportStore }     from '../../server/regression-report/RegressionReportStore';
import type { RegressionMetricDelta } from '../../core/regression-model';
import {
  printSection, printKV, printWarn, printError, printOk,
  fmtDelta, fmtPctDelta,
} from '../utils/output';

// ── Regression thresholds ─────────────────────────────────────────────────────
//
// Keys match metric names produced by RegressionReportService.
// Values are the minimum allowed percentageDelta (negative = decrease allowed).
// Exceeding a threshold causes a non-zero exit code.

const THRESHOLDS: Record<string, number> = {
  evaluationScore: -5,   // score may not drop more than 5 %
  successRate:     -3,   // success rate may not drop more than 3 %
};

// ── Formatting helpers ────────────────────────────────────────────────────────

function metricLabel(metric: string): string {
  const labels: Record<string, string> = {
    evaluationScore:   'Score Delta',
    successRate:       'Success Rate Delta',
    issueCount:        'Issue Count Delta',
    errorIssueCount:   'Error Issues Delta',
    warningIssueCount: 'Warning Issues Delta',
    averageLatency:    'Latency Delta',
    estimatedCost:     'Cost Delta',
  };
  return labels[metric] ?? metric;
}

function formatDeltaLine(delta: RegressionMetricDelta): string {
  // For score-like metrics show absolute delta; for everything else prefer %.
  const absMetrics = ['evaluationScore'];
  if (absMetrics.includes(delta.metric)) {
    const abs = fmtDelta(delta.absoluteDelta, 3);
    const pct = delta.percentageDelta !== undefined
      ? ` (${fmtPctDelta(delta.percentageDelta)})`
      : '';
    return `${abs}${pct}`;
  }
  // Percentage delta for all other metrics; absolute value in parentheses.
  const pct = fmtPctDelta(delta.percentageDelta);
  const abs = delta.absoluteDelta !== undefined
    ? ` (abs ${fmtDelta(delta.absoluteDelta, 2)})`
    : '';
  return `${pct}${abs}`;
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function generateRegressionReportCommand(
  flags: Record<string, string>,
): Promise<void> {
  const baselineRunId  = flags['baseline'];
  const candidateRunId = flags['candidate'];

  if (!baselineRunId || !candidateRunId) {
    printError('--baseline <runId> and --candidate <runId> are both required');
    process.exit(1);
  }

  // ── Load both evaluations ─────────────────────────────────────────────────

  const evalStore = new BatchEvaluationStore();

  const [baseline, candidate] = await Promise.all([
    evalStore.get(baselineRunId),
    evalStore.get(candidateRunId),
  ]).catch((err: unknown) => {
    printError(`Failed to load evaluations: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });

  if (!baseline) {
    printError(`No evaluation found for baseline run: ${baselineRunId}`);
    process.exit(1);
  }
  if (!candidate) {
    printError(`No evaluation found for candidate run: ${candidateRunId}`);
    process.exit(1);
  }

  // ── Generate report ───────────────────────────────────────────────────────

  const reportService = new RegressionReportService();
  const reportStore   = new RegressionReportStore();

  const report = reportService.generateReport({
    baselineRunId,
    candidateRunId,
    baseline,
    candidate,
  });

  await reportStore.save(report).catch((err: unknown) => {
    printError(`Failed to persist report: ${err instanceof Error ? err.message : String(err)}`);
  });

  // ── Output ────────────────────────────────────────────────────────────────

  printSection('Regression Report');
  printKV('Report ID',  report.reportId);
  printKV('Baseline',   baselineRunId);
  printKV('Candidate',  candidateRunId);
  if (report.summary) {
    console.log(`\n  ${report.summary}`);
  }

  console.log('');

  for (const delta of report.comparison.metricDeltas) {
    printKV(metricLabel(delta.metric), formatDeltaLine(delta));
  }

  // ── Threshold checks ──────────────────────────────────────────────────────

  const violations: string[] = [];

  for (const delta of report.comparison.metricDeltas) {
    const threshold = THRESHOLDS[delta.metric];
    if (threshold === undefined) continue;

    if (
      delta.percentageDelta !== undefined &&
      delta.percentageDelta < threshold
    ) {
      violations.push(
        `${metricLabel(delta.metric)}: ${fmtPctDelta(delta.percentageDelta)} ` +
        `(threshold: ${threshold}%)`,
      );
    }
  }

  if (violations.length > 0) {
    console.log('');
    printWarn('Regression threshold exceeded:');
    for (const v of violations) {
      console.warn(`     ${v}`);
    }
    // Exit 1 → signals failure to CI.
    process.exit(1);
  }

  const improved  = report.comparison.metricDeltas.filter((d) => d.status === 'improved').length;
  const regressed = report.comparison.metricDeltas.filter((d) => d.status === 'regressed').length;
  printOk(
    `Regression check passed — ${improved} improved, ${regressed} regressed, ` +
    `0 threshold violations`,
  );
}
