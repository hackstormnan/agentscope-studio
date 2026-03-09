import type { BatchEvaluationResponse, BatchEvaluationSummary } from '../batch-evaluation/BatchEvaluationTypes';
import type {
  RegressionComparison,
  RegressionIssueDelta,
  RegressionMetricDelta,
  RegressionReport,
  RegressionStatus,
} from '../../core/regression-model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Polarity of a metric — drives the improved / regressed classification. */
type Polarity = 'higher-better' | 'lower-better';

/**
 * Classify a numeric delta for a metric given its polarity.
 *
 * Rules:
 *   higher-better: candidate > baseline → improved, candidate < baseline → regressed
 *   lower-better:  candidate < baseline → improved, candidate > baseline → regressed
 *   Equal or both absent → unchanged
 */
function classify(
  baseline:  number | undefined,
  candidate: number | undefined,
  polarity:  Polarity,
): RegressionStatus {
  if (baseline === undefined || candidate === undefined) return 'unchanged';
  if (candidate === baseline) return 'unchanged';
  const improving = polarity === 'higher-better' ? candidate > baseline : candidate < baseline;
  return improving ? 'improved' : 'regressed';
}

function metricDelta(
  metric:    string,
  baseline:  number | undefined,
  candidate: number | undefined,
  polarity:  Polarity,
): RegressionMetricDelta {
  const status = classify(baseline, candidate, polarity);
  const absoluteDelta =
    baseline !== undefined && candidate !== undefined
      ? candidate - baseline
      : undefined;
  const percentageDelta =
    absoluteDelta !== undefined && baseline !== undefined && baseline !== 0
      ? (absoluteDelta / Math.abs(baseline)) * 100
      : undefined;

  return { metric, baselineValue: baseline, candidateValue: candidate, absoluteDelta, percentageDelta, status };
}

function issueDeltaStatus(delta: number): RegressionStatus {
  if (delta < 0) return 'improved';
  if (delta > 0) return 'regressed';
  return 'unchanged';
}

// ── Service ───────────────────────────────────────────────────────────────────

export interface RegressionInput {
  baselineRunId:  string;
  candidateRunId: string;
  baseline:       BatchEvaluationResponse;
  candidate:      BatchEvaluationResponse;
  /** Optional latency from the experiment run summary (ms). */
  baselineLatency?:  number;
  candidateLatency?: number;
  /** Optional estimated cost from the experiment run summary ($). */
  baselineCost?:  number;
  candidateCost?: number;
}

export class RegressionReportService {
  generateReport(input: RegressionInput): RegressionReport {
    const { baselineRunId, candidateRunId, baseline, candidate } = input;
    const bs = baseline.summary;
    const cs = candidate.summary;

    // ── Metric deltas ─────────────────────────────────────────────────────────

    const metricDeltas: RegressionMetricDelta[] = [
      metricDelta('evaluationScore',   bs.averageScore,     cs.averageScore,     'higher-better'),
      metricDelta('successRate',       bs.successRate,      cs.successRate,      'higher-better'),
      metricDelta('issueCount',        bs.issueCount,       cs.issueCount,       'lower-better'),
      metricDelta('errorIssueCount',   bs.errorIssueCount,  cs.errorIssueCount,  'lower-better'),
      metricDelta('warningIssueCount', bs.warningIssueCount, cs.warningIssueCount, 'lower-better'),
    ];

    if (input.baselineLatency !== undefined || input.candidateLatency !== undefined) {
      metricDeltas.push(
        metricDelta('averageLatency', input.baselineLatency, input.candidateLatency, 'lower-better'),
      );
    }
    if (input.baselineCost !== undefined || input.candidateCost !== undefined) {
      metricDeltas.push(
        metricDelta('estimatedCost', input.baselineCost, input.candidateCost, 'lower-better'),
      );
    }

    // ── Issue code deltas ─────────────────────────────────────────────────────

    const baselineCodes  = countIssueCodes(baseline);
    const candidateCodes = countIssueCodes(candidate);

    const allCodes = new Set([...Object.keys(baselineCodes), ...Object.keys(candidateCodes)]);
    const issueDeltas: RegressionIssueDelta[] = Array.from(allCodes)
      .map((code) => {
        const b = baselineCodes[code]  ?? 0;
        const c = candidateCodes[code] ?? 0;
        const delta = c - b;
        return { issueCode: code, baselineCount: b, candidateCount: c, delta, status: issueDeltaStatus(delta) };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)); // most-changed first

    // ── Summary string ────────────────────────────────────────────────────────

    const improved  = metricDeltas.filter((d) => d.status === 'improved').length;
    const regressed = metricDeltas.filter((d) => d.status === 'regressed').length;
    const unchanged = metricDeltas.filter((d) => d.status === 'unchanged').length;

    let summary: string;
    if (regressed === 0 && improved === 0) {
      summary = `No changes detected across ${unchanged} metrics.`;
    } else if (regressed === 0) {
      summary = `All clear — ${improved} metric${improved !== 1 ? 's' : ''} improved, no regressions.`;
    } else if (improved === 0) {
      summary = `Regression detected: ${regressed} metric${regressed !== 1 ? 's' : ''} degraded.`;
    } else {
      summary = `${regressed} regression${regressed !== 1 ? 's' : ''}, ${improved} improvement${improved !== 1 ? 's' : ''} detected.`;
    }

    // Add issue-level callout if any code appeared for the first time.
    const newCodes = issueDeltas.filter((d) => d.baselineCount === 0 && d.candidateCount > 0);
    if (newCodes.length > 0) {
      summary += ` New issue code${newCodes.length !== 1 ? 's' : ''}: ${newCodes.map((d) => d.issueCode).join(', ')}.`;
    }

    // ── Assemble report ───────────────────────────────────────────────────────

    const comparison: RegressionComparison = {
      baselineRunId,
      candidateRunId,
      metricDeltas,
      issueDeltas,
    };

    return {
      reportId:       createReportId(),
      baselineRunId,
      candidateRunId,
      createdAt:      new Date().toISOString(),
      summary,
      comparison,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Count issue codes across all item evaluations in a batch response. */
function countIssueCodes(response: BatchEvaluationResponse): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of response.itemEvaluations) {
    for (const evaluation of item.evaluations) {
      for (const issue of evaluation.issues ?? []) {
        counts[issue.code] = (counts[issue.code] ?? 0) + 1;
      }
    }
  }
  return counts;
}
