import { Router, Request, Response } from 'express';
import { FileTraceStore } from '../../storage';
import { FileReplayStore } from '../../replay-store';
import { ReplayService } from '../../replay';
import type { ReplayStore } from '../../replay-store';
import type { ReplayRequest } from '../../../core/replay-model';

// ---------------------------------------------------------------------------
// Deps — instantiated here so the router can be a static named export.
// FileTraceStore and FileReplayStore are file-based; multiple instances
// pointing at the same data dir are safe because the filesystem is the
// single source of truth.
// ---------------------------------------------------------------------------
const _store         = new FileTraceStore();
const _replayStore   = new FileReplayStore();
const _replayService = new ReplayService(_store);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const replaysRouter = Router();

// GET /api/replays/ping — verify the router is mounted and reachable
replaysRouter.get('/ping', (_req: Request, res: Response): void => {
  res.json({ ok: true, message: 'replays route is mounted' });
});

// ---------------------------------------------------------------------------
// POST /api/replays — run a replay, persist and return the result
// ---------------------------------------------------------------------------
replaysRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const body: unknown = req.body;

  if (!isReplayRequest(body)) {
    res.status(400).json({
      error: 'Invalid request: traceId (string) and targetStepId (string) are required.',
    });
    return;
  }

  try {
    const result = await _replayService.runReplay(body);
    await _replayStore.saveReplay(result);
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/replays]', err);
    res.status(500).json({ error: 'Failed to run replay.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/replays/:replayId — retrieve a stored replay by ID
// ---------------------------------------------------------------------------
replaysRouter.get('/:replayId', async (req: Request, res: Response): Promise<void> => {
  const { replayId } = req.params;

  try {
    const result = await _replayStore.getReplay(replayId);
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

export { replaysRouter };

// ---------------------------------------------------------------------------
// Standalone handler for GET /api/traces/:traceId/replays
// Kept as a factory so traces.ts can mount it on its own router.
// ---------------------------------------------------------------------------
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
