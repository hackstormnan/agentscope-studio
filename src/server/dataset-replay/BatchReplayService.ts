import type { Dataset, DatasetRun, DatasetRunResult } from '../../core/dataset-model';
import type { DatasetBatchRunResponse, DatasetRunSummary } from './DatasetBatchTypes';
import { buildSyntheticReplayResult } from './DatasetReplayUtils';

/**
 * Executes a batch replay of every item in a Dataset.
 *
 * ── Synthetic replay strategy ────────────────────────────────────────────────
 * Dataset items carry free-form `input` values that are not anchored to any
 * existing trace or step in the trace store.  ReplayService.runReplay() is
 * therefore not usable here — it requires a real (traceId, targetStepId) pair.
 *
 * BatchReplayService instead calls buildSyntheticReplayResult() for each item,
 * which applies run.replayOverrides on top of item.input using the same merge
 * strategy as the real replay path (overridePrompt → prompt key, overrideInput
 * → full or object merge).  The resulting ReplayResult carries clearly prefixed
 * synthetic IDs so it is never confused with a real trace-store reference.
 *
 * ── Run status strategy ──────────────────────────────────────────────────────
 *   pending → running   when execute begins
 *   per item: success if no exception thrown during replay build
 *             error   if an unexpected exception is caught (item is never skipped)
 *   overall:  success  when errorCount === 0
 *             error    when errorCount > 0 (all items are still processed)
 *
 * The fail-soft guarantee means a single bad item never aborts the run.
 */
export class BatchReplayService {
  async runDatasetReplay(params: {
    dataset: Dataset;
    run:     DatasetRun;
  }): Promise<DatasetBatchRunResponse> {
    const { dataset, run } = params;

    // ── Transition: pending → running ──────────────────────────────────────────
    const startedAt = new Date().toISOString();
    const activeRun: DatasetRun = {
      ...run,
      status:    'running',
      startedAt,
    };

    // ── Process items sequentially (concurrency is a future concern) ────────────
    const results: DatasetRunResult[] = [];

    for (const item of dataset.items) {
      let itemResult: DatasetRunResult;

      try {
        const replayResult = buildSyntheticReplayResult(
          dataset.datasetId,
          item,
          run.replayOverrides,
        );

        // producedOutput is the replayedInput (what the agent would receive),
        // making it directly comparable to item.expectedOutput.
        const producedStep = replayResult.producedStep as Record<string, unknown>;
        const producedOutput: unknown = producedStep['replayedInput'];

        itemResult = {
          runId:          run.runId,
          itemId:         item.itemId,
          producedOutput,
          replayResult,
          evaluationResults: [], // populated by a future evaluation pass
          status:         'success',
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[BatchReplayService] item ${item.itemId} failed:`, message);

        itemResult = {
          runId:  run.runId,
          itemId: item.itemId,
          status: 'error',
        };
      }

      results.push(itemResult);
    }

    // ── Compute summary ────────────────────────────────────────────────────────
    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount   = results.filter((r) => r.status === 'error').length;
    const completedAt  = new Date().toISOString();

    // Overall run status: success iff every item succeeded.
    const overallStatus = errorCount === 0 ? 'success' : 'error';

    const finalRun: DatasetRun = {
      ...activeRun,
      status:      overallStatus,
      completedAt,
    };

    const summary: DatasetRunSummary = {
      runId:        run.runId,
      datasetId:    dataset.datasetId,
      totalItems:   dataset.items.length,
      successCount,
      errorCount,
      startedAt,
      completedAt,
    };

    return { run: finalRun, summary, results };
  }
}
