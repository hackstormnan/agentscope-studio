import { Router, Request, Response } from 'express';
import { BatchEvaluationStore }     from '../../batch-evaluation/BatchEvaluationStore';
import { RegressionReportService }  from '../../regression-report/RegressionReportService';
import { RegressionReportStore }    from '../../regression-report/RegressionReportStore';

const evalStore    = new BatchEvaluationStore();
const reportStore  = new RegressionReportStore();
const reportService = new RegressionReportService();

export const reportsRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/reports/regression
//
// Generates a regression report comparing two dataset runs by their
// batch evaluation results.
//
// Body:
//   {
//     "baselineRunId":   "...",   // dataset run ID
//     "candidateRunId":  "...",   // dataset run ID
//     // Optional supplemental metrics from the experiment run summary:
//     "baselineLatency":  1200,   // ms
//     "candidateLatency": 800,
//     "baselineCost":  0.0034,    // $
//     "candidateCost": 0.0021
//   }
// ---------------------------------------------------------------------------
reportsRouter.post('/regression', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    baselineRunId?:   string;
    candidateRunId?:  string;
    baselineLatency?: number;
    candidateLatency?: number;
    baselineCost?:    number;
    candidateCost?:   number;
  };

  if (!body.baselineRunId || !body.candidateRunId) {
    res.status(400).json({
      error: 'Request body must include "baselineRunId" and "candidateRunId".',
    });
    return;
  }

  const { baselineRunId, candidateRunId } = body;

  try {
    // Load both batch evaluations
    const [baseline, candidate] = await Promise.all([
      evalStore.get(baselineRunId),
      evalStore.get(candidateRunId),
    ]);

    if (!baseline) {
      res.status(404).json({ error: `No evaluation found for baselineRunId: ${baselineRunId}` });
      return;
    }
    if (!candidate) {
      res.status(404).json({ error: `No evaluation found for candidateRunId: ${candidateRunId}` });
      return;
    }

    const report = reportService.generateReport({
      baselineRunId,
      candidateRunId,
      baseline,
      candidate,
      baselineLatency:  body.baselineLatency,
      candidateLatency: body.candidateLatency,
      baselineCost:     body.baselineCost,
      candidateCost:    body.candidateCost,
    });

    await reportStore.save(report);
    res.status(201).json(report);
  } catch (err) {
    console.error('[POST /api/reports/regression]', err);
    res.status(500).json({ error: 'Regression report generation failed.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/:reportId
//
// Returns a previously generated report.
// ---------------------------------------------------------------------------
reportsRouter.get('/:reportId', async (req: Request, res: Response): Promise<void> => {
  const { reportId } = req.params;

  try {
    const report = await reportStore.get(reportId);
    if (!report) {
      res.status(404).json({ error: `Report not found: ${reportId}` });
      return;
    }
    res.json(report);
  } catch (err) {
    console.error('[GET /api/reports/:reportId]', err);
    res.status(500).json({ error: 'Failed to load report.' });
  }
});
