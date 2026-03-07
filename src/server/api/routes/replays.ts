import { Router, Request, Response } from 'express';
import type { ReplayService } from '../../replay';
import type { ReplayStore } from '../../replay-store';
import type { ReplayRequest } from '../../../core/replay-model';

/**
 * Mounts replay endpoints onto a Router.
 *
 * curl examples:
 *
 *   # Run a replay (plain)
 *   curl -X POST http://localhost:4000/api/replays \
 *     -H "Content-Type: application/json" \
 *     -d '{"traceId":"trace_abc","targetStepId":"step_xyz"}'
 *
 *   # Run a replay with a prompt override
 *   curl -X POST http://localhost:4000/api/replays \
 *     -H "Content-Type: application/json" \
 *     -d '{"traceId":"trace_abc","targetStepId":"step_xyz","overrides":{"overridePrompt":"New prompt"},"metadata":{"requestedBy":"evaluator","reason":"prompt test"}}'
 *
 *   # Retrieve a stored replay
 *   curl http://localhost:4000/api/replays/replay_<uuid>
 *
 *   # List replays for a trace
 *   curl http://localhost:4000/api/traces/trace_abc/replays
 */
export function createReplayRoutes(
  replayService: ReplayService,
  replayStore:   ReplayStore,
): Router {
  const router = Router();

  // ---------------------------------------------------------------------------
  // POST /api/replays — run a replay, persist and return the result
  // ---------------------------------------------------------------------------
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body: unknown = req.body;

    if (!isReplayRequest(body)) {
      res.status(400).json({
        error: 'Invalid request: traceId (string) and targetStepId (string) are required.',
      });
      return;
    }

    try {
      const result = await replayService.runReplay(body);
      await replayStore.saveReplay(result);
      res.status(201).json(result);
    } catch (err) {
      console.error('[POST /api/replays]', err);
      res.status(500).json({ error: 'Failed to run replay.' });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /api/replays/:replayId — retrieve a stored replay by ID
  // ---------------------------------------------------------------------------
  router.get('/:replayId', async (req: Request, res: Response): Promise<void> => {
    const { replayId } = req.params;

    try {
      const result = await replayStore.getReplay(replayId);
      if (!result) {
        res.status(404).json({ error: `Replay not found: ${replayId}` });
        return;
      }
      res.json(result);
    } catch (err) {
      console.error(`[GET /api/replays/${replayId}]`, err);
      res.status(500).json({ error: 'Failed to retrieve replay.' });
    }
  });

  return router;
}

/**
 * Creates a handler for GET /api/traces/:traceId/replays.
 * Returned as a standalone function so it can be mounted on the traces router.
 */
export function createTraceReplaysHandler(replayStore: ReplayStore) {
  return async (req: Request, res: Response): Promise<void> => {
    const { traceId } = req.params;
    const limit = parsePositiveInt(req.query['limit'] as string | undefined, 50);

    try {
      const results = await replayStore.listReplays({ sourceTraceId: traceId, limit });
      res.json(results);
    } catch (err) {
      console.error(`[GET /api/traces/${traceId}/replays]`, err);
      res.status(500).json({ error: 'Failed to list replays for trace.' });
    }
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isReplayRequest(value: unknown): value is ReplayRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['traceId'] === 'string' && typeof v['targetStepId'] === 'string';
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
