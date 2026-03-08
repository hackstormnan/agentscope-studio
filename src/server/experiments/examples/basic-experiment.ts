/**
 * basic-experiment.ts
 *
 * Demonstrates creating an Experiment, attaching ExperimentRuns that reference
 * DatasetRun IDs, and listing the stored runs.
 *
 * Usage:
 *   npx ts-node src/server/experiments/examples/basic-experiment.ts
 *
 * Files written to: data/experiments/
 */

import { randomUUID } from 'crypto';
import type { Experiment, ExperimentRun } from '../../../core/experiment-model';
import { ExperimentStore } from '../ExperimentStore';

const store = new ExperimentStore();

async function main(): Promise<void> {
  // ── 1. Create experiment ───────────────────────────────────────────────────
  const experiment: Experiment = {
    experimentId: `exp_${randomUUID()}`,
    name:         'Prompt v1 vs v2 — capital cities',
    description:  'Compare error rate and latency between two prompt versions.',
    createdAt:    new Date().toISOString(),
    metadata:     { team: 'nlp', project: 'geo-qa' },
  };

  await store.createExperiment(experiment);
  console.log(`\nExperiment created: ${experiment.experimentId}`);
  console.log(`  name: ${experiment.name}`);

  // ── 2. Simulate two dataset runs (IDs that BatchReplayService would produce) ─
  const datasetRunIdV1 = `drun_${randomUUID()}`;  // would come from BatchReplayService
  const datasetRunIdV2 = `drun_${randomUUID()}`;

  // ── 3. Create experiment run A — prompt v1, no overrides ──────────────────
  const runA: ExperimentRun = {
    runId:        `exprun_${randomUUID()}`,
    experimentId: experiment.experimentId,
    datasetRunId: datasetRunIdV1,
    config: {
      promptVersion: 'v1',
      model:         'claude-haiku-4-5-20251001',
      temperature:   0.7,
    },
    status:      'success',
    startedAt:   new Date(Date.now() - 5000).toISOString(),
    completedAt: new Date().toISOString(),
  };

  await store.createExperimentRun(runA);
  console.log(`\nRun A created: ${runA.runId}`);
  console.log(`  config: ${JSON.stringify(runA.config)}`);
  console.log(`  datasetRunId: ${runA.datasetRunId}`);

  // ── 4. Create experiment run B — prompt v2 with overridePrompt ────────────
  const runB: ExperimentRun = {
    runId:        `exprun_${randomUUID()}`,
    experimentId: experiment.experimentId,
    datasetRunId: datasetRunIdV2,
    config: {
      promptVersion: 'v2',
      model:         'claude-haiku-4-5-20251001',
      temperature:   0.7,
      replayOverrides: {
        overridePrompt: 'Answer concisely in one word.',
      },
    },
    status:      'success',
    startedAt:   new Date(Date.now() - 3000).toISOString(),
    completedAt: new Date().toISOString(),
  };

  await store.createExperimentRun(runB);
  console.log(`\nRun B created: ${runB.runId}`);
  console.log(`  config: ${JSON.stringify(runB.config)}`);
  console.log(`  datasetRunId: ${runB.datasetRunId}`);

  // ── 5. List all runs for the experiment ────────────────────────────────────
  const runs = await store.listExperimentRuns(experiment.experimentId);
  console.log(`\n── Stored runs for experiment ${experiment.experimentId} ──`);
  for (const r of runs) {
    console.log(
      `  ${r.runId}  status=${r.status}  promptVersion=${r.config?.promptVersion ?? '—'}` +
      `  datasetRunId=${r.datasetRunId}`,
    );
  }

  // ── 6. Round-trip: retrieve experiment by ID ───────────────────────────────
  const retrieved = await store.getExperiment(experiment.experimentId);
  console.log(`\nRetrieved experiment: ${retrieved?.name ?? 'NOT FOUND'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
