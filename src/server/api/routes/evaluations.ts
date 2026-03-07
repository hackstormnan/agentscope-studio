import { Router, Request, Response, RequestHandler } from 'express';
import { FileTraceStore } from '../../storage';
import { FileEvaluationStore } from '../../evaluation-store';
import { EvaluationService } from '../../evaluation';
import type { EvaluationTarget } from '../../../core/evaluation-model';

// ── Module-level singletons ─────────────────────────────────────────────────
// File-based stores are safe to instantiate at module load; the filesystem
// is the shared source of truth.

const _traceStore  = new FileTraceStore();
const _evalStore   = new FileEvaluationStore();
const _evalService = new EvaluationService(_traceStore);

// ── Router ──────────────────────────────────────────────────────────────────

const evaluationsRouter = Router();

// GET /api/evaluations/ping
evaluationsRouter.get('/ping', (_req: Request, res: Response): void => {
  res.json({ ok: true, message: 'evaluations route is mounted' });
});

// ---------------------------------------------------------------------------
// GET /api/evaluations — list evaluations (optional filters)
// Query params: traceId, stepId, limit
// ---------------------------------------------------------------------------
evaluationsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const traceId = (req.query['traceId'] as string | undefined) || undefined;
  const stepId  = (req.query['stepId']  as string | undefined) || undefined;
  const limit   = parsePositiveInt(req.query['limit'] as string | undefined, 50);

  try {
    const results = await _evalStore.listEvaluations({ traceId, stepId, limit });
    res.json(results);
  } catch (err) {
    console.error('[GET /api/evaluations]', err);
    res.status(500).json({ error: 'Failed to list evaluations.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/evaluations — run evaluation, persist, return result
// ---------------------------------------------------------------------------
evaluationsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const body: unknown = req.body;

  if (!isEvaluationTarget(body)) {
    res.status(400).json({
      error: 'Invalid request: traceId (string) and targetType ("trace" | "step") are required. ' +
             'When targetType is "step", stepId (string) is also required.',
    });
    return;
  }

  try {
    const result = await _evalService.evaluate(body);
    await _evalStore.saveEvaluation(result);
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/evaluations]', err);
    res.status(500).json({ error: 'Failed to run evaluation.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/evaluations/:evaluationId — retrieve a stored evaluation
// ---------------------------------------------------------------------------
evaluationsRouter.get('/:evaluationId', async (req: Request, res: Response): Promise<void> => {
  const { evaluationId } = req.params;

  try {
    const result = await _evalStore.getEvaluation(evaluationId);
    if (!result) {
      res.status(404).json({ error: `Evaluation not found: ${evaluationId}` });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error(`[GET /api/evaluations/${evaluationId}]`, err);
    res.status(500).json({ error: 'Failed to retrieve evaluation.' });
  }
});

export { evaluationsRouter };

// ── Sub-route handlers for the traces router ────────────────────────────────

/** GET /api/traces/:traceId/evaluations */
export const traceEvaluationsHandler: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { traceId } = req.params;
  const limit = parsePositiveInt(req.query['limit'] as string | undefined, 50);

  try {
    const results = await _evalStore.listEvaluations({ traceId, limit });
    res.json(results);
  } catch (err) {
    console.error(`[GET /api/traces/${traceId}/evaluations]`, err);
    res.status(500).json({ error: 'Failed to list evaluations for trace.' });
  }
};

/** GET /api/traces/:traceId/steps/:stepId/evaluations */
export const stepEvaluationsHandler: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { traceId, stepId } = req.params;
  const limit = parsePositiveInt(req.query['limit'] as string | undefined, 50);

  try {
    const results = await _evalStore.listEvaluations({ traceId, stepId, limit });
    res.json(results);
  } catch (err) {
    console.error(`[GET /api/traces/${traceId}/steps/${stepId}/evaluations]`, err);
    res.status(500).json({ error: 'Failed to list evaluations for step.' });
  }
};

// ── Validation helpers ──────────────────────────────────────────────────────

function isEvaluationTarget(value: unknown): value is EvaluationTarget {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v['traceId'] !== 'string') return false;
  if (v['targetType'] !== 'trace' && v['targetType'] !== 'step') return false;
  if (v['targetType'] === 'step' && typeof v['stepId'] !== 'string') return false;
  return true;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
