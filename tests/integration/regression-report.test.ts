/**
 * Integration smoke tests — generate-regression-report orchestration
 *
 * Runs the full replay → evaluate → regression-report pipeline using both
 * CI fixture configs (baseline and candidate).  No stores are written.
 */

import fs   from 'fs/promises';
import path from 'path';
import { suite, test, assert }    from '../lib/runner';
import { BatchReplayService }     from '../../src/server/dataset-replay/BatchReplayService';
import { BatchEvaluationService } from '../../src/server/batch-evaluation/BatchEvaluationService';
import { RegressionReportService } from '../../src/server/regression-report/RegressionReportService';
import { createDatasetRunId }     from '../../src/server/dataset-replay/DatasetReplayUtils';
import type { Dataset }           from '../../src/core/dataset-model';
import type { ReplayOverrides }   from '../../src/core/replay-model';
import type { BatchEvaluationResponse } from '../../src/server/batch-evaluation/BatchEvaluationTypes';

// ── Fixture paths ─────────────────────────────────────────────────────────────

const BASELINE_CONFIG  = path.resolve(__dirname, '../../ci/configs/baseline.json');
const CANDIDATE_CONFIG = path.resolve(__dirname, '../../ci/configs/candidate.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ReplayConfig extends Dataset { replayOverrides?: ReplayOverrides }

async function buildEvaluation(configPath: string): Promise<BatchEvaluationResponse> {
  const raw    = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(raw) as ReplayConfig;
  const run    = {
    runId:           createDatasetRunId(),
    datasetId:       config.datasetId,
    status:          'pending' as const,
    replayOverrides: config.replayOverrides,
  };
  const batchRun = await new BatchReplayService().runDatasetReplay({ dataset: config, run });
  return new BatchEvaluationService().evaluateDatasetRun({
    runId:   batchRun.run.runId,
    results: batchRun.results,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

suite('regression-report: RegressionReportService orchestration', () => {
  const reportService = new RegressionReportService();

  test('generates a report from baseline and candidate evaluations', async () => {
    const [baselineEval, candidateEval] = await Promise.all([
      buildEvaluation(BASELINE_CONFIG),
      buildEvaluation(CANDIDATE_CONFIG),
    ]);

    const report = reportService.generateReport({
      baselineRunId:  baselineEval.runId,
      candidateRunId: candidateEval.runId,
      baseline:       baselineEval,
      candidate:      candidateEval,
    });

    assert.strictEqual(typeof report.reportId,      'string');
    assert.strictEqual(typeof report.createdAt,     'string');
    assert.strictEqual(report.baselineRunId,        baselineEval.runId);
    assert.strictEqual(report.candidateRunId,       candidateEval.runId);
  });

  test('report comparison has metricDeltas array', async () => {
    const [baselineEval, candidateEval] = await Promise.all([
      buildEvaluation(BASELINE_CONFIG),
      buildEvaluation(CANDIDATE_CONFIG),
    ]);

    const report = reportService.generateReport({
      baselineRunId:  baselineEval.runId,
      candidateRunId: candidateEval.runId,
      baseline:       baselineEval,
      candidate:      candidateEval,
    });

    assert.ok(Array.isArray(report.comparison.metricDeltas));
    assert.ok(report.comparison.metricDeltas.length > 0, 'must have at least one metric delta');
  });

  test('each metricDelta has required fields', async () => {
    const [baselineEval, candidateEval] = await Promise.all([
      buildEvaluation(BASELINE_CONFIG),
      buildEvaluation(CANDIDATE_CONFIG),
    ]);

    const report = reportService.generateReport({
      baselineRunId:  baselineEval.runId,
      candidateRunId: candidateEval.runId,
      baseline:       baselineEval,
      candidate:      candidateEval,
    });

    for (const delta of report.comparison.metricDeltas) {
      assert.strictEqual(typeof delta.metric, 'string', 'metric must be a string');
      assert.ok(
        ['improved', 'regressed', 'unchanged'].includes(delta.status),
        `status "${delta.status}" is not a valid RegressionStatus`,
      );
    }
  });

  test('report includes a human-readable summary string', async () => {
    const [baselineEval, candidateEval] = await Promise.all([
      buildEvaluation(BASELINE_CONFIG),
      buildEvaluation(CANDIDATE_CONFIG),
    ]);

    const report = reportService.generateReport({
      baselineRunId:  baselineEval.runId,
      candidateRunId: candidateEval.runId,
      baseline:       baselineEval,
      candidate:      candidateEval,
    });

    assert.ok(
      typeof report.summary === 'string' && report.summary.length > 0,
      'report.summary must be a non-empty string',
    );
  });

  test('issueDeltas is an array (may be empty)', async () => {
    const [baselineEval, candidateEval] = await Promise.all([
      buildEvaluation(BASELINE_CONFIG),
      buildEvaluation(CANDIDATE_CONFIG),
    ]);

    const report = reportService.generateReport({
      baselineRunId:  baselineEval.runId,
      candidateRunId: candidateEval.runId,
      baseline:       baselineEval,
      candidate:      candidateEval,
    });

    assert.ok(Array.isArray(report.comparison.issueDeltas));
  });

  test('smoke CI path: baseline and candidate items produce matching item counts', async () => {
    const [baselineEval, candidateEval] = await Promise.all([
      buildEvaluation(BASELINE_CONFIG),
      buildEvaluation(CANDIDATE_CONFIG),
    ]);

    // Both configs have 5 items — verify evaluations completed for all.
    assert.strictEqual(baselineEval.summary.totalItems,  5);
    assert.strictEqual(candidateEval.summary.totalItems, 5);
  });
});
