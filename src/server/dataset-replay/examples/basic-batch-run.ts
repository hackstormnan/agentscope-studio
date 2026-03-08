/**
 * basic-batch-run.ts
 *
 * Demonstrates BatchReplayService running a small dataset in-process.
 *
 * Usage:
 *   npx ts-node src/server/dataset-replay/examples/basic-batch-run.ts
 */

import type { Dataset, DatasetRun } from '../../../core/dataset-model';
import { BatchReplayService } from '../BatchReplayService';
import { createDatasetRunId } from '../DatasetReplayUtils';

// ── Sample dataset ───────────────────────────────────────────────────────────

const dataset: Dataset = {
  datasetId:   'ds-example-001',
  name:        'Basic smoke test',
  description: 'Three varied inputs to verify the batch pipeline end-to-end',
  items: [
    {
      itemId:         'item-1',
      input:          { prompt: 'What is the capital of France?' },
      expectedOutput: { answer: 'Paris' },
    },
    {
      itemId:         'item-2',
      input:          { prompt: 'Summarise the plot of Hamlet in one sentence.' },
      expectedOutput: { answer: 'A Danish prince avenges his murdered father.' },
    },
    {
      itemId:  'item-3',
      input:   'plain string input — no prompt key',
      // no expectedOutput — optional field
    },
  ],
};

// ── Run 1: no overrides ──────────────────────────────────────────────────────

const run1: DatasetRun = {
  runId:     createDatasetRunId(),
  datasetId: dataset.datasetId,
  status:    'pending',
};

// ── Run 2: with overrides ────────────────────────────────────────────────────

const run2: DatasetRun = {
  runId:     createDatasetRunId(),
  datasetId: dataset.datasetId,
  replayOverrides: {
    overridePrompt: 'Answer in Spanish.',
    overrideInput:  { language: 'es' },
  },
  status: 'pending',
};

// ── Execute ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const service = new BatchReplayService();

  for (const [label, run] of [['No overrides', run1], ['With overrides', run2]] as const) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Run: ${label}  (runId: ${run.runId})`);
    console.log('─'.repeat(60));

    const response = await service.runDatasetReplay({ dataset, run });

    const { summary, results } = response;
    console.log(`Status:        ${response.run.status}`);
    console.log(`Total items:   ${summary.totalItems}`);
    console.log(`Success:       ${summary.successCount}`);
    console.log(`Errors:        ${summary.errorCount}`);
    console.log(`Started at:    ${summary.startedAt}`);
    console.log(`Completed at:  ${summary.completedAt}`);

    console.log('\nPer-item results:');
    for (const r of results) {
      const replayedInput = (
        (r.replayResult?.producedStep as Record<string, unknown> | undefined)?.['replayedInput']
      );
      console.log(
        `  ${r.itemId}  status=${r.status}` +
        (replayedInput ? `  replayedInput=${JSON.stringify(replayedInput)}` : ''),
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
