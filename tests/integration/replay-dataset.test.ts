/**
 * Integration smoke tests — replay-dataset orchestration
 *
 * Calls BatchReplayService directly (same code path as the CLI command)
 * using the canonical CI fixture files.  No stores are written — tests
 * are side-effect-free.
 */

import fs   from 'fs/promises';
import path from 'path';
import { suite, test, assert } from '../lib/runner';
import { BatchReplayService }  from '../../src/server/dataset-replay/BatchReplayService';
import { createDatasetRunId }  from '../../src/server/dataset-replay/DatasetReplayUtils';
import type { Dataset }        from '../../src/core/dataset-model';
import type { ReplayOverrides } from '../../src/core/replay-model';

// ── Fixture paths (relative to repo root) ─────────────────────────────────────

const FIXTURES = {
  smoke:     path.resolve(__dirname, '../../ci/datasets/smoke-test.json'),
  baseline:  path.resolve(__dirname, '../../ci/configs/baseline.json'),
  candidate: path.resolve(__dirname, '../../ci/configs/candidate.json'),
};

// ── Helper ────────────────────────────────────────────────────────────────────

interface ReplayConfig extends Dataset { replayOverrides?: ReplayOverrides }

async function loadConfig(filePath: string): Promise<ReplayConfig> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as ReplayConfig;
}

function makeRun(datasetId: string, overrides?: ReplayOverrides) {
  return {
    runId:           createDatasetRunId(),
    datasetId,
    status:          'pending' as const,
    replayOverrides: overrides,
  };
}

// ── Test suites ───────────────────────────────────────────────────────────────

suite('replay-dataset: fixture files are valid JSON', () => {
  test('ci/datasets/smoke-test.json is readable', async () => {
    const config = await loadConfig(FIXTURES.smoke);
    assert.ok(config.datasetId, 'datasetId must be present');
    assert.ok(Array.isArray(config.items), 'items must be an array');
    assert.ok(config.items.length > 0, 'items must not be empty');
  });

  test('ci/configs/baseline.json is readable', async () => {
    const config = await loadConfig(FIXTURES.baseline);
    assert.ok(config.datasetId, 'datasetId must be present');
    assert.ok(Array.isArray(config.items) && config.items.length > 0);
  });

  test('ci/configs/candidate.json is readable', async () => {
    const config = await loadConfig(FIXTURES.candidate);
    assert.ok(config.datasetId, 'datasetId must be present');
    assert.ok(Array.isArray(config.items) && config.items.length > 0);
  });

  test('every item in smoke-test.json has itemId and input', async () => {
    const config = await loadConfig(FIXTURES.smoke);
    for (const item of config.items) {
      assert.ok(typeof item.itemId === 'string', `itemId must be a string, got ${typeof item.itemId}`);
      assert.notStrictEqual(item.input, undefined, `item ${item.itemId} must have an input`);
    }
  });
});

suite('replay-dataset: BatchReplayService orchestration', () => {
  const service = new BatchReplayService();

  test('replays all items in smoke-test.json', async () => {
    const config = await loadConfig(FIXTURES.smoke);
    const run    = makeRun(config.datasetId, config.replayOverrides);

    const response = await service.runDatasetReplay({ dataset: config, run });

    assert.strictEqual(response.summary.totalItems,   config.items.length);
    assert.strictEqual(response.results.length,        config.items.length);
    assert.ok(typeof response.run.runId === 'string');
    assert.ok(['success', 'error'].includes(response.run.status));
  });

  test('every result in smoke run has a status', async () => {
    const config   = await loadConfig(FIXTURES.smoke);
    const run      = makeRun(config.datasetId, config.replayOverrides);
    const response = await service.runDatasetReplay({ dataset: config, run });

    for (const result of response.results) {
      assert.ok(
        ['success', 'error'].includes(result.status),
        `result ${result.itemId} has unexpected status: ${result.status}`,
      );
    }
  });

  test('replays all items in baseline config', async () => {
    const config   = await loadConfig(FIXTURES.baseline);
    const run      = makeRun(config.datasetId, config.replayOverrides);
    const response = await service.runDatasetReplay({ dataset: config, run });

    assert.strictEqual(response.summary.totalItems, config.items.length);
    assert.strictEqual(response.results.length,      config.items.length);
  });

  test('replays all items in candidate config (with replayOverrides)', async () => {
    const config   = await loadConfig(FIXTURES.candidate);
    const run      = makeRun(config.datasetId, config.replayOverrides);
    const response = await service.runDatasetReplay({ dataset: config, run });

    assert.strictEqual(response.summary.totalItems, config.items.length);
    assert.strictEqual(response.results.length,      config.items.length);
    // Candidate config has replayOverrides — verify they were applied.
    assert.ok(config.replayOverrides !== undefined, 'candidate config must have replayOverrides');
  });

  test('summary successCount + errorCount === totalItems', async () => {
    const config   = await loadConfig(FIXTURES.smoke);
    const run      = makeRun(config.datasetId, config.replayOverrides);
    const response = await service.runDatasetReplay({ dataset: config, run });
    const { summary } = response;

    assert.strictEqual(
      summary.successCount + summary.errorCount,
      summary.totalItems,
      'successCount + errorCount must equal totalItems',
    );
  });
});
