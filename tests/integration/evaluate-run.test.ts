/**
 * Integration smoke tests — evaluate-run orchestration
 *
 * Runs the full replay → evaluate pipeline using CI fixture files.
 * Services are called directly; nothing is persisted to disk.
 */

import fs   from 'fs/promises';
import path from 'path';
import { suite, test, assert }   from '../lib/runner';
import { BatchReplayService }    from '../../src/server/dataset-replay/BatchReplayService';
import { BatchEvaluationService } from '../../src/server/batch-evaluation/BatchEvaluationService';
import { createDatasetRunId }    from '../../src/server/dataset-replay/DatasetReplayUtils';
import type { Dataset }          from '../../src/core/dataset-model';
import type { ReplayOverrides }  from '../../src/core/replay-model';
import type { DatasetBatchRunResponse } from '../../src/server/dataset-replay/DatasetBatchTypes';

// ── Fixture paths ─────────────────────────────────────────────────────────────

const SMOKE_CONFIG = path.resolve(__dirname, '../../ci/datasets/smoke-test.json');

// ── Helper ────────────────────────────────────────────────────────────────────

interface ReplayConfig extends Dataset { replayOverrides?: ReplayOverrides }

async function replaySmoke(): Promise<DatasetBatchRunResponse> {
  const raw    = await fs.readFile(SMOKE_CONFIG, 'utf-8');
  const config = JSON.parse(raw) as ReplayConfig;
  const run    = {
    runId:           createDatasetRunId(),
    datasetId:       config.datasetId,
    status:          'pending' as const,
    replayOverrides: config.replayOverrides,
  };
  return new BatchReplayService().runDatasetReplay({ dataset: config, run });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

suite('evaluate-run: BatchEvaluationService orchestration', () => {
  const evalService = new BatchEvaluationService();

  test('produces an evaluation response for smoke run', async () => {
    const batchRun = await replaySmoke();
    const response = await evalService.evaluateDatasetRun({
      runId:   batchRun.run.runId,
      results: batchRun.results,
    });

    assert.strictEqual(typeof response.runId,       'string');
    assert.strictEqual(typeof response.evaluatedAt, 'string');
    assert.ok(Array.isArray(response.itemEvaluations));
  });

  test('itemEvaluations count matches totalItems', async () => {
    const batchRun = await replaySmoke();
    const response = await evalService.evaluateDatasetRun({
      runId:   batchRun.run.runId,
      results: batchRun.results,
    });

    assert.strictEqual(
      response.itemEvaluations.length,
      batchRun.results.length,
      'itemEvaluations must have one entry per result',
    );
  });

  test('summary has all required fields', async () => {
    const batchRun = await replaySmoke();
    const response = await evalService.evaluateDatasetRun({
      runId:   batchRun.run.runId,
      results: batchRun.results,
    });

    const { summary } = response;
    assert.strictEqual(typeof summary.runId,         'string');
    assert.strictEqual(typeof summary.totalItems,     'number');
    assert.strictEqual(typeof summary.evaluatedItems, 'number');
    assert.strictEqual(typeof summary.issueCount,     'number');
    assert.strictEqual(typeof summary.errorIssueCount,   'number');
    assert.strictEqual(typeof summary.warningIssueCount, 'number');
  });

  test('evaluatedItems <= totalItems', async () => {
    const batchRun = await replaySmoke();
    const response = await evalService.evaluateDatasetRun({
      runId:   batchRun.run.runId,
      results: batchRun.results,
    });

    assert.ok(
      response.summary.evaluatedItems <= response.summary.totalItems,
      'evaluatedItems must not exceed totalItems',
    );
  });

  test('each itemEvaluation has itemId and evaluations array', async () => {
    const batchRun = await replaySmoke();
    const response = await evalService.evaluateDatasetRun({
      runId:   batchRun.run.runId,
      results: batchRun.results,
    });

    for (const item of response.itemEvaluations) {
      assert.strictEqual(typeof item.itemId, 'string', 'itemId must be a string');
      assert.ok(Array.isArray(item.evaluations), 'evaluations must be an array');
    }
  });

  test('runId in response matches the run that was evaluated', async () => {
    const batchRun = await replaySmoke();
    const runId    = batchRun.run.runId;
    const response = await evalService.evaluateDatasetRun({ runId, results: batchRun.results });

    assert.strictEqual(response.runId,         runId);
    assert.strictEqual(response.summary.runId, runId);
  });
});
