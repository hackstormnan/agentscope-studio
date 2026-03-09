import { Router, Request, Response } from 'express';
import type { Dataset, DatasetRun } from '../../../core/dataset-model';
import { BatchReplayService }     from '../../dataset-replay/BatchReplayService';
import { DatasetReplayStore }     from '../../dataset-replay/DatasetReplayStore';
import { createDatasetRunId }     from '../../dataset-replay/DatasetReplayUtils';
import { BatchEvaluationService } from '../../batch-evaluation/BatchEvaluationService';
import { BatchEvaluationStore }   from '../../batch-evaluation/BatchEvaluationStore';

const replayService = new BatchReplayService();
const replayStore   = new DatasetReplayStore();
const evalService   = new BatchEvaluationService();
const evalStore     = new BatchEvaluationStore();

export const datasetsRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/datasets/runs
//
// Accepts { dataset, run } — where `run` may omit runId/status (we fill them).
// Executes the batch replay, persists the response, and returns it.
//
// curl example:
//   curl -X POST http://localhost:4000/api/datasets/runs \
//     -H "Content-Type: application/json" \
//     -d '{
//       "dataset": {
//         "datasetId": "ds-1",
//         "name": "Smoke test",
//         "items": [
//           { "itemId": "i1", "input": { "prompt": "Hello?" } },
//           { "itemId": "i2", "input": { "prompt": "What is 2+2?" } }
//         ]
//       },
//       "run": { "datasetId": "ds-1" }
//     }'
// ---------------------------------------------------------------------------
datasetsRouter.post('/runs', async (req: Request, res: Response): Promise<void> => {
  const body: unknown = req.body;

  if (!isRunRequest(body)) {
    res.status(400).json({
      error: 'Invalid request: body must contain a "dataset" object with "datasetId" and "items", and a "run" object with "datasetId".',
    });
    return;
  }

  // Fill in server-assigned fields so callers don't have to.
  const run: DatasetRun = {
    runId:           createDatasetRunId(),
    datasetId:       body.dataset.datasetId,
    replayOverrides: body.run.replayOverrides,
    status:          'pending',
  };

  try {
    const response = await replayService.runDatasetReplay({ dataset: body.dataset, run });
    await replayStore.saveRun(response).catch((err) =>
      console.error('[POST /api/datasets/runs] persist failed:', err),
    );
    res.status(201).json(response);
  } catch (err) {
    console.error('[POST /api/datasets/runs]', err);
    res.status(500).json({ error: 'Batch replay execution failed.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/datasets/runs/:runId/evaluate
//
// Loads the stored dataset run, runs BatchEvaluationService over its results,
// persists the evaluation report, and returns it.
// ---------------------------------------------------------------------------
datasetsRouter.post('/runs/:runId/evaluate', async (req: Request, res: Response): Promise<void> => {
  const { runId } = req.params;

  try {
    const batchRun = await replayStore.getRun(runId);
    if (!batchRun) {
      res.status(404).json({ error: `Dataset run not found: ${runId}` });
      return;
    }

    const evalResponse = await evalService.evaluateDatasetRun({
      runId,
      results: batchRun.results,
    });

    await evalStore.save(evalResponse).catch((err) =>
      console.error(`[POST /api/datasets/runs/${runId}/evaluate] persist failed:`, err),
    );

    res.json(evalResponse);
  } catch (err) {
    console.error(`[POST /api/datasets/runs/${runId}/evaluate]`, err);
    res.status(500).json({ error: 'Batch evaluation failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/datasets/runs/:runId/evaluations
//
// Returns the stored BatchEvaluationResponse for a run, or 404 if it has
// not been evaluated yet.
// ---------------------------------------------------------------------------
datasetsRouter.get('/runs/:runId/evaluations', async (req: Request, res: Response): Promise<void> => {
  const { runId } = req.params;

  try {
    const stored = await evalStore.get(runId);
    if (!stored) {
      res.status(404).json({ error: `No evaluations found for run: ${runId}` });
      return;
    }
    res.json(stored);
  } catch (err) {
    console.error(`[GET /api/datasets/runs/${runId}/evaluations]`, err);
    res.status(500).json({ error: 'Failed to retrieve evaluations.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/datasets/runs/:runId
// ---------------------------------------------------------------------------
datasetsRouter.get('/runs/:runId', async (req: Request, res: Response): Promise<void> => {
  const { runId } = req.params;

  try {
    const response = await replayStore.getRun(runId);
    if (!response) {
      res.status(404).json({ error: `Batch run not found: ${runId}` });
      return;
    }
    res.json(response);
  } catch (err) {
    console.error(`[GET /api/datasets/runs/${runId}]`, err);
    res.status(500).json({ error: 'Failed to retrieve batch run.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/datasets/runs  — list run summaries
// ---------------------------------------------------------------------------
datasetsRouter.get('/runs', async (_req: Request, res: Response): Promise<void> => {
  try {
    const summaries = await replayStore.listRuns();
    res.json({ items: summaries });
  } catch (err) {
    console.error('[GET /api/datasets/runs]', err);
    res.status(500).json({ error: 'Failed to list batch runs.' });
  }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface RunRequest {
  dataset: Dataset;
  run:     Partial<DatasetRun>;
}

function isRunRequest(value: unknown): value is RunRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  const dataset = v['dataset'];
  if (
    typeof dataset !== 'object' ||
    dataset === null ||
    typeof (dataset as Record<string, unknown>)['datasetId'] !== 'string' ||
    !Array.isArray((dataset as Record<string, unknown>)['items'])
  ) return false;

  const run = v['run'];
  if (typeof run !== 'object' || run === null) return false;

  return true;
}
