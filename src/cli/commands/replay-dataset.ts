import fs   from 'fs/promises';
import path from 'path';
import type { Dataset }           from '../../core/dataset-model';
import type { ReplayOverrides }   from '../../core/replay-model';
import { BatchReplayService }     from '../../server/dataset-replay/BatchReplayService';
import { DatasetReplayStore }     from '../../server/dataset-replay/DatasetReplayStore';
import { createDatasetRunId }     from '../../server/dataset-replay/DatasetReplayUtils';
import { printSection, printKV, printError, fmtPct } from '../utils/output';

/**
 * Schema for the --config JSON file.
 *
 * The file must be a valid Dataset object.  Optionally it may include a
 * top-level `replayOverrides` key that is applied to every item in the run.
 *
 * Example config.json:
 *   {
 *     "datasetId": "ds-smoke-v1",
 *     "name": "Smoke test v1",
 *     "items": [
 *       { "itemId": "i1", "input": { "prompt": "Summarise in one sentence." } }
 *     ],
 *     "replayOverrides": { "overridePrompt": "Be concise." }
 *   }
 */
interface ReplayConfig extends Dataset {
  replayOverrides?: ReplayOverrides;
}

export async function replayDatasetCommand(flags: Record<string, string>): Promise<void> {
  const configPath   = flags['config'];
  const datasetIdArg = flags['dataset'];
  const experimentId = flags['experiment'];

  if (!configPath) {
    printError('--config <path> is required');
    process.exit(1);
  }

  // ── Load config ────────────────────────────────────────────────────────────
  //
  // Resolve relative paths from process.cwd() so the error message always
  // shows the absolute path that Node actually tried to open — critical for
  // debugging CI failures where the working directory is not obvious.

  const resolvedConfig = path.resolve(process.cwd(), configPath);

  let config: ReplayConfig;
  try {
    const raw = await fs.readFile(resolvedConfig, 'utf-8');
    config = JSON.parse(raw) as ReplayConfig;
  } catch (err) {
    printError(`Cannot read config file: ${configPath}`);
    printError(`Resolved path: ${resolvedConfig}`);
    if (err instanceof Error) printError(`Reason: ${err.message}`);
    process.exit(1);
  }

  // CLI flag --dataset overrides the datasetId in the config file.
  const dataset: Dataset = {
    datasetId:   datasetIdArg ?? config.datasetId,
    name:        config.name,
    description: config.description,
    items:       config.items,
    metadata:    config.metadata,
  };

  const run = {
    runId:           createDatasetRunId(),
    datasetId:       dataset.datasetId,
    status:          'pending' as const,
    replayOverrides: config.replayOverrides,
  };

  // ── Execute ────────────────────────────────────────────────────────────────

  const service = new BatchReplayService();
  const store   = new DatasetReplayStore();

  let response;
  try {
    response = await service.runDatasetReplay({ dataset, run });
  } catch (err) {
    printError(`Batch replay failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  await store.saveRun(response).catch((err: unknown) => {
    printError(`Failed to persist run: ${err instanceof Error ? err.message : String(err)}`);
  });

  // ── Output ─────────────────────────────────────────────────────────────────

  const { summary } = response;
  const successRate  = summary.successCount / summary.totalItems;

  printSection('Dataset Run Completed');
  if (experimentId) printKV('Experiment', experimentId);
  printKV('Dataset ID',  summary.datasetId);
  printKV('Run ID',      summary.runId);
  printKV('Items',       summary.totalItems);
  printKV('Succeeded',   summary.successCount);
  printKV('Errors',      summary.errorCount);
  printKV('Success Rate', fmtPct(successRate));
  printKV('Status',      response.run.status);

  // Emit machine-readable marker last so CI scripts can grep for it.
  console.log(`\nrunId=${summary.runId}`);
}
