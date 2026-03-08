import { Router, Request, Response } from 'express';
import { ExperimentStore } from '../../experiments/ExperimentStore';
import { DatasetReplayStore } from '../../dataset-replay/DatasetReplayStore';
import type { ExperimentRun, ExperimentRunSummary } from '../../../core/experiment-model';
import type { DatasetBatchRunResponse } from '../../dataset-replay/DatasetBatchTypes';

const expStore     = new ExperimentStore();
const datasetStore = new DatasetReplayStore();

export const experimentsRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/experiments
// Returns all experiments with a precomputed runCount.
// ---------------------------------------------------------------------------
experimentsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const experiments = await expStore.listExperiments();

    // Fetch run counts in parallel. Each reads only the run index (fast).
    const withCounts = await Promise.all(
      experiments.map(async (exp) => {
        const runs = await expStore.listExperimentRuns(exp.experimentId).catch(() => []);
        return { ...exp, runCount: runs.length };
      }),
    );

    res.json(withCounts);
  } catch (err) {
    console.error('[GET /api/experiments]', err);
    res.status(500).json({ error: 'Failed to list experiments.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/experiments/:experimentId
// Returns the experiment and all its runs with computed summaries.
// ---------------------------------------------------------------------------
experimentsRouter.get('/:experimentId', async (req: Request, res: Response): Promise<void> => {
  const { experimentId } = req.params;
  try {
    const experiment = await expStore.getExperiment(experimentId);
    if (!experiment) {
      res.status(404).json({ error: `Experiment not found: ${experimentId}` });
      return;
    }

    const runs = await expStore.listExperimentRuns(experimentId);
    const runsWithSummary = await Promise.all(
      runs.map(async (run) => ({
        run,
        summary: await computeSummary(run),
      })),
    );

    res.json({ experiment, runs: runsWithSummary });
  } catch (err) {
    console.error(`[GET /api/experiments/${experimentId}]`, err);
    res.status(500).json({ error: 'Failed to load experiment.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/experiments/:experimentId/runs/:runId
// ---------------------------------------------------------------------------
experimentsRouter.get(
  '/:experimentId/runs/:runId',
  async (req: Request, res: Response): Promise<void> => {
    const { runId } = req.params;
    try {
      const run = await expStore.getExperimentRun(runId);
      if (!run) {
        res.status(404).json({ error: `Run not found: ${runId}` });
        return;
      }
      const summary = await computeSummary(run);
      res.json({ run, summary });
    } catch (err) {
      console.error(`[GET /api/experiments/.../runs/${runId}]`, err);
      res.status(500).json({ error: 'Failed to load run.' });
    }
  },
);

// ---------------------------------------------------------------------------
// Summary computation
// Reads the linked DatasetBatchRunResponse and aggregates metrics.
// Fields that cannot be derived (averageLatency, estimatedCost) are only
// included when the ExperimentRun.config carries them explicitly; otherwise
// they remain undefined and the UI shows "—".
// ---------------------------------------------------------------------------
async function computeSummary(run: ExperimentRun): Promise<ExperimentRunSummary> {
  let batchResponse: DatasetBatchRunResponse | null = null;

  try {
    batchResponse = await datasetStore.getRun(run.datasetRunId);
  } catch {
    // dataset run file missing — fall back to zero-filled summary
  }

  if (!batchResponse) {
    return {
      runId:        run.runId,
      datasetSize:  0,
      successCount: 0,
      errorCount:   0,
    };
  }

  const { summary, results } = batchResponse;

  // Average evaluation score: mean over all items that have at least one scored result.
  const scoredItems = results.filter(
    (r) => r.evaluationResults && r.evaluationResults.some((e) => e.score !== undefined),
  );
  const evaluationScore =
    scoredItems.length > 0
      ? scoredItems.reduce((sum, r) => {
          const scores = r.evaluationResults!
            .filter((e) => e.score !== undefined)
            .map((e) => e.score as number);
          return sum + scores.reduce((a, b) => a + b, 0) / scores.length;
        }, 0) / scoredItems.length
      : undefined;

  return {
    runId:          run.runId,
    datasetSize:    summary.totalItems,
    successCount:   summary.successCount,
    errorCount:     summary.errorCount,
    evaluationScore,
    // averageLatency and estimatedCost are not available from synthetic
    // dataset runs; they would be populated by a real execution engine.
    averageLatency:  undefined,
    estimatedCost:   undefined,
  };
}
